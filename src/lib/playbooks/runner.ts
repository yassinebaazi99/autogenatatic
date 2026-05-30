import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildBrandContext } from "../brand/context";
import { CLAUDE_MODELS, getClaude } from "../claude";
import { db } from "../db";
import { paths } from "../paths";
import { uniqueSlug } from "../slug";
import { PlaybookDefinition as PlaybookDefinitionSchema } from "./schemas";
import { renderFailedSection, stitch } from "./stitchers";
import type {
  PlaybookDefinition,
  PlaybookPreset,
  PlaybookSection,
} from "./types";

/**
 * The playbook runner replaces the hardcoded M5 orchestrator. It reads a
 * Playbook from the DB, parses/validates its JSON definition, then runs one
 * Claude agent per section in parallel. The `section` + `systemPrompt` +
 * `directive` now come from playbook data instead of hardcoded TS files.
 */

export type RunGenerationInput = {
  productId: string;
  playbookId: string;
  presetId: string;
  intake: Record<string, string>;
  /** User-chosen section toggles. Sections marked `required: true` in the
   *  playbook are always on regardless of this. */
  enabledSectionIds?: string[];
};

export async function createGenerationRows(
  input: RunGenerationInput,
): Promise<{ landingPageId: string; slug: string }> {
  const product = await db.product.findUnique({
    where: { id: input.productId },
  });
  if (!product) throw new Error(`product ${input.productId} not found`);

  const playbookRow = await db.playbook.findUnique({
    where: { id: input.playbookId },
  });
  if (!playbookRow) throw new Error(`playbook ${input.playbookId} not found`);

  const playbook = parsePlaybook(playbookRow.definition);
  const preset = playbook.presets.find((p) => p.id === input.presetId);
  if (!preset) {
    throw new Error(
      `preset ${input.presetId} not found in playbook ${playbook.slug}`,
    );
  }

  const enabled = selectEnabledSections(
    playbook.sections,
    input.enabledSectionIds,
  );
  if (enabled.length === 0) {
    throw new Error("at least one section must be enabled");
  }

  const slug = uniqueSlug(product.name);
  const outputDir = `public/generated/${slug}`;

  const landingPage = await db.landingPage.create({
    data: {
      productId: product.id,
      playbookId: playbookRow.id,
      slug,
      title: product.name,
      outputDir,
      presetId: preset.id,
      intake: JSON.stringify(input.intake),
      theme: preset.name, // backward-compat display in older UI
      status: "running",
    },
  });

  // Create AgentRun rows in user-chosen section order. startedAt default
  // is `now()` — we create them sequentially so the ordering is stable.
  for (const section of enabled) {
    await db.agentRun.create({
      data: {
        landingPageId: landingPage.id,
        section: section.id,
        status: "pending",
      },
    });
  }

  return { landingPageId: landingPage.id, slug };
}

export async function runSwarm(landingPageId: string): Promise<void> {
  const context = await loadContext(landingPageId);
  if (!context) return;

  const { landingPage, playbook, preset, runs, product, intake } = context;

  // Resolve brand knowledge once for the whole swarm — every agent gets
  // the same block so their context is coherent.
  const brandContext = await buildBrandContext();

  const bySectionId = new Map(playbook.sections.map((s) => [s.id, s]));

  // Fire every agent in parallel. Each job handles its own errors so one
  // failure doesn't break the others.
  await Promise.all(
    runs.map((run) => {
      const section = bySectionId.get(run.section);
      if (!section) {
        return db.agentRun.update({
          where: { id: run.id },
          data: {
            status: "failed",
            error: `section ${run.section} not found in playbook definition`,
            finishedAt: new Date(),
          },
        });
      }
      return runAgentJob(run.id, section, {
        product,
        intake,
        playbook,
        brandContext,
      });
    }),
  );

  await rebuildAndWriteHtml(landingPageId);

  // Determine final LandingPage status.
  const refreshed = await db.landingPage.findUnique({
    where: { id: landingPageId },
    include: { runs: true },
  });
  if (!refreshed) return;
  const anyDone = refreshed.runs.some((r) => r.status === "done");
  await db.landingPage.update({
    where: { id: landingPageId },
    data: {
      status: anyDone ? "done" : "failed",
      error: anyDone ? null : "all section agents failed",
    },
  });
}

