"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { db } from "@/lib/db";
import { paths } from "@/lib/paths";
import { regenerateStaticAd } from "@/lib/static-gen/runner";
import {
  isImageRole,
  isStaticAdStatus,
} from "@/lib/static-gen/status";

// Review-time server actions on individual StaticAd rows. The UI only
// surfaces draft/approved/archived now — legacy live/paused values are
// normalized on read.

export async function setStaticAdStatusAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || typeof status !== "string") return;
  if (!isStaticAdStatus(status)) return;

  await db.staticAd.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/statics/review");
  revalidatePath("/statics");
}

export async function setImageRoleAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const role = formData.get("role");
  if (typeof id !== "string" || typeof role !== "string") return;
  // Empty string means "unset" — clears the role.
  const value = role.trim().length === 0 || role === "_none"
    ? null
    : isImageRole(role)
      ? role
      : null;
  await db.staticAd.update({
    where: { id },
    data: { role: value },
  });
  revalidatePath("/statics/review");
  revalidatePath("/statics");
}

export async function regenerateStaticAdAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("id");
  const note = formData.get("note");
  if (typeof id !== "string") return;

  const trimmed =
    typeof note === "string" && note.trim().length > 0 ? note.trim() : null;

  await db.staticAd.update({
    where: { id },
    data: {
      url: "",
      claudePrompt: "",
      error: null,
      regenNote: trimmed,
      updatedAt: new Date(),
    },
  });

  after(async () => {
    await regenerateStaticAd(id, trimmed);
  });

  revalidatePath("/statics/review");
  revalidatePath(`/statics/${id}`);
}

export async function discardStaticAdAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await db.staticAd.update({
    where: { id },
    data: { status: "archived" },
  });
  revalidatePath("/statics/review");
  revalidatePath("/statics");
}

/** Hard delete: removes the DB row and the PNG file from disk. Use
 *  this when Archive isn't enough — e.g. cleaning up failed or
 *  unused generated images. Cascades through LanderStaticLink so any
 *  lander using this static loses the visual anchor automatically. */
export async function hardDeleteStaticAdAction(
  formData: FormData,
): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const row = await db.staticAd.findUnique({ where: { id } });
  if (!row) return;

  // Try to remove the file — don't throw if it's already gone.
  if (row.url) {
    const relative = row.url.replace(/^\//, "");
    const diskPath = path.join(paths.root, "public", relative);
    await unlink(diskPath).catch(() => {
      console.warn(`[static hard delete] missing file: ${diskPath}`);
    });
  }

  await db.staticAd.delete({ where: { id } });
  revalidatePath("/statics");
  revalidatePath("/statics/review");
}
