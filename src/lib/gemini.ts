import { GoogleGenAI, Modality } from "@google/genai";

// Model IDs — Nano Banana is gemini-2.5-flash-image. Keep the pro slot
// reserved for when we want higher-quality generations on big batches.
export const GEMINI_MODELS = {
  flashImage: "gemini-2.5-flash-image",
  proImage: "gemini-2.5-pro-image",
} as const;

const globalForGoogle = globalThis as unknown as {
  googleGenAI: GoogleGenAI | undefined;
};

/**
 * Lazy constructor — don't read process.env at module load. Importing this
 * file from a server action crashes the action bundle at boot if the key
 * isn't set, even when no call actually happens. Lazy access sidesteps it.
 */
export function getGemini(): GoogleGenAI {
  if (globalForGoogle.googleGenAI) return globalForGoogle.googleGenAI;

  // Accept either env var name — GEMINI_API_KEY is what the Google docs show,
  // GOOGLE_API_KEY is what older .env files may have. Either works.
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY (or GOOGLE_API_KEY) is not set. Add it to .env.local.",
    );
  }

  const client = new GoogleGenAI({ apiKey });
  if (process.env.NODE_ENV !== "production") {
    globalForGoogle.googleGenAI = client;
  }
  return client;
}

export type GeneratedImage = {
  buffer: Buffer;
  mimeType: string;
  model: string;
};

/**
 * Generate a single image with Nano Banana. If `referenceImage` is provided,
 * the call becomes image-to-image (edit/restyle) — the model uses the ref
 * as a strong visual anchor. Otherwise it's pure text-to-image.
 *
 * Throws on safety blocks, empty candidates, or missing image parts so the
 * caller can record the failure on the StaticAd row — don't swallow here.
 */
export async function generateNanoBananaImage(args: {
  prompt: string;
  referenceImage?: {
    buffer: Buffer;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
  };
}): Promise<GeneratedImage> {
  const model = GEMINI_MODELS.flashImage;
  const { prompt, referenceImage } = args;

  // Build the contents payload. Pattern comes from @google/genai v1.49 README
  // and the image-to-image example in dist/genai.d.ts (Part @ 8660).
  const contents = referenceImage
    ? [
        {
          role: "user" as const,
          parts: [
            {
              inlineData: {
                mimeType: referenceImage.mimeType,
                data: referenceImage.buffer.toString("base64"),
              },
            },
            { text: prompt },
          ],
        },
      ]
    : prompt;

  const response = await getGemini().models.generateContent({
    model,
    contents,
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("Nano Banana returned no candidates");
  }

  // Safety / policy blocks surface here. Propagate the reason so the user
  // can see why on the review grid.
  const finishReason = candidate.finishReason;
  if (
    finishReason &&
    !["STOP", "MAX_TOKENS"].includes(String(finishReason))
  ) {
    throw new Error(`Nano Banana refused: ${finishReason}`);
  }

  const parts = candidate.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    // Some refusals return a text-only part explaining the block. Bubble it
    // up so the error card is actually useful.
    const textPart = parts.find((p) => typeof p.text === "string");
    const detail = textPart?.text ? `: ${textPart.text}` : "";
    throw new Error(`Nano Banana returned no image part${detail}`);
  }

  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    mimeType: imagePart.inlineData.mimeType ?? "image/png",
    model,
  };
}
