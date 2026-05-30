import "server-only";

import { db } from "../db";
import {
  type LanderProjectSlot,
  type LanderType,
  LANDER_PROJECT_SLOTS,
  LANDER_PROJECT_SLOT_LABELS,
} from "./types";

// buildLanderProjectContext(landerType) returns the prompt block that gets
// injected into every LanderSection agent call, alongside the Brand
// Knowledge Base block from buildBrandContext().
//
// Doc slots contribute their extracted text. Image slots contribute a
// URL manifest — the Phase 5 runner will pass those URLs as vision inputs
// to each agent so they can visually ground their section against the
// reference landers. (For the first pass, the URL list lands as text.)

const PER_DOC_CHAR_LIMIT = 5000;

export async function buildLanderProjectContext(
  landerType: LanderType,
): Promise<string> {
  const brand = await db.brand.findFirst({ orderBy: { createdAt: "asc" } });
  if (!brand) return "";

  const files = await db.landerProjectFile.findMany({
    where: { brandId: brand.id, landerType },
    orderBy: [{ slot: "asc" }, { createdAt: "asc" }],
  });
  if (files.length === 0) return "";

  const bySlot = new Map<LanderProjectSlot, typeof files>();
  for (const slot of LANDER_PROJECT_SLOTS) bySlot.set(slot, []);
  for (const file of files) {
    const list = bySlot.get(file.slot as LanderProjectSlot);
    if (list) list.push(file);
  }

  const sections: string[] = [];

  for (const slot of LANDER_PROJECT_SLOTS) {
    const slotFiles = bySlot.get(slot) ?? [];
    if (slotFiles.length === 0) continue;

    const label = LANDER_PROJECT_SLOT_LABELS[slot];

    // Images in this slot (visualInspo only, in practice) land as a URL
    // manifest. Docs land as truncated prose with explicit truncation
    // markers so agents know they're seeing a slice.
    const parts: string[] = [];

    const imageFiles = slotFiles.filter((f) => f.url);
    if (imageFiles.length > 0) {
      parts.push(
        `### Reference images (${imageFiles.length})\n` +
          imageFiles
            .map((f) => `- ${f.originalFilename} — ${f.url}`)
            .join("\n"),
      );
    }

    const docFiles = slotFiles.filter((f) => f.content);
    for (const doc of docFiles) {
      const text = (doc.content ?? "").trim();
      const truncated = text.length > PER_DOC_CHAR_LIMIT;
      const snippet = truncated
        ? text.slice(0, PER_DOC_CHAR_LIMIT).trimEnd() +
          `\n[… truncated — ${text.length - PER_DOC_CHAR_LIMIT} chars omitted]`
        : text;
      parts.push(`### ${doc.originalFilename}\n${snippet}`);
    }

    sections.push(`## ${label}\n${parts.join("\n\n")}`);
  }

  if (sections.length === 0) return "";

  return `# Lander Project Files (${landerType})

These files are the workspace for THIS lander type specifically — visual
references, copy rules, and build instructions. They override generic
defaults but not the Brand Knowledge Base above. Pull specific headlines,
phrases, section patterns, and must-haves from here.

${sections.join("\n\n")}`;
}
