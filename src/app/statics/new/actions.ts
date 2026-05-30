"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import {
  extractTextFromBuffer,
  guessMimeFromFilename,
  isExtractableMime,
} from "@/lib/brand/extract";
import { createStaticGenJob, runStaticGenJob } from "@/lib/static-gen/runner";

// Server action called from /statics/new. Parses the form, extracts the
// angle doc text inline (no disk persistence — the text goes into the
// Job.input snapshot), creates the Job + placeholder StaticAds, kicks off
// the runner via after(), then redirects to the live review page.

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function submitStaticGenJobAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const userPrompt = (formData.get("userPrompt") ?? "").toString().trim();
  const refIdsRaw = (formData.get("refIds") ?? "").toString();
  const angleDoc = formData.get("angleDoc");

  if (!userPrompt) {
    return { status: "error", message: "Direction prompt is required" };
  }

  const refIds = refIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (refIds.length === 0) {
    return { status: "error", message: "Select at least one reference ad" };
  }

  // Extract angle doc text inline. We don't persist the file itself — the
  // extracted prose is all the runner needs, and it lives in Job.input.
  let angleText: string | null = null;
  if (angleDoc instanceof File && angleDoc.size > 0) {
    const mime = isExtractableMime(angleDoc.type)
      ? angleDoc.type
      : guessMimeFromFilename(angleDoc.name);
    if (!mime) {
      return {
        status: "error",
        message: `Unsupported angle doc type: ${angleDoc.name}`,
      };
    }
    try {
      const buffer = Buffer.from(await angleDoc.arrayBuffer());
      angleText = await extractTextFromBuffer(buffer, mime);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: "error",
        message: `Failed to extract angle doc: ${message}`,
      };
    }
  }

  let jobId: string;
  try {
    const created = await createStaticGenJob({
      userPrompt,
      angleText,
      refIds,
    });
    jobId = created.jobId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", message };
  }

  // after() fires after the redirect completes. The runner does its own
  // error handling — if it throws, the Job row lands in status="failed"
  // and the review grid surfaces it.
  after(async () => {
    await runStaticGenJob(jobId);
  });

  redirect(`/statics/review?jobId=${jobId}`);
}
