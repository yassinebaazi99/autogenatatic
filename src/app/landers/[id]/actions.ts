"use server";

import { rm } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { db } from "@/lib/db";
import {
  regenerateLanderSection,
  toggleLanderSectionLock,
  updateLanderSectionEdit,
} from "@/lib/landers/runner";
import { paths } from "@/lib/paths";

// Per-section actions for the lander editor. All revalidate the detail
// page so the UI reflects the new state as soon as the action returns.

export async function toggleLockAction(formData: FormData): Promise<void> {
  const id = formData.get("sectionId");
  const landerId = formData.get("landerId");
  if (typeof id !== "string" || typeof landerId !== "string") return;
  await toggleLanderSectionLock(id);
  revalidatePath(`/landers/${landerId}`);
}

export async function regenerateSectionAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("sectionId");
  const landerId = formData.get("landerId");
  const note = formData.get("note");
  if (typeof id !== "string" || typeof landerId !== "string") return;

  const trimmedNote =
    typeof note === "string" && note.trim().length > 0 ? note.trim() : null;

  // Flip the row to running synchronously so the polling UI shows
  // activity immediately, then queue the real work.
  await db.landerSection.update({
    where: { id },
    data: {
      status: "running",
      error: null,
      startedAt: new Date(),
      finishedAt: null,
    },
  });

  after(async () => {
    await regenerateLanderSection(id, trimmedNote);
  });

  revalidatePath(`/landers/${landerId}`);
}

export async function saveSectionEditAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("sectionId");
  const landerId = formData.get("landerId");
  const userEdit = formData.get("userEdit");
  if (typeof id !== "string" || typeof landerId !== "string") return;
  const value = typeof userEdit === "string" ? userEdit : null;
  await updateLanderSectionEdit(id, value);
  revalidatePath(`/landers/${landerId}`);
}

export async function clearSectionEditAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("sectionId");
  const landerId = formData.get("landerId");
  if (typeof id !== "string" || typeof landerId !== "string") return;
  await updateLanderSectionEdit(id, null);
  revalidatePath(`/landers/${landerId}`);
}

/** Hard delete an entire lander. Cascades through LanderSection and
 *  LanderStaticLink via Prisma onDelete rules, removes the stitched
 *  HTML + meta.json from disk, and sends the user back to the list. */
export async function deleteLanderAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const lander = await db.lander.findUnique({ where: { id } });
  if (lander) {
    // Wipe the stitched output folder (best-effort).
    const outputDir = path.join(paths.root, lander.outputDir);
    await rm(outputDir, { recursive: true, force: true }).catch(() => {});
    await db.lander.delete({ where: { id } });
  }

  revalidatePath("/landers");
  redirect("/landers");
}

/** Detach a single approved static from a lander. Removes the join row
 *  so the agents no longer see the image in subsequent regens. */
export async function detachStaticFromLanderAction(
  formData: FormData,
): Promise<void> {
  const linkId = formData.get("linkId");
  const landerId = formData.get("landerId");
  if (typeof linkId !== "string" || typeof landerId !== "string") return;

  await db.landerStaticLink.delete({ where: { id: linkId } });
  revalidatePath(`/landers/${landerId}`);
}
