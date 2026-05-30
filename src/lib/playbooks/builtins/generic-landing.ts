import type { PlaybookDefinition } from "../types";
import {
  SECTION_HARD_RULES,
  UNIVERSAL_BANNED_WORDS,
  UNIVERSAL_STYLE_GUIDE,
} from "./_shared";

// Migrated from the M5 hardcoded agents. Preserves the exact shape Landing
// Forge shipped with, now expressed as a data-driven playbook.

export const genericLandingPlaybook: PlaybookDefinition = {
  slug: "generic-landing",
  name: "Generic Landing Page",
  type: "generic",
  description:
    "The original Landing Forge shape — hero, features, social proof, pricing, FAQ, CTA. Uses Tailwind via CDN and works for most product types. A good default when you don't know which playbook fits.",
  intake: [],
  sections: [
    {
      id: "hero",
      label: "Hero",
      systemPrompt: `You are the hero-section agent for a landing-page generator.
${SECTION_HARD_RULES}`,
      directive: `## Your job: Hero section

Write the hero with:
- One headline (≤ 8 words) specific to THIS product
- One subhead (≤ 20 words) grounded in the description
- One primary CTA button (≤ 3 words)
- If a product image is available in the list above, reference it via <img src="…">. If not, use a CSS gradient background.

Output exactly one <section class="lf-hero"> element. Nothing else.`,
    },
    {
      id: "features",
      label: "Features",
      systemPrompt: `You are the features-section agent for a landing-page generator.
${SECTION_HARD_RULES}`,
      directive: `## Your job: Features section

Write 3–6 feature cards. For each card:
- A short icon hint (emoji or inline SVG)
- A title (≤ 6 words)
- A single body sentence grounded in the product description

Every feature must be something the product actually does or has, not a generic benefit. Name specific materials, parts, capabilities.

Output exactly one <section class="lf-features"> element containing all cards.`,
    },
    {
      id: "social-proof",
      label: "Social proof",
      systemPrompt: `You are the social-proof agent for a landing-page generator.
${SECTION_HARD_RULES}`,
      directive: `## Your job: Social proof

Write 2–3 testimonial quotes. If the product has real testimonials referenced in the Links field, quote them verbatim and attribute accordingly. Otherwise, write plausible EXAMPLE quotes attributed to "[Name], [Role]" that match the target audience, and mark each example with data-example="true" on its wrapper.

Voice must match the product's tone. Length: 1–2 sentences each.

Output exactly one <section class="lf-social-proof"> element.`,
    },
    {
      id: "pricing",
      label: "Pricing",
      systemPrompt: `You are the pricing-section agent for a landing-page generator.
${SECTION_HARD_RULES}`,
      directive: `## Your job: Pricing section

If the product has a single price (Price field), create a one-tier CTA card. If multiple tiers are clearly inferable from the description, create a comparison table. Never invent pricing tiers that don't exist.

Include a primary CTA button. Price strings should appear exactly as provided.

Output exactly one <section class="lf-pricing"> element.`,
    },
    {
      id: "faq",
      label: "FAQ",
      systemPrompt: `You are the FAQ-section agent for a landing-page generator.
${SECTION_HARD_RULES}`,
      directive: `## Your job: FAQ section

Write 5–8 questions the target audience would actually ask. No "What is X?" — real objections: sizing, compatibility, durability, shipping, return policy, comparisons with alternatives. Answers should be direct and concrete.

Structure as <details><summary>Q</summary><p>A</p></details> items (native HTML disclosure, no JS).

Output exactly one <section class="lf-faq"> element.`,
    },
    {
      id: "cta",
      label: "Final CTA",
      systemPrompt: `You are the final-CTA agent for a landing-page generator.
${SECTION_HARD_RULES}`,
      directive: `## Your job: Final CTA

One headline (≤ 10 words) + one button. Match the tone of voice strictly. This is the last thing the reader sees — land the promise hard.

Output exactly one <section class="lf-final-cta"> element.`,
    },
  ],
  presets: [
    {
      id: "minimal",
      name: "Minimal",
      description: "Clean type, lots of whitespace, zinc neutrals.",
      palette: {
        bg: "#fafafa",
        fg: "#18181b",
        primary: "#18181b",
        secondary: "#71717a",
        accent: "#f59e0b",
      },
      fontPair: { heading: "system-ui", body: "system-ui" },
      radius: "sm",
      density: "airy",
    },
    {
      id: "bold",
      name: "Bold",
      description: "Strong color, big headlines, high contrast.",
      palette: {
        bg: "#0a0a0a",
        fg: "#fafafa",
        primary: "#f59e0b",
        secondary: "#78350f",
        accent: "#fef3c7",
      },
      fontPair: { heading: "system-ui", body: "system-ui" },
      radius: "lg",
      density: "normal",
    },
    {
      id: "editorial",
      name: "Editorial",
      description: "Serif heading, warm neutrals, airy spacing.",
      palette: {
        bg: "#F5F0EB",
        fg: "#2B2320",
        primary: "#5C4033",
        secondary: "#A0826D",
        accent: "#D69E2E",
      },
      fontPair: { heading: "Georgia", body: "system-ui" },
      radius: "sm",
      density: "airy",
    },
    {
      id: "saas",
      name: "SaaS",
      description: "Blue-gray palette, classic product-marketing shape.",
      palette: {
        bg: "#ffffff",
        fg: "#0f172a",
        primary: "#2563eb",
        secondary: "#64748b",
        accent: "#0ea5e9",
      },
      fontPair: { heading: "system-ui", body: "system-ui" },
      radius: "md",
      density: "normal",
    },
  ],
  stitcher: {
    layout: "tailwind-cdn",
    maxWidth: 1200,
    dropshipPack: false,
  },
  copyRules: {
    bannedWords: UNIVERSAL_BANNED_WORDS,
    styleGuide: UNIVERSAL_STYLE_GUIDE,
    executionDirective:
      "Write specific, concrete copy grounded in the product fields. Every claim must be supported by something in the product context.",
  },
  imageGen: [],
};
