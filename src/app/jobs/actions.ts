"use server";

import { rm } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { paths } from "@/lib/paths";

// Hard delete for a Job. Cascades through every child row via Prisma
// onDelete rules (StaticAd, StaticGenPromptHistory, Lander — the latter
// sets jobId to null via SetNull). Also removes any stitched lander
// output folders that hung off this job.
export async function deleteJobAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const job = await db.job.findUnique({
    where: { id },
    include: {
      landers: { select: { outputDir: true } },
      staticAds: { select: { url: true } },
    },
  });
  if (!job) return;

  // Best-effort file cleanup — the DB delete doesn't touch disk.
  for (const lander of job.landers) {
    const dir = path.join(paths.root, lander.outputDir);
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  for (const s of job.staticAds) {
    if (!s.url) continue;
    const rel = s.url.replace(/^\//, "");
    const diskPath = path.join(paths.root, "public", rel);
    await rm(diskPath, { force: true }).catch(() => {});
  }

  await db.job.delete({ where: { id } });
  revalidatePath("/jobs");
  revalidatePath("/landers");
  revalidatePath("/statics");
}
