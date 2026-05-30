import "server-only";

import { db } from "../db";
import {
  IMAGE_ROLE_LABELS,
  type ImageRole,
} from "../static-gen/status";

// Builds the "approved images attached to this lander" prompt block. Every
// lander section agent sees this alongside the Brand Knowledge Base and
// Lander Project Files context, so agents can pull real image URLs into
// their section output — keyed by the semantic role the user tagged the
// image with (hero / product / lifestyle / proof / comparison).

export async function buildApprovedStaticsContext(
  landerId: string,
): Promise<string> {
  const links = await db.landerStaticLink.findMany({
    where: { landerId },
    include: { staticAd: true },
    orderBy: { createdAt: "asc" },
  });
  if (links.length === 0) return "";

  // Group by role so the prompt is organized the way an agent thinks
  // about sections — "what's my hero image? what's my product shot?"
  const byRole = new Map<ImageRole | "_unassigned", typeof links>();
  for (const link of links) {
    const role = (link.staticAd.role as ImageRole | null) ?? "_unassigned";
    const key = role;
    const list = byRole.get(key) ?? [];
    list.push(link);
    byRole.set(key, list);
  }

  const sections: string[] = [];
  const order: Array<ImageRole | "_unassigned"> = [
    "hero",
    "product",
    "lifestyle",
    "proof",
    "comparison",
    "_unassigned",
  ];

  for (const role of order) {
    const list = byRole.get(role) ?? [];
    if (list.length === 0) continue;

    const label =
      role === "_unassigned"
        ? "Unassigned images"
        : IMAGE_ROLE_LABELS[role as ImageRole];

    const items = list
      .map((link, i) => {
        const s = link.staticAd;
        const promptSnippet =
          s.claudePrompt.length > 300
            ? s.claudePrompt.slice(0, 300).trimEnd() + "…"
            : s.claudePrompt;
        return `${i + 1}. URL: ${s.url}\n   Visual: ${promptSnippet}`;
      })
      .join("\n\n");

    sections.push(`## ${label}\n${items}`);
  }

  return `# Approved images attached to this lander

The user has tagged these generated images with semantic roles so you
know which goes where. Use the real URLs below verbatim — do not invent
image paths or pull from a stock library. If a section calls for a
product shot, look under "Product". If it calls for a hero, use the
"Hero" image. Never blend multiple roles into one <img> tag.

${sections.join("\n\n")}`;
}
