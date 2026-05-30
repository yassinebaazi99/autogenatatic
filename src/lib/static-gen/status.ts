// Status + role vocabulary for generated images (the rows in StaticAd).
//
// Corrected mental model (2026-04-11): these are NOT paid-social ads —
// they're image assets that go INTO a landing page. "Approved" means
// "ready to drop into a lander section". We keep `StaticAd` as the model
// name for backwards compat with existing DB rows, but the user-facing
// language everywhere is "image".

// Public status vocabulary. Legacy "live"/"paused"/"discarded" values
// still exist on old rows but are hidden from the new UI — the helpers
// below normalize them.
export const STATIC_AD_STATUSES = [
  "draft",
  "approved",
  "archived",
] as const;

export type StaticAdStatus = (typeof STATIC_AD_STATUSES)[number];

export const STATIC_AD_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Ready",
  archived: "Archived",
  // Legacy values — map to something sensible.
  live: "Ready",
  paused: "Ready",
  discarded: "Archived",
};

export function normalizeStatus(value: string): StaticAdStatus {
  if (value === "draft") return "draft";
  if (value === "approved" || value === "live" || value === "paused") {
    return "approved";
  }
  return "archived";
}

export function isStaticAdStatus(v: string): v is StaticAdStatus {
  return (STATIC_AD_STATUSES as readonly string[]).includes(v);
}

/** A static is "in progress" (no prompt written yet) when claudePrompt is empty. */
export function isGenerating(staticAd: {
  claudePrompt: string;
  error: string | null;
}): boolean {
  return !staticAd.error && staticAd.claudePrompt === "";
}

// ---------- Image roles ------------------------------------------------

// Semantic roles an image can play inside a landing page. These drive
// per-section image selection in the lander runner — the advertorial
// hero section asks for a "hero" image, ingredient cards look for
// "product" or "lifestyle", proof sections look for "proof", etc.

export const IMAGE_ROLES = [
  "hero",
  "product",
  "lifestyle",
  "proof",
  "comparison",
] as const;

export type ImageRole = (typeof IMAGE_ROLES)[number];

export const IMAGE_ROLE_LABELS: Record<ImageRole, string> = {
  hero: "Hero",
  product: "Product",
  lifestyle: "Lifestyle",
  proof: "Proof / testimonial",
  comparison: "Comparison",
};

export const IMAGE_ROLE_HINTS: Record<ImageRole, string> = {
  hero: "Top-of-page attention grabber — big, cinematic, works with a headline overlay.",
  product: "Clean product-on-background shots for reveal or comparison sections.",
  lifestyle: "Product in real-world use — hands, kitchens, gyms, faces.",
  proof: "Before/after, testimonial-style, result visuals.",
  comparison: "Side-by-side, callout, 'us vs them' layouts.",
};

export function isImageRole(v: string): v is ImageRole {
  return (IMAGE_ROLES as readonly string[]).includes(v);
}
