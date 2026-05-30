// Playbook TypeScript shape. The runtime equivalent (zod validators) lives
// in ./schemas.ts — keep this file and that one in sync.

export type PlaybookType =
  | "generic"
  | "advertorial"
  | "listicle"
  | "quiz"
  | "custom";

export type StitcherLayout =
  | "tailwind-cdn" // current generic layout, utility-class-driven
  | "inline-css-narrow" // advertorial/listicle, max-width 700–760 centered, Google Fonts
  | "inline-css-quiz"; // quiz funnel, adds inline JS engine for step navigation

/** Colors + fonts + layout tokens applied by the stitcher. */
export type PlaybookPreset = {
  id: string;
  name: string;
  description: string;
  palette: {
    bg: string;
    fg: string;
    primary: string;
    secondary: string;
    accent?: string;
    muted?: string;
  };
  fontPair: {
    heading: string; // Google Fonts family name OR CSS system-font value
    body: string;
  };
  /** CSS radius token used by cards, buttons, images. */
  radius: "none" | "sm" | "md" | "lg" | "pill";
  /** Section padding scale. */
  density: "tight" | "normal" | "airy";
};

export type PlaybookIntakeField = {
  id: string; // becomes a FormData key on the generate form
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "select";
  options?: string[]; // for type=select
  required: boolean;
  hint?: string;
};

/** One ordered section the runner will spawn a Claude agent for. */
export type PlaybookSection = {
  id: string; // short kebab-case, stored on AgentRun.section
  label: string; // display name in the UI
  /** Claude system prompt for this section agent. */
  systemPrompt: string;
  /** User-message role directive. The runner appends shared context + intake. */
  directive: string;
  /** Max output tokens for this agent. Defaults to 3500. */
  maxTokens?: number;
  /** If false, the section is still created but the user can skip it on the
   *  generate form via a checkbox. Defaults to true (required). */
  required?: boolean;
};

export type PlaybookCopyRules = {
  bannedWords: string[];
  styleGuide: string;
  executionDirective: string;
};

export type PlaybookImageGenSlot = {
  id: string;
  purpose: string;
  promptTemplate: string; // uses {{product.name}} / {{mechanism}} etc.
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
};

export type PlaybookStitcherConfig = {
  layout: StitcherLayout;
  maxWidth: number; // CSS pixels for the content column
  googleFontHeading?: string; // only for inline-css layouts; heading font family
  googleFontBody?: string;
  /** Toggle the dropship trust-badge pack (sticky mobile CTA, trust strip,
   *  pixel placeholders). */
  dropshipPack: boolean;
};

/** The full playbook definition that lives in Playbook.definition as JSON. */
export type PlaybookDefinition = {
  slug: string;
  name: string;
  type: PlaybookType;
  description: string;
  /** Extra questions the user answers on top of the product fields. */
  intake: PlaybookIntakeField[];
  /** Ordered list of sections. Runner spawns one agent per entry. */
  sections: PlaybookSection[];
  /** Baked design presets. User picks one on the generate form. */
  presets: PlaybookPreset[];
  /** Stitcher to use when assembling the final HTML. */
  stitcher: PlaybookStitcherConfig;
  /** Copy rules injected into every section agent's system prompt. */
  copyRules: PlaybookCopyRules;
  /** Image-generation slots (populated in M6 when Nano Banana is hooked up). */
  imageGen: PlaybookImageGenSlot[];
};
