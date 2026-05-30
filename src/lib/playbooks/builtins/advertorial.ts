import type { PlaybookDefinition } from "../types";
import {
  SECTION_HARD_RULES,
  UNIVERSAL_BANNED_WORDS,
  UNIVERSAL_STYLE_GUIDE,
} from "./_shared";

// From doc/playbooks/advertorial-reference.md — the DTC advertorial spec.
// Structure is load-bearing; don't change order without updating the reference.

const ADVERTORIAL_HARD_RULES = `${SECTION_HARD_RULES}

ADVERTORIAL VOICE:
- Write like a journalist for a health/lifestyle magazine. The reader should feel like they're reading an article.
- Second person ("you") when addressing the reader.
- Include specific numbers: "47,382 women", "in 14 days", "$3.27/day".
- Never use hype adjectives without proof attached.
- The selling happens through the STRUCTURE, not the tone.
- GROUND EVERY CLAIM in the actual product described above. If it's a kettle, never say "wear it". If it's apparel, never say "brew it". Use the product's REAL use case.
- Do not borrow supplement/skincare tropes for unrelated products.`;

const ADVERTORIAL_BANNED = [
  ...UNIVERSAL_BANNED_WORDS,
  // extra marketing slop the advertorial format punishes harder
  "amazing",
  "incredible",
  "life-changing",
  "transform",
  "unlock",
  "discover",
];

