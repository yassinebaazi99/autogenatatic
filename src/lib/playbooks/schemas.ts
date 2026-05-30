import { z } from "zod";

// Runtime validators for the PlaybookDefinition JSON stored on Playbook.definition.
// Keep these in sync with ./types.ts.

export const PlaybookType = z.enum([
  "generic",
  "advertorial",
  "listicle",
  "quiz",
  "custom",
]);

export const StitcherLayout = z.enum([
  "tailwind-cdn",
  "inline-css-narrow",
  "inline-css-quiz",
]);

export const PlaybookPreset = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  palette: z.object({
    bg: z.string(),
    fg: z.string(),
    primary: z.string(),
    secondary: z.string(),
    accent: z.string().optional(),
    muted: z.string().optional(),
  }),
  fontPair: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  radius: z.enum(["none", "sm", "md", "lg", "pill"]),
  density: z.enum(["tight", "normal", "airy"]),
});

export const PlaybookIntakeField = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  type: z.enum(["text", "textarea", "select"]),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
  hint: z.string().optional(),
});

export const PlaybookSection = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  systemPrompt: z.string().min(1),
  directive: z.string().min(1),
  maxTokens: z.number().int().positive().optional(),
  required: z.boolean().optional(),
});

export const PlaybookCopyRules = z.object({
  bannedWords: z.array(z.string()),
  styleGuide: z.string(),
  executionDirective: z.string(),
});

export const PlaybookImageGenSlot = z.object({
  id: z.string().min(1),
  purpose: z.string(),
  promptTemplate: z.string(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
});

export const PlaybookStitcherConfig = z.object({
  layout: StitcherLayout,
  maxWidth: z.number().int().positive(),
  googleFontHeading: z.string().optional(),
  googleFontBody: z.string().optional(),
  dropshipPack: z.boolean(),
});

export const PlaybookDefinition = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  type: PlaybookType,
  description: z.string(),
  intake: z.array(PlaybookIntakeField),
  sections: z.array(PlaybookSection).min(1),
  presets: z.array(PlaybookPreset).min(1),
  stitcher: PlaybookStitcherConfig,
  copyRules: PlaybookCopyRules,
  imageGen: z.array(PlaybookImageGenSlot),
});

export type PlaybookDefinition = z.infer<typeof PlaybookDefinition>;
