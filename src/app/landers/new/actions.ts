"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import { isLanderType } from "@/lib/lander-project/types";
import {
  createLanderJob,
  runLanderJob,
  type WizardNotes,
} from "@/lib/landers/runner";
import { getLanderTemplate } from "@/lib/landers/templates";

// Server action shared by /landers/new and /studio/new. Parses the form,
// creates the Lander + Job + sections + static links, then fires
// runLanderJob via after() and redirects to /landers/[id] where the live
// editor polls until done.
//
// Accepts two "dynamic" additions:
//   - enabledSectionIds  — comma-joined whitelist, empty string means "all"
//   - wizard notes       — one optional textarea per step, serialized as
//                           `note_<step>` fields

export type NewLanderState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function submitNewLanderAction(
  _prev: NewLanderState,
  formData: FormData,
): Promise<NewLanderState> {
  const landerType = (formData.get("landerType") ?? "").toString();
  const presetId = (formData.get("presetId") ?? "").toString();
  const title = (formData.get("title") ?? "").toString().trim();
  const staticAdIdsRaw = (formData.get("staticAdIds") ?? "").toString();
  const enabledSectionIdsRaw = (
    formData.get("enabledSectionIds") ?? ""
  ).toString();
  const headlineOverride = (formData.get("headlineOverride") ?? "")
    .toString()
    .trim();

  if (!isLanderType(landerType)) {
    return { status: "error", message: "Pick a lander type" };
  }

  const template = getLanderTemplate(landerType);
  if (!presetId || !template.presets.some((p) => p.id === presetId)) {
    return { status: "error", message: "Pick a preset" };
  }

  // Collect intake answers by reading every template.intake field off the
  // form. Unknown keys are ignored; missing required fields don't block
  // generation — agents will fall back to brand context.
  const intake: Record<string, string> = {};
  for (const field of template.intake) {
    const raw = formData.get(`intake_${field.id}`);
    if (typeof raw === "string" && raw.trim().length > 0) {
      intake[field.id] = raw.trim();
    }
  }

  const staticAdIds = staticAdIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Empty string = no whitelist = run every template section.
  const enabledSectionIds = enabledSectionIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Read every wizard-step note. Empty notes get dropped.
  const wizardNotes: WizardNotes = {};
  const noteFields: Array<[keyof WizardNotes, string]> = [
    ["typeNote", "note_type"],
    ["styleNote", "note_style"],
    ["anchorsNote", "note_anchors"],
    ["detailsNote", "note_details"],
    ["finalNote", "note_final"],
  ];
  for (const [key, formKey] of noteFields) {
    const raw = formData.get(formKey);
    if (typeof raw === "string" && raw.trim().length > 0) {
      wizardNotes[key] = raw.trim();
    }
  }

  let created: { landerId: string; jobId: string; slug: string };
  try {
    created = await createLanderJob({
      landerType,
      presetId,
      title,
      intake,
      staticAdIds,
      enabledSectionIds:
        enabledSectionIds.length > 0 ? enabledSectionIds : undefined,
      wizardNotes: Object.keys(wizardNotes).length > 0 ? wizardNotes : undefined,
      headlineOverride: headlineOverride || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", message };
  }

  after(async () => {
    await runLanderJob(created.landerId);
  });

  redirect(`/landers/${created.landerId}`);
}
