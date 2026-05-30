import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { analyzeAdRef } from "../adlib/analyze";
import { buildBrandContext } from "../brand/context";
import { getOrCreateSingletonBrand } from "../brand/singleton";
import { db } from "../db";
import { generateNanoBananaImage } from "../gemini";
import { brandPublicUrl, brandUploadDir, paths } from "../paths";
import { writeNanoBananaPrompt } from "./prompt-writer";

// The static-gen runner. Mirrors the playbook runner pattern:
//  - createStaticGenJob creates DB rows + returns a jobId
//  - runStaticGenJob does the actual Claude + Gemini work (called from
//    after() so the response flushes while the job runs)
//  - regenerateStaticAd re-runs the single-ref flow for one existing static
//
// Per-ref jobs fan out in parallel via Promise.allSettled — one failure
// doesn't block the other refs from completing.

export type CreateStaticGenJobInput = {
  userPrompt: string;
  angleText: string | null;
  refIds: string[];
};

export type CreateStaticGenJobResult = {
  jobId: string;
  staticAdIds: string[];
};

export async function createStaticGenJob(
  input: CreateStaticGenJobInput,
): Promise<CreateStaticGenJobResult> {
  if (input.refIds.length === 0) {
    throw new Error("At least one reference ad must be selected");
  }

  const brand = await getOrCreateSingletonBrand();

  // Verify each ref exists and belongs to the brand. Bad ids are dropped
  // rather than failing the whole job — the user shouldn't lose the rest
  // of their selection because one stale id slipped through.
  const refs = await db.adLibraryRef.findMany({
    where: { id: { in: input.refIds } },
  });
  const validRefIds = refs.map((r) => r.id);
  if (validRefIds.length === 0) {
    throw new Error("None of the selected reference ads exist");
  }

  // Snapshot the input on the Job so Jobs history shows what was asked for.
  const inputSnapshot = JSON.stringify({
    userPrompt: input.userPrompt,
    angleText: input.angleText,
    refIds: validRefIds,
  });

  const job = await db.job.create({
    data: {
      brandId: brand.id,
      kind: "static",
      status: "queued",
      input: inputSnapshot,
    },
  });

  // Pre-create one StaticAd placeholder per ref so the review grid can
  // render "Generating…" cards immediately while the runner fills them in.
  const placeholders: Array<{ id: string }> = [];
  for (const ref of refs) {
    const placeholder = await db.staticAd.create({
      data: {
        brandId: brand.id,
        jobId: job.id,
        adLibraryRefId: ref.id,
        claudePrompt: "",
        url: "",
        model: "",
        status: "draft",
      },
    });
    placeholders.push({ id: placeholder.id });
  }

  return { jobId: job.id, staticAdIds: placeholders.map((p) => p.id) };
}

export async function runStaticGenJob(jobId: string): Promise<void> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { staticAds: { orderBy: { createdAt: "asc" } } },
  });
  if (!job) {
    console.warn(`[static-gen] job ${jobId} not found`);
    return;
  }
  if (job.kind !== "static") return;

  await db.job.update({
    where: { id: jobId },
    data: { status: "running" },
  });

  // Load context once, reuse across all per-ref jobs.
  const brandContext = await buildBrandContext();
  const parsedInput = safeParseJobInput(job.input);

  const results = await Promise.allSettled(
    job.staticAds.map((staticAd) =>
      generateOneStatic({
        staticAdId: staticAd.id,
        jobId: job.id,
        userPrompt: parsedInput.userPrompt,
        angleText: parsedInput.angleText,
        brandContext,
      }),
    ),
  );

  const anyOk = results.some((r) => r.status === "fulfilled");
  const errorCount = results.filter((r) => r.status === "rejected").length;

  await db.job.update({
    where: { id: jobId },
    data: {
      status: anyOk ? "done" : "failed",
      error: anyOk ? null : "all generations failed",
      finishedAt: new Date(),
      output: JSON.stringify({
        totalRefs: job.staticAds.length,
        errors: errorCount,
      }),
    },
  });
}

/**
 * Regenerate one existing StaticAd in place. Writes a fresh Nano Banana
 * prompt and a fresh image, bumping updatedAt. If `note` is provided it's
 * appended to the Claude prompt-writer call and saved on the row.
 */
export async function regenerateStaticAd(
  staticAdId: string,
  note: string | null,
): Promise<void> {
  const staticAd = await db.staticAd.findUnique({
    where: { id: staticAdId },
  });
  if (!staticAd) return;

  const brandContext = await buildBrandContext();
  const job = await db.job.findUnique({ where: { id: staticAd.jobId } });
  const parsedInput = job ? safeParseJobInput(job.input) : { userPrompt: "", angleText: null, refIds: [] };

  await db.staticAd.update({
    where: { id: staticAdId },
    data: {
      status: "draft",
      regenNote: note,
      error: null,
      claudePrompt: "",
      url: "",
    },
  });

  await generateOneStatic({
    staticAdId,
    jobId: staticAd.jobId,
    userPrompt: parsedInput.userPrompt,
    angleText: parsedInput.angleText,
    brandContext,
    regenNote: note,
  });
}

