import { z } from "zod";

// Shared by the new-product form (server-side validation) and any future
// client-side uses. Keep this file free of server-only imports.

export const ProductInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().min(1, "Description is required").max(4000),
  price: z.string().trim().max(60).optional().or(z.literal("")),
  audience: z.string().trim().max(200).optional().or(z.literal("")),
  tone: z.string().trim().max(60).optional().or(z.literal("")),
  links: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof ProductInput>;

// ThemeSpec produced by the visual-director agent.
export const ThemeSpec = z.object({
  palette: z.object({
    primary: z.string(),
    secondary: z.string(),
    bg: z.string(),
    fg: z.string(),
  }),
  fontPair: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  radius: z.enum(["none", "sm", "md", "lg", "pill"]),
  density: z.enum(["tight", "normal", "airy"]),
  imageStyle: z.enum(["photographic", "illustrated", "minimal", "maximalist"]),
});

export type ThemeSpec = z.infer<typeof ThemeSpec>;

// A single image request emitted by a section agent.
export const ImageRequest = z.object({
  purpose: z.string(),
  prompt: z.string(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
});

export type ImageRequest = z.infer<typeof ImageRequest>;

// Allowed image kinds + origins (keep in sync with prisma/schema.prisma).
export const ImageKind = z.enum([
  "product",
  "hero",
  "background",
  "icon",
  "illustration",
]);
export type ImageKind = z.infer<typeof ImageKind>;

export const ImageOrigin = z.enum(["uploaded", "generated"]);
export type ImageOrigin = z.infer<typeof ImageOrigin>;
