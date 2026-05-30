import type { PlaybookPreset, PlaybookStitcherConfig } from "../types";
import type { StitchInput } from "./types";
import {
  DENSITY_PAD,
  RADIUS_PX,
  dropshipPackHtml,
  escapeHtml,
  googleFontLink,
  pixelPlaceholders,
} from "./utils";

/**
 * Stitcher for advertorial + listicle: single-column article layout,
 * max-width 700–760px centered, Google Fonts, inline CSS, no Tailwind.
 * Emits a complete self-contained HTML file portable to any static host.
 *
 * IMPORTANT: every section class a playbook agent emits MUST have styling
 * here. If an agent emits <section class="lf-foo"> and lf-foo has no rule,
 * the section looks like a naked block and Claude falls back to inline
 * styles to compensate — which then clash with the preset palette. So when
 * you add a new section to a playbook, add its class to this CSS.
 */
export function stitchInlineCssNarrow(input: StitchInput): string {
  const { title, preset, sections, stitcherConfig } = input;
  const css = buildNarrowCss(preset, stitcherConfig);
  const body = sections.map((s) => s.html).join("\n\n");
  const fontLinks = [
    googleFontLink(stitcherConfig.googleFontHeading),
    googleFontLink(stitcherConfig.googleFontBody),
  ]
    .filter(Boolean)
    .join("\n");
  const dropship = stitcherConfig.dropshipPack;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(title)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:type" content="article">
${fontLinks}
<style>${css}</style>
${pixelPlaceholders()}
</head>
<body>
<main class="lf-article">
${body}
</main>
${dropship ? dropshipPackHtml() : ""}
</body>
</html>
`;
}

function buildNarrowCss(
  preset: PlaybookPreset,
  stitcher: PlaybookStitcherConfig,
): string {
  const maxWidth = stitcher.maxWidth;
  const primaryContrast = contrastColor(preset.palette.primary);
  const accentContrast = contrastColor(
    preset.palette.accent ?? preset.palette.primary,
  );
  return `
:root {
  --lf-bg: ${preset.palette.bg};
  --lf-fg: ${preset.palette.fg};
  --lf-primary: ${preset.palette.primary};
  --lf-primary-contrast: ${primaryContrast};
  --lf-secondary: ${preset.palette.secondary};
  --lf-accent: ${preset.palette.accent ?? preset.palette.primary};
  --lf-accent-contrast: ${accentContrast};
  --lf-muted: ${preset.palette.muted ?? hexWithAlpha(preset.palette.fg, 0.04)};
  --lf-border: ${hexWithAlpha(preset.palette.fg, 0.12)};
  --lf-border-soft: ${hexWithAlpha(preset.palette.fg, 0.06)};
  --lf-radius: ${RADIUS_PX[preset.radius]};
  --lf-section-pad: ${DENSITY_PAD[preset.density]};
  --lf-max-width: ${maxWidth}px;
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--lf-bg);
  color: var(--lf-fg);
  font-family: "${preset.fontPair.body}", system-ui, -apple-system, sans-serif;
  font-size: 18px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
h1, h2, h3, h4 {
  font-family: "${preset.fontPair.heading}", Georgia, serif;
  color: var(--lf-fg);
  line-height: 1.18;
  letter-spacing: -0.015em;
  margin: 0 0 0.75rem;
}
h1 { font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 700; }
h2 { font-size: clamp(1.5rem, 3.5vw, 2.25rem); font-weight: 700; margin-top: 0.25rem; }
h3 { font-size: 1.2rem; font-weight: 600; }
p { margin: 0 0 1.25rem 0; }
a { color: var(--lf-primary); }
strong, b { color: var(--lf-fg); font-weight: 700; }
img, figure { max-width: 100%; height: auto; border-radius: var(--lf-radius); }
figure { margin: 1.5rem 0; }
figcaption {
  font-size: 0.85rem;
  font-style: italic;
  color: var(--lf-secondary);
  text-align: center;
  margin-top: 0.75rem;
}

/* =====================================================================
   Article container
   ===================================================================== */
.lf-article {
  max-width: var(--lf-max-width);
  margin: 0 auto;
  padding: 2.5rem 1.5rem 7rem;
}
.lf-article > section {
  padding: 2.25rem 0;
  border-bottom: 1px solid var(--lf-border-soft);
}
.lf-article > section:last-of-type { border-bottom: none; }

/* =====================================================================
   1. Urgency banner — full-bleed sticky
   ===================================================================== */
.lf-urgency-banner {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--lf-accent);
  color: var(--lf-accent-contrast);
  padding: 0.85rem 1rem !important;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: -2.5rem -1.5rem 1.5rem;
  border-bottom: 2px solid var(--lf-fg);
}
.lf-urgency-banner p { margin: 0; }

