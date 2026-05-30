import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildBrandContext } from "../brand/context";
import { buildOfferContext, loadBrandOffer } from "../brand/offer";
import { getOrCreateSingletonBrand } from "../brand/singleton";
import { CLAUDE_MODELS, getClaude } from "../claude";
import { db } from "../db";
import { buildLanderProjectContext } from "../lander-project/context";
import type { LanderType } from "../lander-project/types";
import { paths } from "../paths";
import { renderFailedSection, stitch } from "../playbooks/stitchers";
import type { PlaybookPreset, PlaybookSection } from "../playbooks/types";
import { uniqueSlug } from "../slug";

import { buildApprovedStaticsContext } from "./statics-context";
import { getLanderTemplate, type LanderTemplate } from "./templates";

// The Lander runner. Architecturally identical to the old playbook runner:
//   createLanderJob()       creates Job + Lander + LanderSections + links
//   runLanderJob()          fans out one Claude call per section in parallel
//                           (skipping locked ones), stitches the HTML, writes
//                           to disk, marks Lander done/failed
//   regenerateLanderSection one section rerun with optional note
//   updateLanderSectionEdit user inline-edit override
//   toggleLanderSectionLock lock/unlock
//
// Context injection stack per section agent:
//   1. Brand Knowledge Base        (buildBrandContext)
//   2. Lander Project Files        (buildLanderProjectContext(type))
//   3. Approved statics            (buildApprovedStaticsContext(landerId))
//   4. Intake answers               (from Lander.intake JSON)
//   5. Full section list (ordering) (from template.sections)
//   6. Section directive             (template.section.directive)

/** Free-text notes the user leaves at each wizard step. Each is optional
 *  and gets injected into the agent prompts differently — see the
 *  `buildWizardNotesBlock` helper. */
export type WizardNotes = {
  typeNote?: string;
  styleNote?: string;
  anchorsNote?: string;
  detailsNote?: string;
  finalNote?: string;
};

export type CreateLanderJobInput = {
  landerType: LanderType;
  presetId: string;
  title: string;
  intake: Record<string, string>;
  staticAdIds: string[];
  /** If provided, ONLY these template section ids are generated. Unknown
   *  ids are dropped. If empty or undefined, every template section runs. */
  enabledSectionIds?: string[];
  /** Free-text per-step guidance from the wizard. Persisted in the Lander
   *  intake JSON under the reserved `_wizardNotes` key so the runner can
   *  rehydrate it on regen without a separate column. */
  wizardNotes?: WizardNotes;
  /** Exact headline the user wants pinned. When set, the headline-section
   *  agent is instructed to use it verbatim and write supporting copy
   *  around it. Persisted under intake's `_headlineOverride` key. */
  headlineOverride?: string;
};

/** Section ids that count as "the headline" for each template type.
 *  When a headline override is set, only these sections get the pinning
 *  instruction — every other section runs normally. */
const HEADLINE_SECTION_IDS = new Set([
  "editorial-headline", // advertorial — the <h1> editorial card
  "intro", // listicle — the intro heading doubles as the page headline
  "quiz-intro", // quiz — first-step headline (if the template uses it)
  "hero", // any template with a hero section
]);

export type CreateLanderJobResult = {
  landerId: string;
  jobId: string;
  slug: string;
};