export async function regenerateSingleSection(
  landingPageId: string,
  sectionId: string,
): Promise<void> {
  const context = await loadContext(landingPageId);
  if (!context) return;

  const run = context.runs.find((r) => r.section === sectionId);
  if (!run) return;

  const section = context.playbook.sections.find((s) => s.id === sectionId);
  if (!section) return;

  // Re-resolve brand context on each single-section regen so users see
  // the effect of brand doc edits without a full swarm re-run.
  const brandContext = await buildBrandContext();

  await runAgentJob(run.id, section, {
    product: context.product,
    intake: context.intake,
    playbook: context.playbook,
    brandContext,
  });
  await rebuildAndWriteHtml(landingPageId);
}

// ---------- internal helpers --------------------------------------------

type LoadedContext = {
  landingPage: {
    id: string;
    slug: string;
    title: string;
    outputDir: string;
    presetId: string | null;
  };
  playbook: PlaybookDefinition;
  preset: PlaybookPreset;
  runs: Array<{ id: string; section: string }>;
  product: ProductInput;
  intake: Record<string, string>;
};

type ProductInput = {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  price: string | null;
  audience: string | null;
  tone: string | null;
  links: string | null;
  images: Array<{ url: string; analysis: string | null }>;
};

async function loadContext(
  landingPageId: string,
): Promise<LoadedContext | null> {
  const landingPage = await db.landingPage.findUnique({
    where: { id: landingPageId },
    include: {
      product: {
        include: {
          images: { orderBy: { createdAt: "asc" } },
        },
      },
      playbook: true,
      runs: { orderBy: { startedAt: "asc" } },
    },
  });
  if (!landingPage || !landingPage.playbook) return null;

  const playbook = parsePlaybook(landingPage.playbook.definition);
  const preset =
    playbook.presets.find((p) => p.id === landingPage.presetId) ??
    playbook.presets[0];

  const intake: Record<string, string> = landingPage.intake
    ? JSON.parse(landingPage.intake)
    : {};

  return {
    landingPage: {
      id: landingPage.id,
      slug: landingPage.slug,
      title: landingPage.title,
      outputDir: landingPage.outputDir,
      presetId: landingPage.presetId,
    },
    playbook,
    preset,
    runs: landingPage.runs.map((r) => ({ id: r.id, section: r.section })),
    product: {
      id: landingPage.product.id,
      name: landingPage.product.name,
      tagline: landingPage.product.tagline,
      description: landingPage.product.description,
      price: landingPage.product.price,
      audience: landingPage.product.audience,
      tone: landingPage.product.tone,
      links: landingPage.product.links,
      images: landingPage.product.images.map((img) => ({
        url: img.url,
        analysis: img.analysis,
      })),
    },
    intake,
  };
}

type AgentJobContext = {
  product: ProductInput;
  intake: Record<string, string>;
  playbook: PlaybookDefinition;
  /** Pre-resolved Brand Knowledge Base block. Empty string = no brand docs. */
  brandContext: string;
};

