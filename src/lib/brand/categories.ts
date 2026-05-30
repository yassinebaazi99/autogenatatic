// Soft enum of brand-doc categories. The runner uses these to order and
// label the Brand Context block injected into every agent prompt, so the
// order of BRAND_DOC_CATEGORIES matters — more foundational context first.

export const BRAND_DOC_CATEGORIES = [
  "brand",
  "product",
  "mechanism",
  "avatars",
  "voice",
  "competitors",
] as const;

export type BrandDocCategory = (typeof BRAND_DOC_CATEGORIES)[number];

export const BRAND_DOC_CATEGORY_LABELS: Record<BrandDocCategory, string> = {
  brand: "Brand",
  product: "Product",
  mechanism: "Mechanism",
  avatars: "Customer Avatars",
  voice: "Voice & Tone",
  competitors: "Competitors",
};

export const BRAND_DOC_CATEGORY_HINTS: Record<BrandDocCategory, string> = {
  brand: "Mission, positioning, origin story, style guide.",
  product: "SKUs, ingredients, specs, claims, USPs.",
  mechanism: "The 'why it works' story — the angle that makes the product different.",
  avatars: "Who the customer is — pain points, desires, objections.",
  voice: "Tone rules, banned words, example sentences in the brand voice.",
  competitors: "Who else is in the market and how this brand is different.",
};

export function isBrandDocCategory(value: string): value is BrandDocCategory {
  return (BRAND_DOC_CATEGORIES as readonly string[]).includes(value);
}