export async function createLanderJob(
  input: CreateLanderJobInput,
): Promise<CreateLanderJobResult> {
  const template = getLanderTemplate(input.landerType);
  const preset = template.presets.find((p) => p.id === input.presetId);
  if (!preset) {
    throw new Error(
      `preset "${input.presetId}" not found on ${input.landerType} template`,
    );
  }

  const brand = await getOrCreateSingletonBrand();

  // Verify every requested static exists AND is approved. Drop bad ids —
  // matches the Phase 3 static-gen behavior.
  let validStaticIds: string[] = [];
  if (input.staticAdIds.length > 0) {
    const approvedStatics = await db.staticAd.findMany({
      where: {
        id: { in: input.staticAdIds },
        status: { in: ["approved", "live"] },
      },
      select: { id: true },
    });
    validStaticIds = approvedStatics.map((s) => s.id);
  }

  const slug = uniqueSlug(input.title || brand.name);
  // public/landers-preview/ avoids colliding with the /landers/[id] dynamic
  // route when the dev server tries to serve static files. The detail page
  // links to /landers-preview/<slug>/index.html for the live preview.
  const outputDir = `public/landers-preview/${slug}`;

  // Resolve the section whitelist. If the wizard sent ids, filter the
  // template down to just those; otherwise run everything.
  const requestedIds = input.enabledSectionIds?.filter(Boolean);
  const activeSections =
    requestedIds && requestedIds.length > 0
      ? template.sections.filter((s) => requestedIds.includes(s.id))
      : template.sections;
  if (activeSections.length === 0) {
    throw new Error("at least one section must be enabled");
  }

  // Persist wizardNotes + headlineOverride inside the intake JSON under
  // reserved keys so regen + section re-runs can read them back without
  // adding schema columns for each new wizard input.
  const intakeWithNotes: Record<string, unknown> = { ...input.intake };
  if (input.wizardNotes && hasAnyNote(input.wizardNotes)) {
    intakeWithNotes._wizardNotes = input.wizardNotes;
  }
  const headlineOverride = input.headlineOverride?.trim();
  if (headlineOverride) {
    intakeWithNotes._headlineOverride = headlineOverride;
  }

  // Snapshot inputs on the Job for Jobs history + replay.
  const inputSnapshot = JSON.stringify({
    landerType: input.landerType,
    presetId: input.presetId,
    title: input.title,
    intake: input.intake,
    staticAdIds: validStaticIds,
    enabledSectionIds: activeSections.map((s) => s.id),
    wizardNotes: input.wizardNotes ?? null,
    headlineOverride: headlineOverride ?? null,
  });

  const job = await db.job.create({
    data: {
      brandId: brand.id,
      kind: "lander",
      status: "queued",
      input: inputSnapshot,
    },
  });

  const lander = await db.lander.create({
    data: {
      brandId: brand.id,
      jobId: job.id,
      landerType: input.landerType,
      presetId: preset.id,
      slug,
      title: input.title || brand.name,
      outputDir,
      intake: JSON.stringify(intakeWithNotes),
      status: "running",
    },
  });

  // Pre-create a LanderSection row per whitelisted template section, in
  // original template order so orderIndex is stable (even with gaps).
  for (let i = 0; i < activeSections.length; i += 1) {
    const section = activeSections[i];
    const templateIndex = template.sections.findIndex((s) => s.id === section.id);
    await db.landerSection.create({
      data: {
        landerId: lander.id,
        sectionId: section.id,
        label: section.label,
        orderIndex: templateIndex,
        status: "pending",
      },
    });
  }

  // Create link rows for each valid approved static. These power the
  // traceability badge on the lander detail page.
  for (const staticAdId of validStaticIds) {
    await db.landerStaticLink.create({
      data: { landerId: lander.id, staticAdId },
    });
  }

  return { landerId: lander.id, jobId: job.id, slug };
}

