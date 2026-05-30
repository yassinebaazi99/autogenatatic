"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { db } from "@/lib/db";
import { regenerateSingleSection } from "@/lib/playbooks/runner";

/**
 * Re-runs one section agent (keeping the other outputs intact) and rewrites
 * index.html. Fired from the Re-run form on /pages/[slug].
 */
export async function regenerateSectionAction(formData: FormData) {
  const landingPageId = formData.get("landingPageId");
  const section = formData.get("section");
  if (
    typeof landingPageId !== "string" ||
    typeof section !== "string" ||
    !landingPageId ||
    !section
  ) {
    return;
  }

  const run = await db.agentRun.findFirst({
    where: { landingPageId, section },
  });
  if (!run) return;

  await db.agentRun.update({
    where: { id: run.id },
    data: {
      status: "pending",
      output: null,
      error: null,
      finishedAt: null,
    },
  });

  const page = await db.landingPage.findUnique({
    where: { id: landingPageId },
    select: { slug: true },
  });
  if (page) {
    revalidatePath(`/pages/${page.slug}`);
  }

  after(async () => {
    await regenerateSingleSection(landingPageId, section);
  });
}
