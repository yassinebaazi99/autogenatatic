import type { PlaybookDefinition } from "../types";
import {
  SECTION_HARD_RULES,
  UNIVERSAL_BANNED_WORDS,
  UNIVERSAL_STYLE_GUIDE,
} from "./_shared";

// Multi-product listicle where position #1 is the featured product and
// positions #2–N are weaker competitors positioned as straw-men. This is the
// dropshipping convention: "We tested 5 X for Y, here's what we found."

const LISTICLE_HARD_RULES = `${SECTION_HARD_RULES}

LISTICLE VOICE:
- You are a curious reviewer who tested a category. Be specific, slightly skeptical, then won over by the winner.
- Ranking-authority voice: "we tested", "after comparing", "the difference was clear".
- Real numbers for every claim. Specific use cases for each item.`;

export const listiclePlaybook: PlaybookDefinition = {
  slug: "listicle",
  name: "Product Listicle",
  type: "listicle",
  description:
    "A ranked comparison of products in a category, where position #1 is the featured product. The reader feels they're reading an impartial review and happens to be nudged toward your winner. Works great for dropshipping — less salesy than a direct advertorial.",
  intake: [
    {
      id: "category",
      label: "Category being reviewed",
      type: "text",
      placeholder: "Pour-over kettles / Standing desks / Bluetooth earbuds under $100",
      required: true,
      hint: "What bucket does your product sit in? The listicle will 'compare the market' in this category.",
    },
    {
      id: "item_count",
      label: "Number of items in the list",
      type: "select",
      options: ["3", "5", "7"],
      required: true,
      hint: "5 is the sweet spot. 3 feels too short, 7+ feels padded.",
    },
    {
      id: "winner_angle",
      label: "Why your product ranks #1",
      type: "textarea",
      placeholder:
        "It's the only one with a ceramic spout at this price, stays hot 40% longer than the others",
      required: true,
      hint: "The unfair advantage that makes your product the obvious winner. Use concrete, measurable claims.",
    },
    {
      id: "competitor_weaknesses",
      label: "Where the competitors fall short",
      type: "textarea",
      placeholder:
        "Most have stainless steel spouts that corrode over time. Handles get too hot. Cheap ones leak.",
      required: false,
      hint: "Specific flaws the competitors have. Don't name real brands — the agent will invent plausible ones.",
    },
  ],
  sections: [
    {
      id: "intro",
      label: "Intro — the problem worth solving",
      systemPrompt: LISTICLE_HARD_RULES,
      directive: `## Your job: Intro paragraph

2–3 short paragraphs. Establish why the reader is here: they're shopping in this category and want to make a smart decision. Hint at the variety of options and why most people pick the wrong one. No product names yet.

Output: <section class="lf-intro"><h1>…</h1><p>…</p><p>…</p></section>.`,
      maxTokens: 900,
    },
    {
      id: "methodology",
      label: "Methodology — how we tested",
      systemPrompt: LISTICLE_HARD_RULES,
      directive: `## Your job: Testing methodology

A short section explaining HOW the ranking was done. Be specific: how many units tested, how long, what criteria. Examples:
- "We tested 12 units over 6 weeks"
- "Criteria: build quality, value, durability, real-world use"
- "We bought everything at retail price — nothing was sent to us"

This builds credibility. Keep it to 3–5 bullet points + one intro sentence.

Output: <section class="lf-methodology"><h2>How we tested</h2><p>…</p><ul>…</ul></section>.`,
      maxTokens: 700,
    },
    {
      id: "winner-card",
      label: "#1 — the featured product (your product)",
      systemPrompt: LISTICLE_HARD_RULES,
      directive: `## Your job: #1 ranked card — the featured product

This is where the user's actual product goes. Make it the clear winner. Structure:
- Rank badge: "#1 OVERALL WINNER"
- Product image
- Product name (from the Product fields above)
- Star rating based on proof
- 2-sentence summary of why it won, grounded in the winner_angle intake field
- Pros list (4–6 specific items)
- Cons list (1–2 minor honest nitpicks — this makes the review feel real; don't fake-praise by listing zero cons)
- "Best for: …" one-liner
- Price
- Primary CTA button: "See Current Price" or "Check Availability"

Use the winner_angle intake for the unique advantages. Reference the product's actual fields.

Output: <section class="lf-item lf-item-winner" data-rank="1"><div>…</div></section>.`,
      maxTokens: 1800,
    },
    {
      id: "runner-ups",
      label: "#2–N — the competitors",
      systemPrompt: LISTICLE_HARD_RULES,
      directive: `## Your job: All remaining items in the list (ranks 2 through N)

Based on item_count (3/5/7), produce the remaining items (N-1 of them). For each:
- Rank badge: "#2", "#3", …
- Placeholder image (use a gradient block — these are fake competitors)
- An invented but plausible product name. NEVER use real brand names. Invent neutral names like "HarborHouse Classic", "MerridianCo Original", "Northfield Select".
- Star rating (lower than winner's — 3.8, 3.5, 3.2 descending)
- 2-sentence summary with a SPECIFIC flaw tied to the competitor_weaknesses intake if provided
- Pros (2–3 genuine items — these aren't bad products, just not the winner)
- Cons (3–5 specific items that make the winner look better)
- "Best for: …" (a narrower use case than the winner)
- Price (similar range to the winner so price isn't the reason it lost)
- CTA button that's muted / less prominent than the winner's

Output all items in ONE section: <section class="lf-items-runner-ups"><div class="lf-item" data-rank="2">…</div><div class="lf-item" data-rank="3">…</div>…</section>.`,
      maxTokens: 4500,
    },
    {
      id: "comparison-table",
      label: "Comparison table",
      systemPrompt: LISTICLE_HARD_RULES,
      directive: `## Your job: Head-to-head comparison table

A table with items as rows and criteria as columns. Criteria: Rank, Star Rating, Key Feature, Main Flaw, Price, Best For. Winner's row should visually stand out (e.g., a row class that the stitcher will color).

Output: <section class="lf-comparison"><table>…</table></section>.`,
      maxTokens: 900,
    },
    {
      id: "final-recommendation",
      label: "Final recommendation",
      systemPrompt: LISTICLE_HARD_RULES,
      directive: `## Your job: Final recommendation

2–3 paragraphs that restate the verdict. Acknowledge the other items have their uses, but explain clearly why the winner is the pick for most people. End with a direct recommendation to the featured product with a CTA link.

Output: <section class="lf-final-rec"><h2>Our verdict</h2><p>…</p><p>…</p><a class="lf-cta-btn">…</a></section>.`,
      maxTokens: 900,
    },
    {
      id: "faq",
      label: "FAQ",
      systemPrompt: LISTICLE_HARD_RULES,
      directive: `## Your job: FAQ — 4–6 questions

Questions a shopper would genuinely ask AFTER reading a listicle in this category. Cover: "What if I just buy #2?", "Is it worth the price?", "How long will it last?", "Returns?", "Where to buy?".

Use <details><summary>…</summary><p>…</p></details> for native disclosure.

Output: <section class="lf-faq"><h2>Questions shoppers ask</h2>…</section>.`,
      maxTokens: 1200,
    },
    {
      id: "sticky-cta",
      label: "Sticky mobile CTA",
      systemPrompt: LISTICLE_HARD_RULES,
      directive: `## Your job: Sticky bottom CTA bar for mobile

One line with a short action headline + button. Examples:
- "#1 pick is selling fast" + button "Check Price →"
- "Our top choice" + button "Get [Product] →"

Output: <section class="lf-sticky-cta"><p>…</p><a class="lf-cta-btn">…</a></section>. The stitcher pins it to the bottom of the viewport on small screens.`,
      maxTokens: 300,
    },
  ],
  presets: [
    {
      id: "clean-review",
      name: "Clean Review Site",
      description: "Wirecutter-style. Neutral, authoritative, lots of whitespace.",
      palette: {
        bg: "#ffffff",
        fg: "#1a1a1a",
        primary: "#2563eb",
        secondary: "#475569",
        accent: "#16a34a",
        muted: "#f8fafc",
      },
      fontPair: { heading: "Merriweather", body: "system-ui" },
      radius: "sm",
      density: "airy",
    },
    {
      id: "affiliate-bright",
      name: "Affiliate Bright",
      description: "High-traffic affiliate review site. Punchy color, bold ranking badges.",
      palette: {
        bg: "#fffbeb",
        fg: "#1c1917",
        primary: "#ea580c",
        secondary: "#a16207",
        accent: "#16a34a",
        muted: "#fef3c7",
      },
      fontPair: { heading: "Poppins", body: "system-ui" },
      radius: "md",
      density: "normal",
    },
    {
      id: "minimalist-editorial",
      name: "Minimalist Editorial",
      description: "Serif, muted palette, feels curated like The Strategist.",
      palette: {
        bg: "#fafaf9",
        fg: "#1c1917",
        primary: "#0f172a",
        secondary: "#78716c",
        accent: "#b45309",
        muted: "#f5f5f4",
      },
      fontPair: { heading: "Playfair Display", body: "Lora" },
      radius: "none",
      density: "airy",
    },
  ],
  stitcher: {
    layout: "inline-css-narrow",
    maxWidth: 760,
    googleFontHeading: "Merriweather",
    googleFontBody: "Inter",
    dropshipPack: true,
  },
  copyRules: {
    bannedWords: UNIVERSAL_BANNED_WORDS,
    styleGuide: UNIVERSAL_STYLE_GUIDE,
    executionDirective:
      "You are writing for a reader who is actively shopping. They want to feel like they did their homework by reading this list. Your job is to give them enough evidence to feel confident about picking the #1 item. Don't hype — inform. The ranking does the selling.",
  },
  imageGen: [
    {
      id: "hero-category",
      purpose: "Category hero — products laid out for comparison",
      promptTemplate:
        "Flat-lay photograph of multiple {{category}} arranged neatly on a neutral surface, editorial review-site style, soft even lighting",
      aspectRatio: "16:9",
    },
  ],
};