export const advertorialPlaybook: PlaybookDefinition = {
  slug: "advertorial",
  name: "DTC Advertorial",
  type: "advertorial",
  description:
    "High-converting presell page that sits between a Meta ad and a product page. Reads like a magazine article, structured as direct response. 17 fixed sections in a proven order. Best for supplements, skincare, health, and any product with a 'mechanism' story.",
  intake: [
    {
      id: "mechanism",
      label: "Mechanism / unique angle",
      type: "textarea",
      placeholder:
        "Lipid-encapsulated vitamin C that stays stable until it reaches the dermal layer",
      required: true,
      hint: "The 'why this works when others don't' story. This is the star of the page — be specific and technical.",
    },
    {
      id: "proof",
      label: "Proof you have",
      type: "textarea",
      placeholder:
        "47,000+ reviews, 4.8 stars, dermatologist-formulated, featured in Allure",
      required: true,
      hint: "Review counts, star ratings, expert endorsements, press mentions, customer counts. The more specific, the better.",
    },
    {
      id: "urgency",
      label: "Real urgency angle",
      type: "text",
      placeholder: "Seasonal sale ends Friday / Limited production batch of 5,000",
      required: false,
      hint: "Tie urgency to something real — a sale, batch, or media feature. 'Limited time' alone reads as fake.",
    },
    {
      id: "author_credentials",
      label: "Author credentials",
      type: "text",
      placeholder: "Board-Certified Dermatologist / Health Editor / Registered Dietitian",
      required: false,
      hint: "What kind of authority signs the article? Defaults to the preset's authority figure type.",
    },
  ],
  sections: [
    {
      id: "urgency-banner",
      label: "Urgency banner",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Urgency banner

Write a sticky top bar with ONE short time-sensitive message. MAXIMUM 10 WORDS. Use the user's "urgency" intake answer if provided, otherwise tie to something concrete (seasonal, production batch, media feature).

Examples of the right shape (under 10 words each):
- "BREAKING: 312 units left before Seto batch restock"
- "LIMITED: 60% off ends Friday midnight"
- "TRENDING: 47,000 new customers this week"

Output exactly: <section class="lf-urgency-banner"><p>…</p></section>. No inline styles.`,
      maxTokens: 300,
    },
    {
      id: "editorial-headline",
      label: "Editorial headline",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Editorial headline

Write ONE headline that reads like a real article, not an ad. Pattern options:
- "[Number] [Audience] Are [Doing Thing] to [Get Result] — [Authority] Says It Works"
- "The [Adjective] [Category] [Authority Type] Are Recommending to Their Own [Patients/Clients/Friends]"
- "Why [Number] [Audience] Switched to [Category Angle] This [Season/Year]"

Use real numbers grounded in the proof field. Large serif. Centered.

Output: <section class="lf-editorial-headline"><h1>…</h1></section>.`,
      maxTokens: 500,
    },
    {
      id: "byline",
      label: "Byline + date",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Byline

Write a fake-but-realistic author line. Use the author_credentials from intake if provided; otherwise pick a credible credentialed author (e.g. "Dr. Sarah Mitchell, Board-Certified Dermatologist"). Include a recent publication date.

Output: <section class="lf-byline"><p>By [Name], [Credentials] · Published [date]</p></section>. Small, muted.`,
      maxTokens: 300,
    },
    {
      id: "hero-image",
      label: "Hero image + caption",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Hero image + credibility caption

If a product image URL is available in the list above, use it. If not, use a subtle CSS gradient. Below the image, write ONE caption line with a credibility statement (e.g., "Featured in [publication]", "Dermatologist-tested since [year]").

Output: <section class="lf-hero-image"><figure><img src="…" alt="…" /><figcaption>…</figcaption></figure></section>.`,
      maxTokens: 500,
    },
    {
      id: "opening-hook",
      label: "Opening hook",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Opening hook (2–3 paragraphs)

Start with a relatable pain-point scenario written in second person. "If you've ever…", "You're brushing your teeth when you notice…", "It starts with…". Build emotional identification — the reader should think "that's me."

End the hook by teasing the solution without naming the product yet. Leave an information gap.

Output: <section class="lf-opening-hook"><p>…</p><p>…</p><p>…</p></section>. Each paragraph is one idea.`,
      maxTokens: 1800,
    },
    {
      id: "star-rating-interrupter",
      label: "Star rating interrupter",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Visual break — star rating

Use ★★★★★ via HTML entities. One line with the exact review count and rating from the proof field. Centered, slightly larger text.

Output: <section class="lf-star-rating"><p>★★★★★<br>Rated X/5 by Y verified customers</p></section>.`,
      maxTokens: 300,
    },
    {
      id: "pain-escalation",
      label: "Pain point escalation",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Pain point escalation

Take the initial pain point and show the cascade of problems. Use a checklist of ✓ items the reader identifies with (4–7 items). End with a "Sound familiar? You're not alone. In fact, [specific stat or broad claim]…" line.

Make the reader feel the problem is serious enough to solve NOW.

Output: <section class="lf-pain-escalation"><p>…intro…</p><ul class="lf-check-list">…</ul><p>…outro…</p></section>.`,
      maxTokens: 1500,
    },
    {
      id: "root-cause",
      label: "Root cause reframe",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Root cause reframe — the MECHANISM is the star here

Start with "Here's what most people don't realize…" or equivalent. Reframe the problem — it's not what they think. The real issue is [the mechanism from the intake].

Explain the mechanism in plain language. Use an analogy if it helps. Make the reader feel smarter for understanding it.

Position existing solutions as flawed ("Most [category] products only address the surface…"). Create an information gap that only YOUR product fills.

This section deserves real space — 4–6 paragraphs. Devote the most words here.

Output: <section class="lf-root-cause"><h2>…</h2><p>…</p><p>…</p>…</section>.`,
      maxTokens: 2600,
    },
    {
      id: "product-reveal",
      label: "Product reveal",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Product reveal

NOW name the product. Frame it as the solution that addresses the root cause. Include:
- Product image (use an available URL)
- A brief origin story: "After [X years/research/frustration], [brand] developed…"
- 3–4 bullet points of key differentiators tied to the mechanism

Output: <section class="lf-product-reveal"><img src="…"/><h2>…</h2><p>…</p><ul>…</ul></section>.`,
      maxTokens: 1800,
    },
    {
      id: "ingredient-cards",
      label: "Ingredient / feature cards",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Ingredient / feature cards

3–5 cards in a grid. Each card: icon hint (emoji or inline SVG), ingredient/feature name, what it does, why it matters. Use specific numbers ("clinically shown to improve X by Y% in Z weeks"). If the product isn't a consumable, translate to "feature cards" — still 3–5, still specific.

Output: <section class="lf-ingredient-cards"><div class="lf-card">…</div>…</section>.`,
      maxTokens: 2200,
    },
    {
      id: "social-proof",
      label: "Social proof block",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: 3–4 testimonial cards styled like review screenshots

Each card: Name, age/location, star rating, review text, "Verified Buyer" badge. Make them specific and story-driven, NOT generic praise.

AT LEAST ONE must follow the skepticism→conversion arc: "I was skeptical at first because…, but after [timeframe]…"

Mark examples with data-example="true" so future readers know they're illustrative.

Output: <section class="lf-social-proof"><div class="lf-review" data-example="true">…</div>…</section>.`,
      maxTokens: 2400,
    },
    {
      id: "results-timeline",
      label: "Results timeline",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Week-by-week expectations

Create a timeline (Week 1 → Week 4 → Week 8 or similar) with concrete things the customer will notice at each stage. Be honest — don't promise Week 1 miracles if the mechanism takes longer.

Output: <section class="lf-results-timeline"><ol>…</ol></section>.`,
      maxTokens: 1400,
    },
    {
      id: "comparison-table",
      label: "Comparison table",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: [Product] vs. The Rest

A 2-column table with checkmarks ✓ and ✗. Product wins on every row. Include price-per-day or value framing. Compare on 5–8 dimensions grounded in the mechanism (not generic "Fast!", "Effective!").

Output: <section class="lf-comparison"><table>…</table></section>.`,
      maxTokens: 1200,
    },
    {
      id: "pricing-tiers",
      label: "Package pricing",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: 3-tier pricing (Single / Bundle / Mega Bundle)

- Single: one unit, full price
- Bundle: 3 units, discounted per-unit, "MOST POPULAR" badge, visually highlighted
- Mega Bundle: 6 units, biggest discount, "BEST VALUE" badge

Show original price crossed out, sale price, per-unit savings. Free shipping threshold on bundles. Each tier has a CTA button.

Use the Price field for the base price; derive the multi-unit prices by multiplying and applying a reasonable discount (e.g. 15%, 30%).

Output: <section class="lf-pricing-tiers"><div class="lf-tier">…</div><div class="lf-tier lf-tier-popular">…</div><div class="lf-tier">…</div></section>. Apply class="lf-tier-popular" to the middle tier. Never use inline styles.`,
      maxTokens: 2000,
    },
    {
      id: "guarantee",
      label: "Guarantee",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Money-back guarantee

"60-Day Money-Back Guarantee" (or similar based on product category). Brief reassurance copy — what happens if it doesn't work, who they contact, how long it takes to refund. Remove risk.

Output: <section class="lf-guarantee"><h2>…</h2><p>…</p></section>. The heading MUST be one line — no <br> tags, no inline font-size styles. Let the stitcher handle sizing.`,
      maxTokens: 800,
    },
    {
      id: "final-cta",
      label: "Final CTA",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Final call-to-action

Restate urgency (tied to something real). Large action-oriented CTA button. One-liner of social proof underneath ("Join X happy customers").

Output: <section class="lf-final-cta"><h2>…</h2><a class="lf-cta-btn">Get [Product] Now</a><p>…</p></section>.`,
      maxTokens: 800,
    },
    {
      id: "footer",
      label: "Footer",
      systemPrompt: ADVERTORIAL_HARD_RULES,
      directive: `## Your job: Minimal legal footer

Disclaimer text appropriate to the product category (FDA disclaimer for supplements, results-may-vary for cosmetic/skincare, etc.). Links: Privacy Policy, Terms, Contact. Small, muted.

Output: <section class="lf-footer"><p>…disclaimer…</p><nav>Privacy · Terms · Contact</nav></section>.`,
      maxTokens: 400,
    },
  ],
  presets: [
    {
      id: "clinical",
      name: "Clinical Editorial",
      description: "Medical journal feel. Clean, authoritative, trustworthy. Best for skincare, supplements, health.",
      palette: {
        bg: "#FFFFFF",
        fg: "#1A1A1A",
        primary: "#2B6CB0",
        secondary: "#4A5568",
        accent: "#2B6CB0",
        muted: "#F7FAFC",
      },
      fontPair: { heading: "Georgia", body: "system-ui" },
      radius: "sm",
      density: "airy",
    },
    {
      id: "lifestyle-magazine",
      name: "Lifestyle Magazine",
      description: "Cosmopolitan/GQ feel. Polished, aspirational. Best for beauty, fashion, premium consumables.",
      palette: {
        bg: "#FEFCFB",
        fg: "#2D3748",
        primary: "#C53030",
        secondary: "#744210",
        accent: "#D69E2E",
        muted: "#FFFAF0",
      },
      fontPair: { heading: "Playfair Display", body: "system-ui" },
      radius: "sm",
      density: "airy",
    },
    {
      id: "news-expose",
      name: "News Exposé",
      description: "Viral news investigation feel. Urgent, revealing. Best for supplements, weight loss, 'hidden truth' angles.",
      palette: {
        bg: "#FFFFFF",
        fg: "#111111",
        primary: "#E53E3E",
        secondary: "#2D3748",
        accent: "#F6E05E",
        muted: "#F7FAFC",
      },
      fontPair: { heading: "Impact, system-ui", body: "system-ui" },
      radius: "none",
      density: "tight",
    },
    {
      id: "warm-trustworthy",
      name: "Warm & Trustworthy",
      description: "Friend-recommendation feel. Personal, cozy. Best for pet, family, food, hobby products.",
      palette: {
        bg: "#FFFDF7",
        fg: "#3D2C1E",
        primary: "#276749",
        secondary: "#744210",
        accent: "#D69E2E",
        muted: "#F5EDDF",
      },
      fontPair: { heading: "Nunito", body: "system-ui" },
      radius: "md",
      density: "normal",
    },
  ],
  stitcher: {
    layout: "inline-css-narrow",
    maxWidth: 720,
    googleFontHeading: "Playfair Display",
    googleFontBody: "Inter",
    dropshipPack: true,
  },
  copyRules: {
    bannedWords: ADVERTORIAL_BANNED,
    styleGuide: UNIVERSAL_STYLE_GUIDE,
    executionDirective:
      "You are not building a landing page. You are writing a magazine article that happens to sell a product. The reader should be 80% through the page before they realize they're being sold to. Every paragraph earns the next scroll.",
  },
  imageGen: [
    {
      id: "hero-lifestyle",
      purpose: "Hero lifestyle shot — product in an aspirational setting",
      promptTemplate:
        "{{product.description}} shown in a {{preset_mood}} lifestyle setting, professional editorial photography, candid, soft natural light, 16:9 composition",
      aspectRatio: "16:9",
    },
    {
      id: "product-showcase",
      purpose: "Clean product shot on simple background",
      promptTemplate:
        "{{product.name}}: {{product.description}}, professional product photography, clean studio background, soft shadows, editorial style, high resolution",
      aspectRatio: "1:1",
    },
  ],
};
