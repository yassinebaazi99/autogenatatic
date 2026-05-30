import type { PlaybookPreset, PlaybookStitcherConfig } from "../types";
import type { StitchInput } from "./types";
import {
  RADIUS_PX,
  dropshipPackHtml,
  escapeHtml,
  googleFontLink,
  pixelPlaceholders,
} from "./utils";

/**
 * Stitcher for the quiz-funnel playbook. Produces a self-contained HTML file
 * with a plain-JS engine that toggles `<section class="lf-quiz-step">`
 * visibility based on `data-next` attributes on answer buttons. No frameworks,
 * no external JS — the file works dropped onto any static host.
 */
export function stitchInlineCssQuiz(input: StitchInput): string {
  const { title, preset, sections, stitcherConfig } = input;
  const css = buildQuizCss(preset, stitcherConfig);
  const body = sections.map((s) => s.html).join("\n\n");
  const fontLinks = [
    googleFontLink(stitcherConfig.googleFontHeading),
    googleFontLink(stitcherConfig.googleFontBody),
  ]
    .filter(Boolean)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(title)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:type" content="website">
${fontLinks}
<style>${css}</style>
${pixelPlaceholders()}
</head>
<body>
<main class="lf-quiz">
${body}
</main>
${stitcherConfig.dropshipPack ? dropshipPackHtml() : ""}
<script>${QUIZ_JS}</script>
</body>
</html>
`;
}

// Plain JS quiz engine. Hides all steps except the active one, binds clicks
// on buttons with data-next to advance. Steps with data-auto-next + data-delay
// transition automatically.
const QUIZ_JS = `
(function() {
  var steps = document.querySelectorAll('.lf-quiz-step');
  if (!steps.length) return;

  function showStep(target) {
    steps.forEach(function(s) { s.style.display = 'none'; });
    var next;
    if (target === 'results' || target === 'analyzing') {
      next = Array.prototype.find.call(steps, function(s) { return s.dataset.step === target; });
    } else {
      next = Array.prototype.find.call(steps, function(s) { return s.dataset.step === String(target); });
    }
    if (!next) return;
    next.style.display = 'block';
    // Scroll to top of step so mobile users see the headline
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Auto-advance support
    if (next.dataset.autoNext) {
      var delay = parseInt(next.dataset.delay || '2000', 10);
      setTimeout(function() { showStep(next.dataset.autoNext); }, delay);
    }
  }

  // Show step 0 initially, hide everything else
  steps.forEach(function(s) { s.style.display = 'none'; });
  var first = Array.prototype.find.call(steps, function(s) { return s.dataset.step === '0'; });
  if (first) first.style.display = 'block';

  // Bind all answer buttons
  document.querySelectorAll('.lf-quiz-answer').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var next = btn.dataset.next;
      if (next != null) showStep(next);
    });
  });
})();
`.trim();

function buildQuizCss(
  preset: PlaybookPreset,
  stitcher: PlaybookStitcherConfig,
): string {
  return `
:root {
  --lf-bg: ${preset.palette.bg};
  --lf-fg: ${preset.palette.fg};
  --lf-primary: ${preset.palette.primary};
  --lf-secondary: ${preset.palette.secondary};
  --lf-accent: ${preset.palette.accent ?? preset.palette.primary};
  --lf-muted: ${preset.palette.muted ?? preset.palette.bg};
  --lf-radius: ${RADIUS_PX[preset.radius]};
  --lf-max-width: ${stitcher.maxWidth}px;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--lf-bg);
  color: var(--lf-fg);
  font-family: "${preset.fontPair.body}", system-ui, sans-serif;
  font-size: 17px;
  line-height: 1.6;
  min-height: 100vh;
}
h1, h2, h3 {
  font-family: "${preset.fontPair.heading}", system-ui, sans-serif;
  color: var(--lf-fg);
  margin-top: 0;
}
.lf-quiz {
  max-width: var(--lf-max-width);
  margin: 0 auto;
  padding: 2.5rem 1.25rem 7rem;
  min-height: 100vh;
}
.lf-quiz-step {
  display: none; /* JS toggles the active step */
  animation: lfFade 0.3s ease;
}
@keyframes lfFade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.lf-quiz-step h1 { font-size: clamp(1.75rem, 5vw, 2.5rem); margin-bottom: 0.5rem; }
.lf-quiz-step h2 { font-size: clamp(1.35rem, 4vw, 2rem); margin-bottom: 2rem; }
.lf-quiz-answer {
  display: block;
  width: 100%;
  text-align: left;
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
  background: var(--lf-muted);
  color: var(--lf-fg);
  border: 2px solid transparent;
  border-radius: var(--lf-radius);
  font-size: 1rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
  min-height: 56px;
}
.lf-quiz-answer:hover {
  border-color: var(--lf-primary);
  transform: translateY(-1px);
}
.lf-quiz-primary {
  background: var(--lf-primary);
  color: ${contrastColor(preset.palette.primary)};
  text-align: center;
  font-weight: 700;
}
.lf-cta-btn {
  display: inline-block;
  padding: 1rem 2rem;
  background: var(--lf-primary);
  color: ${contrastColor(preset.palette.primary)};
  text-decoration: none;
  border-radius: var(--lf-radius);
  font-weight: 700;
  min-height: 48px;
}
.lf-product-card {
  padding: 1.5rem;
  background: var(--lf-muted);
  border-radius: var(--lf-radius);
  margin: 1.5rem 0;
}
.lf-product-card img { max-width: 100%; border-radius: var(--lf-radius); margin-bottom: 1rem; }
.lf-review {
  padding: 1rem 1.25rem;
  background: var(--lf-muted);
  border-radius: var(--lf-radius);
  margin-bottom: 0.75rem;
}
.lf-loader {
  width: 40px;
  height: 40px;
  border: 3px solid var(--lf-muted);
  border-top-color: var(--lf-primary);
  border-radius: 50%;
  margin: 2rem auto;
  animation: lfSpin 0.8s linear infinite;
}
@keyframes lfSpin { to { transform: rotate(360deg); } }
.lf-trust { font-size: 0.8rem; color: var(--lf-secondary); text-align: center; margin-top: 1rem; }
.lf-trust-strip {
  max-width: var(--lf-max-width);
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--lf-secondary);
}
@media (max-width: 600px) {
  .lf-quiz { padding: 1.5rem 1rem 7rem; }
  html, body { font-size: 16px; }
}
`.trim();
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