export async function runLanderJob(landerId: string): Promise<void> {
  const context = await loadContext(landerId);
  if (!context) return;

  const { lander, template, sections } = context;

  await db.lander.update({
    where: { id: lander.id },
    data: { status: "running" },
  });
  if (lander.jobId) {
    await db.job.update({
      where: { id: lander.jobId },
      data: { status: "running" },
    });
  }

  // Resolve context once for the whole swarm — every agent gets the same
  // block so their reads are coherent AND so Anthropic prompt caching
  // fires on the shared prefix for sections #2 through #17.
  const brandContext = await buildBrandContext();
  const projectContext = await buildLanderProjectContext(
    lander.landerType as LanderType,
  );
  const staticsContext = await buildApprovedStaticsContext(lander.id);
  const offer = await loadBrandOffer();
  const offerContext = buildOfferContext(offer);

  const bySectionId = new Map(template.sections.map((s) => [s.id, s]));

  // Fire every agent in parallel. Locked sections are skipped — their
  // existing output stays put.
  await Promise.all(
    sections.map(async (row) => {
      if (row.locked) return; // locked sections keep their existing output
      const section = bySectionId.get(row.sectionId);
      if (!section) {
        await failSection(
          row.id,
          `template section "${row.sectionId}" not found`,
        );
        return;
      }
      await runAgentJob(row.id, section, {
        template,
        intake: context.intake,
        brandContext,
        projectContext,
        staticsContext,
        offerContext,
        wizardNotes: context.wizardNotes,
        headlineOverride: context.headlineOverride,
        regenNote: null,
      });
    }),
  );

  await rebuildAndWriteHtml(landerId);

  // Final status rollup — "done" if any section succeeded, otherwise fail.
  const refreshed = await db.lander.findUnique({
    where: { id: landerId },
    include: { sections: true },
  });
  if (!refreshed) return;
  const anyDone = refreshed.sections.some((s) => s.status === "done");
  await db.lander.update({
    where: { id: landerId },
    data: {
      status: anyDone ? "done" : "failed",
      error: anyDone ? null : "all section agents failed",
    },
  });
  if (refreshed.jobId) {
    await db.job.update({
      where: { id: refreshed.jobId },
      data: {
        status: anyDone ? "done" : "failed",
        finishedAt: new Date(),
        output: JSON.stringify({
          slug: refreshed.slug,
          sectionCount: refreshed.sections.length,
          doneCount: refreshed.sections.filter((s) => s.status === "done")
            .length,
        }),
      },
    });
  }
}

export async function regenerateLanderSection(
  sectionRowId: string,
  note: string | null,
): Promise<void> {
  const row = await db.landerSection.findUnique({
    where: { id: sectionRowId },
  });
  if (!row) return;
  if (row.locked) return; // safety net — UI shouldn't expose regenerate on locked

  const context = await loadContext(row.landerId);
  if (!context) return;

  const { template } = context;
  const section = template.sections.find((s) => s.id === row.sectionId);
  if (!section) return;

  const brandContext = await buildBrandContext();
  const projectContext = await buildLanderProjectContext(
    context.lander.landerType as LanderType,
  );
  const staticsContext = await buildApprovedStaticsContext(row.landerId);
  const offer = await loadBrandOffer();
  const offerContext = buildOfferContext(offer);

  await runAgentJob(row.id, section, {
    template,
    intake: context.intake,
    brandContext,
    projectContext,
    staticsContext,
    offerContext,
    wizardNotes: context.wizardNotes,
    headlineOverride: context.headlineOverride,
    regenNote: note,
  });

  // Clear any inline edit on regen — a regenerate means the user wants
  // fresh output, not to preserve their tweak.
  await db.landerSection.update({
    where: { id: row.id },
    data: { userEdit: null },
  });

  await rebuildAndWriteHtml(row.landerId);
}

export async function updateLanderSectionEdit(
  sectionRowId: string,
  userEdit: string | null,
): Promise<void> {
  const trimmed = userEdit?.trim() ?? "";
  await db.landerSection.update({
    where: { id: sectionRowId },
    data: { userEdit: trimmed || null },
  });
  const row = await db.landerSection.findUnique({ where: { id: sectionRowId } });
  if (row) await rebuildAndWriteHtml(row.landerId);
}

export async function toggleLanderSectionLock(
  sectionRowId: string,
): Promise<void> {
  const row = await db.landerSection.findUnique({ where: { id: sectionRowId } });
  if (!row) return;
  await db.landerSection.update({
    where: { id: sectionRowId },
    data: { locked: !row.locked },
  });
}

// ---------- internals ---------------------------------------------------