async function runAgentJob(
  runId: string,
  section: PlaybookSection,
  ctx: AgentJobContext,
): Promise<void> {
  await db.agentRun.update({
    where: { id: runId },
    data: { status: "running", error: null },
  });

  try {
    const { systemPrompt, userPrompt } = buildPrompts(section, ctx);

    const response = await getClaude().messages.create({
      model: CLAUDE_MODELS.opus,
      max_tokens: section.maxTokens ?? 3500,
      temperature: 0.85,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const html = extractSection(raw);

    if (!html) {
      throw new Error("agent returned no usable HTML");
    }

    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: "done",
        output: html,
        model: CLAUDE_MODELS.opus,
        promptTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agent ${section.id}] failed:`, message);
    await db.agentRun.update({
      where: { id: runId },
      data: { status: "failed", error: message, finishedAt: new Date() },
    });
  }
}

function buildPrompts(
  section: PlaybookSection,
  ctx: AgentJobContext,
): { systemPrompt: string; userPrompt: string } {
  const { product, intake, playbook, brandContext } = ctx;

  // System prompt = section's own system prompt + playbook copy rules
  const bannedLine =
    playbook.copyRules.bannedWords.length > 0
      ? `\nBANNED WORDS (never use): ${playbook.copyRules.bannedWords.join(", ")}.`
      : "";
  const systemPrompt = `${section.systemPrompt}

${playbook.copyRules.styleGuide}
${bannedLine}

EXECUTION DIRECTIVE:
${playbook.copyRules.executionDirective}`;

  // User prompt = shared product context + intake + section directive
  const productLines = [
    `Name: ${product.name}`,
    product.tagline && `Tagline: ${product.tagline}`,
    `Description: ${product.description}`,
    product.price && `Price: ${product.price}`,
    product.audience && `Audience: ${product.audience}`,
    product.tone && `Tone of voice: ${product.tone}`,
    product.links && `Links: ${product.links}`,
  ]
    .filter(Boolean)
    .join("\n");

  const analyses = product.images.length
    ? product.images
        .map(
          (img, i) =>
            `[${i + 1}] ${img.analysis ?? "(no analysis available — reference by URL only)"}`,
        )
        .join("\n\n")
    : "(no product images available)";

  const imageList = product.images.length
    ? product.images.map((img, i) => `- Image ${i + 1}: ${img.url}`).join("\n")
    : "- (no images — use CSS gradients or inline SVG shapes)";

  const intakeBlock =
    Object.keys(intake).length > 0
      ? `\n## Playbook intake answers
${Object.entries(intake)
  .map(([k, v]) => (v ? `- ${k}: ${v}` : ""))
  .filter(Boolean)
  .join("\n")}`
      : "";

  // Brand context lives above the product block so agents read foundational
  // brand truth before product specifics — matches the order the knowledge
  // base is organized in (brand → product → mechanism → …).
  const brandBlock = brandContext ? `${brandContext}\n\n---\n\n` : "";

  const userPrompt = `${brandBlock}## Product
${productLines}

## What the product looks like (from image analysis)
${analyses}

## Available product images (use these URLs as-is — do not invent new ones)
${imageList}
${intakeBlock}

## Full playbook section list (in order)
${playbook.sections.map((s) => s.id).join(" → ")}

---

${section.directive}`;

  return { systemPrompt, userPrompt };
}

/** Extract a single <section> block from Claude's output, stripping fences. */
function extractSection(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:html)?\s*\n?([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  // Greedy match to capture nested sections (quiz funnel uses nested
  // `<section class="lf-quiz-step">` inside a wrapper `<section>`).
  const match = candidate.match(/<section[\s\S]*<\/section>/i);
  return match ? match[0] : candidate;
}

async function rebuildAndWriteHtml(landingPageId: string): Promise<void> {
  const refreshed = await db.landingPage.findUnique({
    where: { id: landingPageId },
    include: {
      product: { select: { name: true } },
      playbook: true,
      runs: { orderBy: { startedAt: "asc" } },
    },
  });
  if (!refreshed || !refreshed.playbook) return;

  const playbook = parsePlaybook(refreshed.playbook.definition);
  const preset =
    playbook.presets.find((p) => p.id === refreshed.presetId) ??
    playbook.presets[0];

  // Build the section list in AgentRun creation order (matches user choice).
  const sectionsHtml = refreshed.runs.map((run) => {
    if (run.status === "done" && run.output) {
      return { id: run.section, html: run.output };
    }
    return {
      id: run.section,
      html: renderFailedSection(run.section, run.error ?? "not generated yet"),
    };
  });

  const html = stitch({
    title: refreshed.product.name,
    preset,
    stitcherConfig: playbook.stitcher,
    sections: sectionsHtml,
  });

  const absoluteOutputDir = path.join(paths.root, refreshed.outputDir);
  await mkdir(absoluteOutputDir, { recursive: true });
  await writeFile(path.join(absoluteOutputDir, "index.html"), html, "utf8");

  const meta = {
    productId: refreshed.productId,
    slug: refreshed.slug,
    title: refreshed.product.name,
    playbook: playbook.slug,
    preset: preset.id,
    runs: refreshed.runs.map((r) => ({
      section: r.section,
      status: r.status,
      model: r.model,
      promptTokens: r.promptTokens,
      outputTokens: r.outputTokens,
      error: r.error,
    })),
    rebuiltAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(absoluteOutputDir, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8",
  );
}

function parsePlaybook(raw: string): PlaybookDefinition {
  const parsed = JSON.parse(raw);
  return PlaybookDefinitionSchema.parse(parsed);
}

function selectEnabledSections(
  all: PlaybookSection[],
  enabledIds: string[] | undefined,
): PlaybookSection[] {
  if (!enabledIds) return all;
  const enabledSet = new Set(enabledIds);
  return all.filter(
    (s) => s.required !== false || enabledSet.has(s.id),
  );
}
