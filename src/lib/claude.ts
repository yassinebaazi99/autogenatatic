import Anthropic from "@anthropic-ai/sdk";

// Model IDs — keep these pinned so "regenerate" stays reproducible.
export const CLAUDE_MODELS = {
  // Creative work: section agents, visual director.
  opus: "claude-opus-4-6",
  // Fast + cheap: image analysis, sanity passes.
  haiku: "claude-haiku-4-5",
} as const;

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

/**
 * Lazily constructs the Anthropic client. Don't touch process.env at module
 * load time — otherwise importing this file from a server action crashes
 * the whole action bundle when ANTHROPIC_API_KEY is missing, even if the
 * caller never actually makes an API call.
 */
export function getClaude(): Anthropic {
  if (globalForAnthropic.anthropic) return globalForAnthropic.anthropic;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.local.example).",
    );
  }

  const client = new Anthropic({ apiKey });
  if (process.env.NODE_ENV !== "production") {
    globalForAnthropic.anthropic = client;
  }
  return client;
}
