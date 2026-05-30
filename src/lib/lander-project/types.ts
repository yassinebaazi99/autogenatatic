// Constants + labels for the Lander Project Files feature.
// These three lander types + three slots define the entire workspace
// matrix every brand has — 9 "cells", each holding 1..N files.

export const LANDER_TYPES = ["advertorial", "listicle", "quiz"] as const;
export type LanderType = (typeof LANDER_TYPES)[number];

export const LANDER_TYPE_LABELS: Record<LanderType, string> = {
  advertorial: "Advertorial",
  listicle: "Listicle",
  quiz: "Quiz Funnel",
};

export const LANDER_TYPE_BLURBS: Record<LanderType, string> = {
  advertorial:
    "Magazine-style presell page. Reads like an article, structured as direct response. Best for supplements, skincare, health, or anything with a mechanism story.",
  listicle:
    "Ranked list of N options with the brand's pick as the winner. Best for product comparisons, review-style funnels, or 'best X for Y' angles.",
  quiz:
    "Multi-step quiz that funnels the reader to a personalized recommendation. Best for skincare, supplements, apparel sizing, or any product with configurable use cases.",
};

export const LANDER_PROJECT_SLOTS = [
  "visualInspo",
  "copyGuidelines",
  "overallInstructions",
] as const;
export type LanderProjectSlot = (typeof LANDER_PROJECT_SLOTS)[number];

export const LANDER_PROJECT_SLOT_LABELS: Record<LanderProjectSlot, string> = {
  visualInspo: "Visual inspo",
  copyGuidelines: "Copy guidelines",
  overallInstructions: "Overall instructions",
};

export const LANDER_PROJECT_SLOT_HINTS: Record<LanderProjectSlot, string> = {
  visualInspo:
    "Reference landers to emulate — screenshots, PDFs, or live-page snapshots. Fed to the Lander runner as visual anchors.",
  copyGuidelines:
    "Tone rules, section-level structure, angle guidelines, headline patterns, forbidden phrases. Anything a copywriter would keep on a desk.",
  overallInstructions:
    "Build logic, priority, must-haves and must-avoids. The 'here's what we care about' brief.",
};

/**
 * Which mime types are allowed in each slot. `visualInspo` accepts images
 * (PNG / JPG / WEBP) so users can upload reference screenshots directly,
 * plus PDFs for full-page captures. The other two slots are doc-only since
 * there's nothing for the runner to do with an image of guidelines.
 */
export const LANDER_PROJECT_SLOT_MIME_CONFIG: Record<
  LanderProjectSlot,
  {
    accept: string; // <input accept> attribute value
    kinds: Array<"image" | "doc">;
  }
> = {
  visualInspo: {
    accept:
      ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf",
    kinds: ["image", "doc"],
  },
  copyGuidelines: {
    accept:
      ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain",
    kinds: ["doc"],
  },
  overallInstructions: {
    accept:
      ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain",
    kinds: ["doc"],
  },
};

export function isLanderType(v: string): v is LanderType {
  return (LANDER_TYPES as readonly string[]).includes(v);
}

export function isLanderProjectSlot(v: string): v is LanderProjectSlot {
  return (LANDER_PROJECT_SLOTS as readonly string[]).includes(v);
}
