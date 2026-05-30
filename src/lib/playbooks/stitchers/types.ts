import type { PlaybookPreset, PlaybookStitcherConfig } from "../types";

export type StitchInput = {
  title: string;
  preset: PlaybookPreset;
  stitcherConfig: PlaybookStitcherConfig;
  /** Sections in the order they should appear in the final HTML. */
  sections: Array<{ id: string; html: string }>;
};
