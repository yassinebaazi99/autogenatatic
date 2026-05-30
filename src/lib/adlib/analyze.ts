import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLAUDE_MODELS, getClaude } from "../claude";
import { db } from "../db";
import { paths } from "../paths";
import { ANALYZE_AD_REF_PROMPT } from "../prompts/analyze-ad-ref";

// Claude-vision analysis pass for an AdLibraryRef. Mirrors the product-image
// analyzer (src/lib/analyzer.ts) but uses the ad-focused prompt and writes
// to the AdLibraryRef row instead of Image. Errors are caught + persisted —
// callers (after() hooks) should never need to handle exceptions.

const MIME_FROM_EXT: Record<
  string,
  "image/jpeg" | "image/png" | "image/webp"
> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function analyzeAdRef(refId: string): Promise<void> {
  const ref = await db.adLibraryRef.findUnique({ where: { id: refId } });
  if (!ref) {
    console.warn(`[adlib-analyzer] ref ${refId} not found`);
    return;
  }

  const relativeFromPublic = ref.url.replace(/^\//, "");
  const diskPath = path.join(paths.root, "public", relativeFromPublic);
  const ext = path.extname(diskPath).toLowerCase();
  const mediaType = MIME_FROM_EXT[ext];

  const fail = async (message: string) => {
    console.error(`[adlib-analyzer] ref ${refId}: ${message}`);
    await db.adLibraryRef.update({
      where: { id: refId },
      data: {
        analysis: null,
        analysisError: message,
        analyzedAt: new Date(),
      },
    });
  };

  if (!mediaType) {
    await fail(`unsupported extension ${ext || "(none)"}`);
    return;
  }

  try {
    const buffer = await readFile(diskPath);
    const base64 = buffer.toString("base64");

    const response = await getClaude().messages.create({
      model: CLAUDE_MODELS.haiku,
      max_tokens: 900,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            { type: "text", text: ANALYZE_AD_REF_PROMPT },
          ],
        },
      ],
    });

    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    if (!text) {
      await fail("claude returned an empty response");
      return;
    }

    await db.adLibraryRef.update({
      where: { id: refId },
      data: {
        analysis: text,
        analysisError: null,
        analyzedAt: new Date(),
      },
    });
  } catch (err) {
    await fail(err instanceof Error ? err.message : String(err));
  }
}
