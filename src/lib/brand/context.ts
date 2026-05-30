import "server-only";

import { db } from "../db";
import { BRAND_DOC_CATEGORIES, BRAND_DOC_CATEGORY_LABELS } from "./categories";

/**
 * Build the Brand Context prompt block injected into every agent's user
 * prompt. Returns an empty string if no brand or no docs exist — the runner
 * renders nothing in that case so old code paths keep working.
 *
 * The block is organized by category in BRAND_DOC_CATEGORIES order so the
 * most foundational context (brand → product → mechanism) lands above the
 * supporting material (avatars → voice → competitors). Each doc is capped
 * at ~4000 chars to keep total prompt size sane even if the user uploaded
 * a 200-page PDF. Truncation is signalled explicitly so agents know.
 */

const PER_DOC_CHAR_LIMIT = 4000;

export async function buildBrandContext(): Promise<string> {
  const brand = await db.brand.findFirst({
    orderBy: { createdAt: "asc" },
    include: { docs: { orderBy: { createdAt: "asc" } } },
  });
  if (!brand || brand.docs.length === 0) return "";

  const sections: string[] = [];

  if (brand.name || brand.description) {
    const header = [
      brand.name ? `Brand name: ${brand.name}` : null,
      brand.description ? `Summary: ${brand.description}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(header);
  }

  // Group docs by category, preserving the BRAND_DOC_CATEGORIES ordering.
  for (const category of BRAND_DOC_CATEGORIES) {
    const docsForCategory = brand.docs.filter(
      (d: (typeof brand.docs)[number]) => d.category === category,
    );
    if (docsForCategory.length === 0) continue;

    const label = BRAND_DOC_CATEGORY_LABELS[category];
    const body = docsForCategory
      .map((doc) => {
        const text = doc.extracted.trim();
        const truncated = text.length > PER_DOC_CHAR_LIMIT;
        const snippet = truncated
          ? text.slice(0, PER_DOC_CHAR_LIMIT).trimEnd() +
            `\n[… truncated — ${text.length - PER_DOC_CHAR_LIMIT} chars omitted]`
          : text;
        return `### ${doc.filename}\n${snippet}`;
      })
      .join("\n\n");
    sections.push(`## ${label}\n${body}`);
  }

  if (sections.length === 0) return "";

  return `# Brand Knowledge Base

The following is authoritative context about the brand and product. Treat
everything below as ground truth — it overrides any conflicting detail in
the product intake or section directive. Pull concrete claims, numbers,
names, and voice cues from here before inventing anything.

${sections.join("\n\n")}`;
}