/* =====================================================================
   2. Editorial headline
   ===================================================================== */
.lf-editorial-headline {
  text-align: center;
  padding-top: 1.5rem !important;
  padding-bottom: 0.5rem !important;
}
.lf-editorial-headline h1 {
  font-size: clamp(2rem, 5.5vw, 3.5rem);
  line-height: 1.12;
  max-width: 95%;
  margin: 0 auto;
}

/* =====================================================================
   3. Byline
   ===================================================================== */
.lf-byline {
  text-align: center;
  padding-top: 0 !important;
  padding-bottom: 1.5rem !important;
  border-bottom: 1px solid var(--lf-border) !important;
}
.lf-byline p {
  font-size: 0.85rem;
  color: var(--lf-secondary);
  font-style: italic;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* =====================================================================
   4. Hero image
   ===================================================================== */
.lf-hero-image { padding: 1rem 0 !important; }
.lf-hero-image figure {
  margin: 0;
  position: relative;
}
.lf-hero-image img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}
/* Fallback when there's no <img> */
.lf-hero-image > *:not(figure) {
  display: block;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, var(--lf-muted), var(--lf-accent));
  border-radius: var(--lf-radius);
}

/* =====================================================================
   5. Opening hook — classic editorial drop cap on first paragraph
   ===================================================================== */
.lf-opening-hook { padding-top: 2rem !important; }
.lf-opening-hook p {
  font-size: 1.08rem;
  max-width: 62ch;
  margin-left: auto;
  margin-right: auto;
}
.lf-opening-hook p:first-of-type::first-letter {
  font-family: "${preset.fontPair.heading}", Georgia, serif;
  float: left;
  font-size: 4.5rem;
  line-height: 0.85;
  font-weight: 700;
  padding: 0.35rem 0.55rem 0 0;
  color: var(--lf-primary);
}

/* =====================================================================
   6. Star rating interrupter
   ===================================================================== */
.lf-star-rating {
  text-align: center;
  padding: 1.5rem 0 !important;
  border: none !important;
}
.lf-star-rating p {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--lf-secondary);
  margin: 0;
}
.lf-star-rating p::first-line {
  color: var(--lf-accent);
  font-size: 1.6rem;
  letter-spacing: 0.15em;
}

/* =====================================================================
   7. Pain point escalation
   ===================================================================== */
