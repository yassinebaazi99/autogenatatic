"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import {
  createGenerationRows,
  runSwarm,
} from "@/lib/playbooks/runner";

export type GenerateState = {
  ok: boolean;
  message?: string;
};

export async function runGenerateLanding(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const productId = formData.get("productId");
  const playbookId = formData.get("playbookId");
  const presetId = formData.get("presetId");

  if (typeof productId !== "string" || !productId) {
    return { ok: false, message: "Missing productId." };
  }
  if (typeof playbookId !== "string" || !playbookId) {
    return { ok: false, message: "Pick a playbook." };
  }
  if (typeof presetId !== "string" || !presetId) {
    return { ok: false, message: "Pick a preset." };
  }

  // Collect playbook intake fields. They all come in as form keys prefixed
  // with "intake_" so we can tell them apart from productId/playbookId/etc.
  const intake: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("intake_") && typeof value === "string") {
      intake[key.slice("intake_".length)] = value;
    }
  }

  // Optional per-section toggles. Sections with required=true are always on.
  const enabledSectionIds = formData
    .getAll("enabled_sections")
    .filter((s): s is string => typeof s === "string");

  let created;
  try {
    created = await createGenerationRows({
      productId,
      playbookId,
      presetId,
      intake,
      enabledSectionIds:
        enabledSectionIds.length > 0 ? enabledSectionIds : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to start generation: ${message}` };
  }

  // Fire the swarm after the response is sent. after() callbacks run even
  // when redirect() is called.
  after(async () => {
    await runSwarm(created.landingPageId);
  });

  revalidatePath("/pages");
  redirect(`/pages/${created.slug}`);
}
