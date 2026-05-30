import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { getClaude, CLAUDE_MODELS } from "./claude";
import { db } from "./db";
import { paths } from "./paths";
import { ANALYZE_IMAGE_PROMPT } from "./prompts/analyze-image";

const MIME_FROM_EXT: Record<
  string,
  "image/jpeg" | "image/png" | "image/webp"
> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Read an image from disk, send it to Claude vision, and persist the text
 * description on the Image row. Errors are caught and logged — callers should
 * not throw on failure.
 */
export async function analyzeImage(imageId: string): Promise<void> {
  const image = await db.image.findUnique({ where: { id: imageId } });
  if (!image) {
    console.warn(`[analyzer] image ${imageId} not found`);
    return;
  }

  // image.url is "/uploads/<productId>/<file>" — resolve it inside public/
  const relativeFromPublic = image.url.replace(/^\//, "");
  const diskPath = path.join(paths.root, "public", relativeFromPublic);
  const ext = path.extname(diskPath).toLowerCase();
  const mediaType = MIME_FROM_EXT[ext];

  const fail = async (message: string) => {
    console.error(`[analyzer] image ${imageId}: ${message}`);
    await db.image.update({
      where: { id: imageId },
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
      max_tokens: 600,
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
            { type: "text", text: ANALYZE_IMAGE_PROMPT },
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

    await db.image.update({
      where: { id: imageId },
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
