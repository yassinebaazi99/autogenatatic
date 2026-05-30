import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLAUDE_MODELS, getClaude } from "../claude";
import { paths } from "../paths";
import { NANO_BANANA_WRITER_SYSTEM } from "../prompts/nano-banana-writer";

// Claude Opus writes the Nano Banana prompt for one reference image. It
// sees:
//  - brand context (from buildBrandContext)
//  - user's free-text direction
//  - optional angle doc text
//  - the reference image's existing Claude vision analysis
//  - optional regen note ("too salesy", "warmer light")
//  - the reference image itself as a vision input, so it can ground its
//    composition cues in what the ad actually looks like
//
// Output is a single paragraph — see NANO_BANANA_WRITER_SYSTEM for the
// contract. We return { prompt, promptTokens, outputTokens } so the runner
// can record usage on the StaticGenPromptHistory row if we decide to.

export type WritePromptInput = {
  brandContext: string;
  userPrompt: string;
  angleText: string | null;
  refAnalysis: string | null;
  refImagePath: string; // relative URL like /uploads/brand/<id>/ads/<file>
  refMime: string;
  regenNote: string | null;
};

export async function writeNanoBananaPrompt(
  input: WritePromptInput,
): Promise<string> {
  const relativeFromPublic = input.refImagePath.replace(/^\//, "");
  const diskPath = path.join(paths.root, "public", relativeFromPublic);
  const mediaType = normalizeImageMime(input.refMime);

  // Match the Anthropic SDK's ImageBlockParam shape exactly — the narrow
  // media_type union is load-bearing for typecheck.
  type ImagePart = {
    type: "image";
    source: {
      type: "base64";
      media_type: "image/jpeg" | "image/png" | "image/webp";
      data: string;
    };
  };

  let image: ImagePart | null = null;
  try {
    const buffer = await readFile(diskPath);
    image = {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: buffer.toString("base64"),
      },
    };
  } catch {
    // If the ref file is missing on disk, still let the prompt writer run —
    // the text analysis is enough to produce a reasonable prompt. The
    // resulting static may just be lower quality.
    image = null;
  }

  const textBlocks: string[] = [];

  if (input.brandContext) {
    textBlocks.push(input.brandContext);
  }

  if (input.angleText) {
    textBlocks.push(`## Angle doc\n${input.angleText}`);
  }

  if (input.refAnalysis) {
    textBlocks.push(`## Reference ad analysis\n${input.refAnalysis}`);
  }

  textBlocks.push(`## User direction\n${input.userPrompt || "(no user direction provided — follow the reference ad's angle as-is)"}`);

  if (input.regenNote) {
    textBlocks.push(
      `## Regeneration note\nThe last generation didn't work. User feedback: "${input.regenNote}". Incorporate this into the new prompt.`,
    );
  }

  textBlocks.push(
    `## Your task\nWrite ONE Nano Banana prompt for a new static ad that emulates the reference ad above but showcases THIS brand's product. One paragraph, 80–160 words, prose only. Output nothing else.`,
  );

  const userContent: Array<ImagePart | { type: "text"; text: string }> = [];
  if (image) userContent.push(image);
  userContent.push({ type: "text", text: textBlocks.join("\n\n") });

  const response = await getClaude().messages.create({
    model: CLAUDE_MODELS.opus,
    max_tokens: 700,
    temperature: 0.8,
    system: NANO_BANANA_WRITER_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude returned an empty Nano Banana prompt");
  }

  // Strip any accidental preamble like "Prompt:" or wrapping quotes.
  return cleanupPrompt(text);
}

function normalizeImageMime(
  mime: string,
): "image/jpeg" | "image/png" | "image/webp" {
  if (mime === "image/jpeg" || mime === "image/jpg") return "image/jpeg";
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  // Reasonable fallback — JPEG is the most permissive across vision APIs.
  return "image/jpeg";
}

function cleanupPrompt(raw: string): string {
  let t = raw.trim();

  // Remove common preamble patterns.
  t = t.replace(/^(here'?s?\s+(the|your|a)\s+prompt:?\s*)/i, "");
  t = t.replace(/^prompt:?\s*/i, "");

  // Strip wrapping quotes if Claude added them to "the whole thing".
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }

  return t;
}
