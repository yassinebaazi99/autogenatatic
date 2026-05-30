import type { PlaybookDefinition, PlaybookPreset } from "../types";
import type { StitchInput } from "./types";
import { DENSITY_PAD, RADIUS_PX, escapeHtml } from "./utils";

/**
 * Stitcher for the `tailwind-cdn` layout used by the Generic playbook.
 * Emits a full HTML document with Tailwind from CDN and CSS variables
 * derived from the active preset. Sections are concatenated in order.
 */
export function stitchTailwindCdn(input: StitchInput): string {
  const { title, preset, sections } = input;
  const css = buildCss(preset);
  const body = sections.map((s) => s.html).join("\n\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>${css}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function buildCss(preset: PlaybookPreset): string {
  return `
:root {
  --lf-bg: ${preset.palette.bg};
  --lf-fg: ${preset.palette.fg};
  --lf-primary: ${preset.palette.primary};
  --lf-secondary: ${preset.palette.secondary};
  --lf-accent: ${preset.palette.accent ?? preset.palette.primary};
  --lf-muted: ${preset.palette.muted ?? preset.palette.bg};
  --lf-radius: ${RADIUS_PX[preset.radius]};
  --lf-section-pad: ${DENSITY_PAD[preset.density]};
  --lf-heading-font: ${preset.fontPair.heading};
  --lf-body-font: ${preset.fontPair.body};
}
html, body {
  background: var(--lf-bg);
  color: var(--lf-fg);
  font-family: var(--lf-body-font), system-ui, sans-serif;
  margin: 0;
}
h1, h2, h3, h4, h5, h6 {
  font-family: var(--lf-heading-font), system-ui, sans-serif;
}
section {
  padding-top: var(--lf-section-pad);
  padding-bottom: var(--lf-section-pad);
}
`.trim();
}

export type { PlaybookDefinition };
