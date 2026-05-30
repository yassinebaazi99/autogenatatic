"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { analyzeAdRef } from "@/lib/adlib/analyze";
import {
  deleteAdRef,
  updateAdRefLabel,
  updateAdRefTags,
  uploadAdRefs,
} from "@/lib/adlib/upload";

// Server actions for /library (Ad Library). Uploads fan out Claude vision
// analysis via after() so the user gets an instant redirect while analysis
// happens in the background — mirrors the Brand doc upload pattern.

export type UploadState =
  | { status: "idle" }
  | {
      status: "ok";
      message: string;
    }
  | { status: "error"; message: string };

export async function uploadAdRefsAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const files = formData.getAll("files").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return { status: "error", message: "No files selected" };
  }

  const result = await uploadAdRefs(files);
  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  // Fan analysis out after the response — each ref is independent so we
  // kick them off in parallel and let Promise.allSettled mop up failures.
  after(async () => {
    await Promise.allSettled(
      result.created.map((ref) => analyzeAdRef(ref.id)),
    );
  });

  revalidatePath("/library");

  const okCount = result.created.length;
  const skipCount = result.skipped.length;
  const parts: string[] = [`Uploaded ${okCount} ${okCount === 1 ? "image" : "images"}`];
  if (skipCount > 0) {
    const reasons = result.skipped
      .map((s) => `${s.filename}: ${s.reason}`)
      .slice(0, 3)
      .join("; ");
    parts.push(
      `skipped ${skipCount} (${reasons}${skipCount > 3 ? "…" : ""})`,
    );
  }
  return { status: "ok", message: parts.join(" · ") };
}

export async function deleteAdRefAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteAdRef(id);
  revalidatePath("/library");
  revalidatePath(`/library/${id}`);
}

export async function updateAdRefTagsAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const tags = formData.get("tags");
  if (typeof id !== "string" || typeof tags !== "string") return;
  await updateAdRefTags(id, tags);
  revalidatePath("/library");
  revalidatePath(`/library/${id}`);
}

export async function updateAdRefLabelAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("id");
  const label = formData.get("label");
  if (typeof id !== "string" || typeof label !== "string") return;
  await updateAdRefLabel(id, label);
  revalidatePath("/library");
  revalidatePath(`/library/${id}`);
}

export async function reanalyzeAdRefAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  after(async () => {
    await analyzeAdRef(id);
  });
  revalidatePath(`/library/${id}`);
}

/** Manually edit the Claude vision analysis. Lets users override the
 *  auto-generated text when it's wrong or incomplete. Pair with the
 *  Re-run button which replaces it with a fresh auto-analysis. */
export async function updateAdRefAnalysisAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("id");
  const analysis = formData.get("analysis");
  if (typeof id !== "string" || typeof analysis !== "string") return;
  const trimmed = analysis.trim();
  const { db } = await import("@/lib/db");
  await db.adLibraryRef.update({
    where: { id },
    data: {
      analysis: trimmed || null,
      analysisError: null,
      analyzedAt: new Date(),
    },
  });
  revalidatePath("/library");
  revalidatePath(`/library/${id}`);
}