type LoadedContext = {
  lander: {
    id: string;
    jobId: string | null;
    slug: string;
    title: string;
    outputDir: string;
    landerType: string;
    presetId: string;
  };
  template: LanderTemplate;
  preset: PlaybookPreset;
  sections: Array<{
    id: string;
    sectionId: string;
    orderIndex: number;
    locked: boolean;
  }>;
  intake: Record<string, string>;
  wizardNotes: WizardNotes | null;
  headlineOverride: string | null;
};

async function loadContext(landerId: string): Promise<LoadedContext | null> {
  const lander = await db.lander.findUnique({
    where: { id: landerId },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!lander) return null;

  const template = getLanderTemplate(lander.landerType as LanderType);
  const preset =
    template.presets.find((p) => p.id === lander.presetId) ??
    template.presets[0];

  const rawIntake: Record<string, unknown> = lander.intake
    ? safeJson(lander.intake)
    : {};
  // Pull wizardNotes + headlineOverride out of the intake blob — the
  // runner treats them as separate context layers with their own prompt
  // positions.
  const wizardNotes = extractWizardNotes(rawIntake);
  const headlineOverride =
    typeof rawIntake._headlineOverride === "string" &&
    rawIntake._headlineOverride.trim().length > 0
      ? rawIntake._headlineOverride.trim()
      : null;
  const intake: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawIntake)) {
    if (k === "_wizardNotes" || k === "_headlineOverride") continue;
    if (typeof v === "string") intake[k] = v;
  }

  return {
    lander: {
      id: lander.id,
      jobId: lander.jobId,
      slug: lander.slug,
      title: lander.title,
      outputDir: lander.outputDir,
      landerType: lander.landerType,
      presetId: lander.presetId,
    },
    template,
    preset,
    sections: lander.sections.map((s) => ({
      id: s.id,
      sectionId: s.sectionId,
      orderIndex: s.orderIndex,
      locked: s.locked,
    })),
    intake,
    wizardNotes,
    headlineOverride,
  };
}

type AgentJobContext = {
  template: LanderTemplate;
  intake: Record<string, string>;
  brandContext: string;
  projectContext: string;
  staticsContext: string;
  /** Structured offer block — stable across the whole run. */
  offerContext: string;
  wizardNotes: WizardNotes | null;
  /** Verbatim headline the user pinned in the wizard. Only applies to
   *  sections whose id is in HEADLINE_SECTION_IDS. */
  headlineOverride: string | null;
  regenNote: string | null;
};

