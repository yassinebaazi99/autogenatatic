import type { PlaybookPreset } from "../types";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

export const RADIUS_PX: Record<PlaybookPreset["radius"], string> = {
  none: "0",
  sm: "6px",
  md: "10px",
  lg: "16px",
  pill: "9999px",
};

export const DENSITY_PAD: Record<PlaybookPreset["density"], string> = {
  tight: "2.5rem",
  normal: "4rem",
  airy: "6rem",
};

/** Google Fonts <link> tag for a font family, or empty string for system fonts. */
export function googleFontLink(family: string | undefined): string {
  if (!family) return "";
  if (family.includes("system") || family.toLowerCase() === "inherit") return "";
  // Basic weight set covers heading/body use
  const encoded = family.replace(/ /g, "+");
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap" rel="stylesheet">`;
}

/** The dropship trust-badge strip + sticky mobile CTA wrapper markup. */
export function dropshipPackHtml(): string {
  return `
<div class="lf-trust-strip" aria-label="Trust signals">
  <span>🔒 Secure checkout</span>
  <span>✓ 60-day guarantee</span>
  <span>🚚 Free shipping</span>
  <span>★ 4.8/5 rated</span>
</div>`;
}

export function pixelPlaceholders(): string {
  return `<!-- Pixel placeholders — paste your actual pixels here before deploying -->
<!-- Meta Pixel: <script>…</script> -->
<!-- TikTok Pixel: <script>…</script> -->
<!-- Google Tag: <script>…</script> -->`;
}

/** A placeholder for a section whose agent failed. */
export function renderFailedSection(sectionId: string, error: string): string {
  return `<section class="lf-failed" style="padding:3rem 1rem;text-align:center;background:#fef2f2;border:2px dashed #fca5a5;color:#991b1b;">
  <p style="font-weight:600;">${escapeHtml(sectionId)} section failed to generate</p>
  <p style="margin-top:0.5rem;font-size:0.875rem;">${escapeHtml(error)}</p>
</section>`;
}
