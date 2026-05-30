import type { StitcherLayout } from "../types";
import { stitchInlineCssNarrow } from "./inline-css-narrow";
import { stitchInlineCssQuiz } from "./inline-css-quiz";
import { stitchTailwindCdn } from "./tailwind-cdn";
import type { StitchInput } from "./types";

export { renderFailedSection } from "./utils";
export type { StitchInput };

/** Dispatch to the right stitcher based on the playbook's layout choice. */
export function stitch(input: StitchInput): string {
  const layout: StitcherLayout = input.stitcherConfig.layout;
  switch (layout) {
    case "tailwind-cdn":
      return stitchTailwindCdn(input);
    case "inline-css-narrow":
      return stitchInlineCssNarrow(input);
    case "inline-css-quiz":
      return stitchInlineCssQuiz(input);
    default: {
      const _exhaustive: never = layout;
      throw new Error(`unknown stitcher layout: ${String(_exhaustive)}`);
    }
  }
}
