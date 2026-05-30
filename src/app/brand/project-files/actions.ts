"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import {
  deleteLanderProjectFile,
  uploadLanderProjectFile,
} from "@/lib/lander-project/upload";
import {
  isLanderProjectSlot,
  isLanderType,
} from "@/lib/lander-project/types";

// Server actions for /brand/project-files. Upload validates the type/slot
// strings before trusting them — form fields are plain strings.

export type ProjectFileUploadState =
  | { status: "idle" }
  | { status: "ok"; message: string; slot: string }
  | { status: "error"; message: string; slot: string };

export async function uploadProjectFileAction(
  _prev: ProjectFileUploadState,
  formData: FormData,
): Promise<ProjectFileUploadState> {
  const landerType = (formData.get("landerType") ?? "").toString();
  const slot = (formData.get("slot") ?? "").toString();
  const file = formData.get("file");

  if (!isLanderType(landerType)) {
    return {
      status: "error",
      message: "Invalid lander type",
      slot,
    };
  }
  if (!isLanderProjectSlot(slot)) {
    return {
      status: "error",
      message: "Invalid slot",
      slot,
    };
  }
  if (!(file instanceof File)) {
    return { status: "error", message: "No file provided", slot };
  }

  const result = await uploadLanderProjectFile({ landerType, slot, file });
  if (!result.ok) {
    return { status: "error", message: result.error, slot };
  }

  revalidatePath("/brand/project-files");
  revalidatePath(`/brand/project-files/${landerType}`);

  return {
    status: "ok",
    message: `Uploaded ${result.filename}`,
    slot,
  };
}

export async function deleteProjectFileAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("id");
  const landerType = formData.get("landerType");
  if (typeof id !== "string") return;
  await deleteLanderProjectFile(id);
  revalidatePath("/brand/project-files");
  if (typeof landerType === "string") {
    revalidatePath(`/brand/project-files/${landerType}`);
  }
}

/** Edit the extracted text content of a doc-kind project file. Image
 *  files have `content: null` and can't be edited here — replace via
 *  upload+delete instead. */
export async function updateProjectFileContentAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("id");
  const content = formData.get("content");
  const landerType = formData.get("landerType");
  if (typeof id !== "string" || typeof content !== "string") return;
  const trimmed = content.trim();
  if (trimmed.length === 0) return;

  await db.landerProjectFile.update({
    where: { id },
    data: {
      content: trimmed,
      sizeBytes: trimmed.length,
    },
  });
  revalidatePath("/brand/project-files");
  if (typeof landerType === "string") {
    revalidatePath(`/brand/project-files/${landerType}`);
  }
}