// ---------- internals ---------------------------------------------------

type GenerateOneInput = {
  staticAdId: string;
  jobId: string;
  userPrompt: string;
  angleText: string | null;
  brandContext: string;
  regenNote?: string | null;
};

async function generateOneStatic(ctx: GenerateOneInput): Promise<void> {
  const { staticAdId, jobId, regenNote = null } = ctx;

  const staticAd = await db.staticAd.findUnique({
    where: { id: staticAdId },
    include: { adLibraryRef: true },
  });
  if (!staticAd) return;

  const ref = staticAd.adLibraryRef;
  if (!ref) {
    await failStatic(staticAdId, "reference ad was deleted");
    return;
  }

  // Ensure the ref has a Claude vision analysis — if not, run the analyzer
  // inline. This catches the case where a ref was uploaded and immediately
  // used in a job before the background analysis finished.
  if (!ref.analyzedAt) {
    await analyzeAdRef(ref.id);
  }
  const refreshedRef = await db.adLibraryRef.findUnique({
    where: { id: ref.id },
  });
  if (!refreshedRef) {
    await failStatic(staticAdId, "reference ad disappeared mid-run");
    return;
  }

  try {
    // Step 1 — Claude writes the Nano Banana prompt.
    const claudePrompt = await writeNanoBananaPrompt({
      brandContext: ctx.brandContext,
      userPrompt: ctx.userPrompt,
      angleText: ctx.angleText,
      refAnalysis: refreshedRef.analysis,
      refImagePath: refreshedRef.url,
      refMime: refreshedRef.mimeType,
      regenNote,
    });

    // Record prompt history immediately so the per-ref detail page shows
    // it even if Gemini fails next.
    await db.staticGenPromptHistory.create({
      data: {
        adLibraryRefId: refreshedRef.id,
        jobId,
        claudePrompt,
        regenNote,
      },
    });

    // Step 2 — Read the reference image off disk and hand it to Gemini as
    // an image-to-image anchor.
    const relativeFromPublic = refreshedRef.url.replace(/^\//, "");
    const refDiskPath = path.join(
      paths.root,
      "public",
      relativeFromPublic,
    );
    const refBuffer = await (
      await import("node:fs/promises")
    ).readFile(refDiskPath);

    const generated = await generateNanoBananaImage({
      prompt: claudePrompt,
      referenceImage: {
        buffer: refBuffer,
        mimeType: normalizeMime(refreshedRef.mimeType),
      },
    });

    // Step 3 — Write the PNG to disk under the brand's statics folder.
    const brand = await getOrCreateSingletonBrand();
    const staticsDir = path.join(brandUploadDir(brand.id), "statics");
    await mkdir(staticsDir, { recursive: true });
    const ext = extFromMime(generated.mimeType);
    const filename = `${randomUUID()}${ext}`;
    const absolutePath = path.join(staticsDir, filename);
    await writeFile(absolutePath, generated.buffer);

    const publicUrl = brandPublicUrl(brand.id, `statics/${filename}`);

    await db.staticAd.update({
      where: { id: staticAdId },
      data: {
        claudePrompt,
        url: publicUrl,
        model: generated.model,
        error: null,
        regenNote,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[static-gen] static ${staticAdId} failed:`, message);
    await failStatic(staticAdId, message);
    throw err; // Let allSettled see the rejection for job-level counting.
  }
}

async function failStatic(staticAdId: string, message: string): Promise<void> {
  await db.staticAd.update({
    where: { id: staticAdId },
    data: {
      error: message,
      updatedAt: new Date(),
    },
  });
}

function safeParseJobInput(raw: string): {
  userPrompt: string;
  angleText: string | null;
  refIds: string[];
} {
  try {
    const parsed = JSON.parse(raw);
    return {
      userPrompt: typeof parsed.userPrompt === "string" ? parsed.userPrompt : "",
      angleText: typeof parsed.angleText === "string" ? parsed.angleText : null,
      refIds: Array.isArray(parsed.refIds) ? parsed.refIds : [],
    };
  } catch {
    return { userPrompt: "", angleText: null, refIds: [] };
  }
}

function normalizeMime(mime: string): "image/jpeg" | "image/png" | "image/webp" {
  if (mime === "image/jpeg" || mime === "image/jpg") return "image/jpeg";
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  return "image/jpeg";
}

function extFromMime(mime: string): ".png" | ".jpg" | ".webp" {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return ".png";
}