async function runAgentJob(
  sectionRowId: string,
  section: PlaybookSection,
  ctx: AgentJobContext,
): Promise<void> {
  await db.landerSection.update({
    where: { id: sectionRowId },
    data: {
      status: "running",
      error: null,
      startedAt: new Date(),
      finishedAt: null,
    },
  });

  try {
    const { systemBlocks, userPrompt } = buildPrompts(section, ctx);

    const response = await getClaude().messages.create({
      model: CLAUDE_MODELS.opus,
      max_tokens: section.maxTokens ?? 3500,
      temperature: 0.85,
      system: systemBlocks,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const html = extractSection(raw);
    if (!html) {
      throw new Error("agent returned no usable HTML");
    }

    await db.landerSection.update({
      where: { id: sectionRowId },
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
    console.error(`[lander-agent ${section.id}] failed:`, message);
    await failSection(sectionRowId, message);
  }
}

async function failSection(sectionRowId: string, message: string) {
  await db.landerSection.update({
    where: { id: sectionRowId },
    data: { status: "failed", error: message, finishedAt: new Date() },
  });
}

/**
 * Narrow type matching the Anthropic SDK's TextBlockParam shape so the
 * `system` parameter accepts our content-block array. We don't import
 * from the SDK directly to keep this module decoupled — the fields we
 * use (type, text, cache_control) are stable across v0.88.
 */
type CachedSystemBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

function buildPrompts(
  section: PlaybookSection,
  ctx: AgentJobContext,
): { systemBlocks: CachedSystemBlock[]; userPrompt: string } {
  const { template, intake, regenNote, wizardNotes } = ctx;

  // ---------- Build the SHARED system prefix (cacheable) -----------
  //
  // Everything that is identical across all N sections of this run goes
  // here. Anthropic's ephemeral prompt cache keys off the token prefix,
  // so putting stable content first means sections 2..N read from cache
  // at ~10% of the uncached price.

  const bannedLine =
    template.copyRules.bannedWords.length > 0
      ? `BANNED WORDS (never use): ${template.copyRules.bannedWords.join(", ")}.`
      : "";

  const sharedChunks: string[] = [
    // Section system prompt is the SAME string across every section in
    // a template (e.g. ADVERTORIAL_HARD_RULES). It's safe to put in the
    // cached prefix — it only changes when the lander type changes.
    section.systemPrompt,
    template.copyRules.styleGuide,
    bannedLine,
    `EXECUTION DIRECTIVE:\n${template.copyRules.executionDirective}`,
  ];

  // Wizard notes that apply globally go in the cached prefix so all
  // sections see them without re-paying tokens.
  if (wizardNotes?.typeNote?.trim()) {
    sharedChunks.push(
      `USER'S OVERALL DIRECTION (applies to every section):\n${wizardNotes.typeNote.trim()}`,
    );
  }
  if (wizardNotes?.finalNote?.trim()) {
    sharedChunks.push(
      `USER'S FINAL INSTRUCTION — MUST FOLLOW:\n${wizardNotes.finalNote.trim()}`,
    );
  }

  // Context stack — brand, project files, images, offer. All stable
  // across the run so they live in the cached prefix.
  if (ctx.brandContext) sharedChunks.push(ctx.brandContext);
  if (ctx.projectContext) sharedChunks.push(ctx.projectContext);
  if (ctx.staticsContext) sharedChunks.push(ctx.staticsContext);
  if (ctx.offerContext) sharedChunks.push(ctx.offerContext);

  // Per-step user-side notes (style, anchors, details). Still stable
  // across the run; they go in the cached prefix too.
  const userNotesBlock = buildUserSideNotesBlock(wizardNotes);
  if (userNotesBlock) sharedChunks.push(userNotesBlock);

  // Intake answers are identical across sections — cacheable.
  if (Object.keys(intake).length > 0) {
    const intakeBody = Object.entries(intake)
      .map(([k, v]) => (v ? `- ${k}: ${v}` : ""))
      .filter(Boolean)
      .join("\n");
    sharedChunks.push(`## Intake answers\n${intakeBody}`);
  }

  // The full ordered section list is identical across sections — cacheable.
  sharedChunks.push(
    `## Full section list (in order)\n${template.sections.map((s) => s.id).join(" → ")}`,
  );

  const sharedText = sharedChunks.join("\n\n");

  // ---------- Build the per-section (uncached) tail ----------------
  //
  // Only the regen-feedback note is truly per-section within a run.
  // It lives in its own system block AFTER the cache breakpoint so it
  // doesn't invalidate the prefix.
  const systemBlocks: CachedSystemBlock[] = [
    {
      type: "text",
      text: sharedText,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (regenNote) {
    systemBlocks.push({
      type: "text",
      text: `IMPORTANT — REGENERATION FEEDBACK: The previous attempt at this section was rejected with the note: "${regenNote}". Do not repeat the pattern that was rejected. Address the feedback directly in this new version.`,
    });
  }

  // ---------- User message = section directive + per-section adds ------
  //
  // Keeping the user message tight means the per-section cost is almost
  // entirely the section directive + Claude's response. The cached
  // prefix handles the rest.
  //
  // The headline override is injected here (not in the cached prefix)
  // because it only applies to the ONE section whose id is a known
  // headline id — the other N-1 sections should never see it.
  let headlinePin = "";
  if (
    ctx.headlineOverride &&
    HEADLINE_SECTION_IDS.has(section.id)
  ) {
    headlinePin = `\n\n---\n\nCRITICAL HEADLINE PIN — READ BEFORE WRITING:
The user has specified the EXACT headline text for this section. You must use
it verbatim as the <h1> (or the section's main heading element). Do not
paraphrase, shorten, rewrite, or embellish it. Write the eyebrow, sub-headline,
intro paragraphs, and any supporting copy around this exact headline.

Pinned headline: "${ctx.headlineOverride}"`;
  }

  const userPrompt = `## Section to write: ${section.id}

${section.directive}${headlinePin}`;

  return { systemBlocks, userPrompt };
}

/** Render wizard notes that belong near their natural context. Shared
 *  across sections so it lives in the cached prefix. */
function buildUserSideNotesBlock(notes: WizardNotes | null): string {
  if (!notes) return "";
  const items: Array<[string, string]> = [];
  if (notes.styleNote?.trim()) items.push(["Style preference", notes.styleNote.trim()]);
  if (notes.anchorsNote?.trim()) items.push(["Image usage", notes.anchorsNote.trim()]);
  if (notes.detailsNote?.trim()) items.push(["Details", notes.detailsNote.trim()]);
  if (items.length === 0) return "";
  const body = items.map(([label, text]) => `- **${label}**: ${text}`).join("\n");
  return `# User notes from the wizard\n\n${body}`;
}

function hasAnyNote(notes: WizardNotes): boolean {
  return Object.values(notes).some((v) => typeof v === "string" && v.trim().length > 0);
}

function extractWizardNotes(raw: Record<string, unknown>): WizardNotes | null {
  const candidate = raw._wizardNotes;
  if (!candidate || typeof candidate !== "object") return null;
  const obj = candidate as Record<string, unknown>;
  const result: WizardNotes = {};
  for (const key of ["typeNote", "styleNote", "anchorsNote", "detailsNote", "finalNote"] as const) {
    const value = obj[key];
    if (typeof value === "string") result[key] = value;
  }
  return hasAnyNote(result) ? result : null;
}

/** Extract a single <section> block from Claude's output. */
function extractSection(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:html)?\s*\n?([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const match = candidate.match(/<section[\s\S]*<\/section>/i);
  return match ? match[0] : candidate;
}

async function rebuildAndWriteHtml(landerId: string): Promise<void> {
  const refreshed = await db.lander.findUnique({
    where: { id: landerId },
    include: { sections: { orderBy: { orderIndex: "asc" } } },
  });
  if (!refreshed) return;

  const template = getLanderTemplate(refreshed.landerType as LanderType);
  const preset =
    template.presets.find((p) => p.id === refreshed.presetId) ??
    template.presets[0];

  // Build the section list in orderIndex order. Prefer userEdit when
  // present, fall back to output, fall back to a rendered error card so
  // the page is always visually coherent.
  const sectionsHtml = refreshed.sections.map((row) => {
    if (row.userEdit) {
      return { id: row.sectionId, html: row.userEdit };
    }
    if (row.status === "done" && row.output) {
      return { id: row.sectionId, html: row.output };
    }
    return {
      id: row.sectionId,
      html: renderFailedSection(row.sectionId, row.error ?? "not generated yet"),
    };
  });

  const html = stitch({
    title: refreshed.title,
    preset,
    stitcherConfig: template.stitcher,
    sections: sectionsHtml,
  });

  const absoluteOutputDir = path.join(paths.root, refreshed.outputDir);
  await mkdir(absoluteOutputDir, { recursive: true });
  await writeFile(path.join(absoluteOutputDir, "index.html"), html, "utf8");

  const meta = {
    landerId: refreshed.id,
    slug: refreshed.slug,
    title: refreshed.title,
    landerType: refreshed.landerType,
    preset: preset.id,
    rebuiltAt: new Date().toISOString(),
    sections: refreshed.sections.map((s) => ({
      sectionId: s.sectionId,
      status: s.status,
      locked: s.locked,
      hasUserEdit: !!s.userEdit,
      model: s.model,
      promptTokens: s.promptTokens,
      outputTokens: s.outputTokens,
      error: s.error,
    })),
  };
  await writeFile(
    path.join(absoluteOutputDir, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8",
  );
}

function safeJson<T = Record<string, string>>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}