.lf-pain-escalation {
  background: var(--lf-muted);
  padding: 2.5rem 1.5rem !important;
  border-radius: var(--lf-radius);
  margin: 1rem 0;
  border: 1px solid var(--lf-border) !important;
}
.lf-pain-escalation h2 {
  text-align: center;
  font-size: clamp(1.4rem, 3vw, 2rem);
}
.lf-check-list,
.lf-pain-escalation ul {
  list-style: none;
  padding: 0;
  max-width: 52ch;
  margin: 1.5rem auto;
}
.lf-check-list li,
.lf-pain-escalation ul li {
  padding: 0.75rem 0 0.75rem 2rem;
  position: relative;
  font-size: 1.02rem;
  border-bottom: 1px dashed var(--lf-border);
}
.lf-check-list li:last-child,
.lf-pain-escalation ul li:last-child { border-bottom: none; }
.lf-check-list li::before,
.lf-pain-escalation ul li::before {
  content: "✓";
  position: absolute;
  left: 0;
  top: 0.65rem;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 9999px;
  background: var(--lf-accent);
  color: var(--lf-accent-contrast);
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* =====================================================================
   8. Root cause reframe — THE STAR. Give it visual weight.
   ===================================================================== */
.lf-root-cause {
  padding: 3rem 0 !important;
  border-top: 3px solid var(--lf-accent) !important;
  border-bottom: 3px solid var(--lf-accent) !important;
  margin: 1.5rem 0;
}
.lf-root-cause h2 {
  color: var(--lf-primary);
  font-size: clamp(1.75rem, 4.5vw, 2.75rem);
  margin-bottom: 1.25rem;
  max-width: 18ch;
}
.lf-root-cause p {
  font-size: 1.1rem;
  max-width: 64ch;
}
.lf-root-cause p:first-of-type {
  font-size: 1.25rem;
  font-style: italic;
  color: var(--lf-secondary);
  border-left: 3px solid var(--lf-accent);
  padding-left: 1.25rem;
  margin-bottom: 1.5rem;
}

/* =====================================================================
   9. Product reveal
   ===================================================================== */
.lf-product-reveal {
  background: linear-gradient(180deg, var(--lf-muted), var(--lf-bg));
  padding: 3rem 1.5rem !important;
  border-radius: var(--lf-radius);
  margin: 1.5rem 0;
  text-align: center;
  border: 1px solid var(--lf-border) !important;
}
.lf-product-reveal img {
  max-width: 60%;
  margin: 0 auto 1.5rem;
  display: block;
}
.lf-product-reveal h2 {
  color: var(--lf-primary);
  max-width: 22ch;
  margin-left: auto;
  margin-right: auto;
}
.lf-product-reveal ul {
  text-align: left;
  max-width: 48ch;
  margin: 1.5rem auto;
  padding-left: 1.25rem;
}
.lf-product-reveal li {
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
}

/* =====================================================================
   10. Ingredient / feature cards
   ===================================================================== */
.lf-ingredient-cards,
.lf-features {
  padding-top: 2rem !important;
}
.lf-ingredient-cards h2,
.lf-features h2 {
  text-align: center;
  margin-bottom: 2rem;
}
.lf-ingredient-cards > div:not(.lf-card),
.lf-features > div:not(.lf-card),
.lf-ingredient-cards ul,
.lf-ingredient-cards ol {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  list-style: none;
  padding: 0;
}
.lf-card,
.lf-feature-card {
  padding: 1.5rem;
  background: var(--lf-muted);
  border-radius: var(--lf-radius);
  border: 1px solid var(--lf-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.lf-card h3,
.lf-feature-card h3 {
  color: var(--lf-primary);
  margin: 0;
}
.lf-card p,
.lf-feature-card p {
  font-size: 0.95rem;
  color: var(--lf-secondary);
  margin: 0;
}

/* =====================================================================
   11. Social proof / testimonials
   ===================================================================== */
.lf-social-proof { padding-top: 2rem !important; }
.lf-social-proof h2 { text-align: center; margin-bottom: 2rem; }
.lf-review {
  padding: 1.5rem;
  background: var(--lf-muted);
  border-radius: var(--lf-radius);
  margin-bottom: 1rem;
  border-left: 4px solid var(--lf-accent);
}
.lf-review[data-example="true"] { border-left-color: var(--lf-secondary); }
.lf-review p { margin: 0 0 0.75rem; }
.lf-review p:last-child {
  margin-bottom: 0;
  font-size: 0.85rem;
  color: var(--lf-secondary);
  font-weight: 600;
}

/* =====================================================================
   12. Results timeline
   ===================================================================== */
.lf-results-timeline {
  padding-top: 2rem !important;
  padding-bottom: 2rem !important;
}
.lf-results-timeline h2 { text-align: center; margin-bottom: 2rem; }
.lf-results-timeline ol,
.lf-results-timeline ul {
  list-style: none;
  padding: 0;
  counter-reset: lftl;
  max-width: 56ch;
  margin: 0 auto;
}
.lf-results-timeline li {
  padding: 1rem 0 1rem 3.5rem;
  position: relative;
  counter-increment: lftl;
  border-bottom: 1px solid var(--lf-border);
}
.lf-results-timeline li:last-child { border-bottom: none; }
.lf-results-timeline li::before {
  content: counter(lftl);
  position: absolute;
  left: 0;
  top: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  background: var(--lf-primary);
  color: var(--lf-primary-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "${preset.fontPair.heading}", Georgia, serif;
  font-weight: 700;
  font-size: 1.1rem;
}

/* =====================================================================
   13. Comparison table
   ===================================================================== */
.lf-comparison {
  padding-top: 2rem !important;
  overflow-x: auto;
}
.lf-comparison h2 { text-align: center; margin-bottom: 2rem; }
.lf-comparison table {
  width: 100%;
  border-collapse: collapse;
  background: var(--lf-muted);
  border-radius: var(--lf-radius);
  overflow: hidden;
}
.lf-comparison th,
.lf-comparison td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--lf-border);
}
.lf-comparison thead th {
  background: var(--lf-primary);
  color: var(--lf-primary-contrast);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.lf-comparison tbody tr:last-child td { border-bottom: none; }
.lf-comparison td:first-child { font-weight: 600; }

/* =====================================================================
   14. Pricing tiers
   ===================================================================== */
.lf-pricing-tiers { padding-top: 2rem !important; }
.lf-pricing-tiers h2 { text-align: center; margin-bottom: 2rem; }
.lf-pricing-tiers > div,
.lf-pricing-tiers ul {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  list-style: none;
  padding: 0;
  align-items: stretch;
}
.lf-tier {
  padding: 2rem 1.5rem;
  background: var(--lf-muted);
  border-radius: var(--lf-radius);
  text-align: center;
  border: 2px solid var(--lf-border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
}
.lf-tier[data-popular="true"],
.lf-tier.lf-tier-popular,
.lf-tier.popular {
  border-color: var(--lf-primary);
  transform: scale(1.03);
  background: var(--lf-bg);
  box-shadow: 0 12px 40px ${hexWithAlpha(preset.palette.fg, 0.08)};
  z-index: 2;
}
.lf-tier[data-popular="true"]::before,
.lf-tier.lf-tier-popular::before,
.lf-tier.popular::before {
  content: "MOST POPULAR";
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--lf-primary);
  color: var(--lf-primary-contrast);
  padding: 0.35rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.lf-tier h3 { color: var(--lf-primary); font-size: 1.2rem; margin: 0; }
.lf-tier .lf-price,
.lf-tier .price {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--lf-fg);
  font-family: "${preset.fontPair.heading}", Georgia, serif;
  margin: 0.5rem 0;
}
.lf-tier del,
.lf-tier s { color: var(--lf-secondary); font-size: 0.9rem; }
.lf-tier ul {
  list-style: none;
  padding: 0;
  display: block;
  text-align: left;
  font-size: 0.9rem;
  margin: 1rem 0;
}
.lf-tier ul li { padding: 0.35rem 0; }

/* =====================================================================
   15. Guarantee
   ===================================================================== */
.lf-guarantee {
  padding: 2.5rem 1.5rem !important;
  background: var(--lf-muted);
  border-radius: var(--lf-radius);
  text-align: center;
  margin: 1.5rem 0;
  border: 2px dashed var(--lf-accent) !important;
}
.lf-guarantee h2 {
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  color: var(--lf-primary);
  margin-bottom: 0.75rem;
}
.lf-guarantee p {
  max-width: 52ch;
  margin: 0 auto;
  color: var(--lf-secondary);
}

/* =====================================================================
   16. Final CTA
   ===================================================================== */
.lf-final-cta {
  padding: 3.5rem 1.5rem !important;
  background: var(--lf-primary);
  color: var(--lf-primary-contrast);
  border-radius: var(--lf-radius);
  text-align: center;
  margin: 1.5rem 0;
  border: none !important;
}
.lf-final-cta h2 {
  color: var(--lf-primary-contrast);
  max-width: 22ch;
  margin: 0 auto 1.5rem;
}
.lf-final-cta p {
  color: var(--lf-primary-contrast);
  opacity: 0.85;
  font-size: 0.9rem;
  margin-top: 1rem;
}
.lf-final-cta .lf-cta-btn,
.lf-final-cta a.lf-cta-btn {
  background: var(--lf-accent);
  color: var(--lf-accent-contrast);
}

/* =====================================================================
   17. Footer
   ===================================================================== */
.lf-footer {
  font-size: 0.8rem;
  color: var(--lf-secondary);
  text-align: center;
  padding: 2rem 0 !important;
  border: none !important;
}
.lf-footer nav { margin-top: 0.75rem; }
.lf-footer nav * { margin: 0 0.5rem; }
.lf-footer a { color: var(--lf-secondary); }

/* =====================================================================
   CTAs (used by hero, product-reveal, pricing, final-cta)
   ===================================================================== */
.lf-cta-btn,
a.lf-cta-btn,
button.lf-cta-btn {
  display: inline-block;
  background: var(--lf-primary);
  color: var(--lf-primary-contrast);
  text-decoration: none;
  padding: 1rem 2.25rem;
  border-radius: var(--lf-radius);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
  min-height: 52px;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 6px 20px ${hexWithAlpha(preset.palette.primary, 0.25)};
}
.lf-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px ${hexWithAlpha(preset.palette.primary, 0.3)}; }

/* =====================================================================
   Listicle items (used by the Listicle playbook)
   ===================================================================== */
.lf-item {
  margin-bottom: 2rem;
  padding: 1.75rem;
  background: var(--lf-muted);
  border-radius: var(--lf-radius);
  border: 1px solid var(--lf-border);
}
.lf-item[data-rank="1"],
.lf-item-winner {
  border: 3px solid var(--lf-primary);
  position: relative;
  background: var(--lf-bg);
  box-shadow: 0 12px 40px ${hexWithAlpha(preset.palette.fg, 0.08)};
}
.lf-item-winner::before {
  content: "#1 PICK";
  position: absolute;
  top: -14px;
  left: 1.5rem;
  background: var(--lf-primary);
  color: var(--lf-primary-contrast);
  padding: 0.35rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

/* =====================================================================
   Dropship trust strip (appended by the stitcher when dropshipPack=true)
   ===================================================================== */
.lf-trust-strip {
  max-width: var(--lf-max-width);
  margin: 1rem auto 0;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  font-size: 0.8rem;
  color: var(--lf-secondary);
  border-top: 1px solid var(--lf-border-soft);
}

/* =====================================================================
   Sticky mobile CTA (used by listicle)
   ===================================================================== */
.lf-sticky-cta {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--lf-bg);
  border-top: 1px solid var(--lf-border);
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  z-index: 90;
  box-shadow: 0 -8px 30px ${hexWithAlpha(preset.palette.fg, 0.12)};
}
.lf-sticky-cta p { margin: 0; font-size: 0.85rem; }
.lf-sticky-cta .lf-cta-btn { padding: 0.7rem 1.25rem; font-size: 0.9rem; min-height: 44px; }
@media (min-width: 900px) { .lf-sticky-cta { display: none; } }

/* =====================================================================
   Responsive
   ===================================================================== */
@media (max-width: 640px) {
  html, body { font-size: 17px; }
  .lf-article { padding: 1.5rem 1rem 7rem; }
  .lf-urgency-banner { margin: -1.5rem -1rem 1rem; }
  .lf-opening-hook p:first-of-type::first-letter { font-size: 3.5rem; }
  .lf-root-cause { padding: 2rem 0 !important; }
  .lf-final-cta { padding: 2.5rem 1rem !important; }
}

/* =====================================================================
   Defensive overrides: agents sometimes emit inline style="color: #..." or
   "background: #..." with arbitrary colors that don't match the preset.
   We can't strip those, but we can keep headings using our heading font.
   ===================================================================== */
.lf-article h1, .lf-article h2, .lf-article h3, .lf-article h4 {
  font-family: "${preset.fontPair.heading}", Georgia, serif !important;
}
`.trim();
}

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function contrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}
