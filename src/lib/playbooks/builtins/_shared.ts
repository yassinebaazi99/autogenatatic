// Prompt fragments reused across multiple builtin playbooks.

/** Copy rules that are generally true for every landing page. */
export const UNIVERSAL_BANNED_WORDS = [
  // AI tells
  "delve",
  "landscape",
  "testament",
  "showcase",
  "foster",
  "underscore",
  "pivotal",
  "crucial",
  "realm",
  "myriad",
  "tapestry",
  "multifaceted",
  "commendable",
  "intricate",
  "comprehensive",
  // marketing filler
  "innovative",
  "revolutionary",
  "cutting-edge",
  "seamless",
  "best-in-class",
  "robust",
  "game-changer",
  "revolutionize",
];

export const UNIVERSAL_STYLE_GUIDE = `Write like a journalist, not a marketer. The selling happens through structure, not tone.
Specific > generic: use real numbers, real names, real timeframes. "47,382 women" beats "thousands of women." "In 14 days" beats "quickly." "$3.27/day" beats "affordable."
One idea per paragraph. Short paragraphs. Lots of white space.
No hype adjectives without proof. Don't say "amazing" — show the rating and let the reader decide.
Testimonials must sound like real people: hesitation, specific details, timeframes.
STAY GROUNDED IN THE ACTUAL PRODUCT. If the product is a kettle, don't talk about "wearing it." If the product is a wearable, don't talk about "brewing." Use the product's ACTUAL use case, not borrowed advertorial tropes.`;

/**
 * HARD RULES every section agent must obey. This is the single most
 * load-bearing prompt fragment — it locks agents out of layout freelancing
 * so the stitcher's CSS is always the source of truth for visual design.
 */
export const SECTION_HARD_RULES = `OUTPUT FORMAT (non-negotiable):
- Output ONE <section class="..."> element. Nothing else. No <html>, <head>, <body>, <script>, <style>. No markdown code fences. No commentary before or after.
- Use the exact section class name specified in your directive below (e.g. class="lf-hero"). The stitcher's CSS matches on these class names — the wrong class means no styling.

STYLING (absolutely critical — violating these will make the page look broken):
- **NEVER use inline style="..." attributes**. The stitcher's CSS already handles colors, fonts, font-sizes, padding, margins, borders, backgrounds, radii, and spacing. Any inline style you add WILL clash with the preset palette and break the page.
- **NEVER use <br> tags for layout** — no manual line breaks in headings. Let the browser wrap text naturally.
- **NEVER invent colors, font-sizes, or font-families**. Don't write style="color: #..." or style="font-size: ...". The preset picks these.
- **NEVER use inline width/height attributes** except on <img> where natural.

ALLOWED CLASS NAMES (use ONLY these, never make up new ones):
Section wrappers: lf-hero, lf-urgency-banner, lf-editorial-headline, lf-byline, lf-hero-image, lf-opening-hook, lf-star-rating, lf-pain-escalation, lf-root-cause, lf-product-reveal, lf-ingredient-cards, lf-features, lf-social-proof, lf-results-timeline, lf-comparison, lf-pricing-tiers, lf-guarantee, lf-final-cta, lf-footer, lf-intro, lf-methodology, lf-items-runner-ups, lf-final-rec, lf-faq, lf-sticky-cta, lf-quiz-step, lf-quiz-questions, lf-quiz-testimonials
Child classes: lf-card, lf-feature-card, lf-tier, lf-tier-popular, lf-review, lf-cta-btn, lf-check-list, lf-item, lf-item-winner, lf-quiz-answer, lf-quiz-primary, lf-product-card, lf-loader, lf-trust
Data attributes: data-example="true" (for example/placeholder testimonials), data-popular="true" (for featured pricing tier), data-rank="N" (for listicle items)

BRIEF-ONLY MARKUP:
- Keep markup minimal. <section>, <h1>-<h4>, <p>, <ul>/<ol>/<li>, <figure>/<img>/<figcaption>, <table>, <details>/<summary>, <a class="lf-cta-btn">, <button class="lf-cta-btn">. Nothing else.
- Semantic classes only. No utility classes (no Tailwind, no px-4 style names).

If you're tempted to add a style attribute, STOP — the class name you're using already has the right look. If it doesn't, use a different allowed class name from the list above.`;
