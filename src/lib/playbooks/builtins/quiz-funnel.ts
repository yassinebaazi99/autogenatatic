import type { PlaybookDefinition } from "../types";
import {
  SECTION_HARD_RULES,
  UNIVERSAL_BANNED_WORDS,
  UNIVERSAL_STYLE_GUIDE,
} from "./_shared";

// Interactive quiz → personalized recommendation → offer. The quiz requires
// client-side state management, so the inline-css-quiz stitcher injects a
// small plain-JS engine that toggles step visibility. Agents produce the
// HTML for each step; the stitcher wires up navigation.

const QUIZ_HARD_RULES = `${SECTION_HARD_RULES}

QUIZ VOICE:
- Conversational, not clinical. You're talking, not preaching.
- Short questions. Short answers. No essay-length options.
- Every question should feel like it actually changes the outcome — even if it doesn't in the code.
- Results page speaks directly to the quiz-taker: "Based on your answers…"

QUIZ STEP MARKUP:
- Each question is a <div class="lf-quiz-step" data-step="N"> block with a <h2>question text</h2> and a list of <button type="button" class="lf-quiz-answer" data-next="N+1">answer text</button> elements.
- Steps 2..N transition to the results step with data-next="results".
- The stitcher wires data-next handlers via inline JS — don't emit any scripts yourself.`;

export const quizFunnelPlaybook: PlaybookDefinition = {
  slug: "quiz-funnel",
  name: "Quiz Funnel",
  type: "quiz",
  description:
    "Interactive 60-second quiz that ends in a personalized product recommendation. Ad → 'Take this quiz' → 4–6 questions → results page with offer. Highest engagement of the three formats. Works great for skincare, supplements, pet products, and anything where 'what's right for YOU' is a natural framing.",
  intake: [
    {
      id: "quiz_topic",
      label: "What is the quiz discovering?",
      type: "text",
      placeholder:
        "Which coffee brewing method fits your morning / Your skin type / Your dog's ideal food",
      required: true,
      hint: "The question the quiz is secretly answering. This is the hook.",
    },
    {
      id: "question_count",
      label: "Number of questions",
      type: "select",
      options: ["4", "5", "6"],
      required: true,
      hint: "Sweet spot is 5. Fewer feels like a form, more feels like a homework assignment.",
    },
    {
      id: "result_framing",
      label: "How to frame the result",
      type: "textarea",
      placeholder: "You're a 'Slow Morning Pourer' — you value ritual and control over speed.",
      required: true,
      hint: "The personality/type label the user gets at the end. The product recommendation hangs off this label.",
    },
  ],
  sections: [
    {
      id: "landing",
      label: "Quiz landing intro",
      systemPrompt: QUIZ_HARD_RULES,
      directive: `## Your job: Quiz landing intro (step 0)

The first thing the user sees. Grab attention with a one-line headline about the quiz topic, a one-line subhead ("60 seconds, 5 questions"), and a big "Start Quiz" button that transitions to step 1.

Output: <section class="lf-quiz-step" data-step="0"><h1>…</h1><p>…</p><button type="button" class="lf-quiz-answer lf-quiz-primary" data-next="1">Start Quiz</button></section>.`,
      maxTokens: 400,
    },
    {
      id: "questions",
      label: "Quiz questions (steps 1..N)",
      systemPrompt: QUIZ_HARD_RULES,
      directive: `## Your job: Every question step

Based on question_count from the intake (4/5/6), output that many <section class="lf-quiz-step" data-step="N"> blocks. Each contains:
- <h2>the question text</h2>
- 3–4 <button type="button" class="lf-quiz-answer" data-next="N+1">answer</button> elements

The FINAL question's answer buttons should have data-next="results" so they transition to the results step.

Questions should feel genuinely diagnostic — ask about preferences, habits, pain points, goals. They should map plausibly to the result_framing intake.

Output all questions in ONE section wrapper but with N separate <section class="lf-quiz-step"> children:
<section class="lf-quiz-questions">
  <section class="lf-quiz-step" data-step="1">…</section>
  <section class="lf-quiz-step" data-step="2">…</section>
  …
</section>`,
      maxTokens: 2500,
    },
    {
      id: "analyzing",
      label: "'Analyzing your answers' loader",
      systemPrompt: QUIZ_HARD_RULES,
      directive: `## Your job: The fake analyzing step

A short step that feels like the quiz is computing something. Something like:
- "Analyzing your answers…"
- A progress bar or spinning dots
- Auto-transitions to results after ~2 seconds

The stitcher will handle the auto-transition via inline JS if you give the wrapper a data-auto-next="results" attribute and a data-delay="2000" attribute.

Output: <section class="lf-quiz-step" data-step="analyzing" data-auto-next="results" data-delay="2000"><h2>Analyzing your answers…</h2><div class="lf-loader"></div></section>.`,
      maxTokens: 400,
    },
    {
      id: "results",
      label: "Results page + product recommendation",
      systemPrompt: QUIZ_HARD_RULES,
      directive: `## Your job: The results step — the payoff + the product offer

This is where the money is made. Structure:
- Personalized label pulled from result_framing intake ("You're a [label]")
- 2–3 sentence explanation of what that means for the quiz-taker
- "Based on your answers, we recommend…" → featured product (name, image if available, short why)
- 2–3 bullet points of why this product matches the quiz-taker's profile, grounded in the intake and product fields
- Primary CTA button ("Claim My Match" or "See the Recommendation")
- Small trust line underneath ("Used by X happy [audience]")

Output: <section class="lf-quiz-step" data-step="results"><h1>Your result: …</h1><p>…</p><div class="lf-product-card">…</div><a class="lf-cta-btn">…</a><p class="lf-trust">…</p></section>.`,
      maxTokens: 1500,
    },
    {
      id: "testimonials",
      label: "Matching testimonials",
      systemPrompt: QUIZ_HARD_RULES,
      directive: `## Your job: Testimonials that match the quiz-taker's profile

2–3 short testimonial cards framed as "Other [result_framing label] people said…". Specific, believable, include hesitation → conversion. Mark as data-example="true".

Output: <section class="lf-quiz-testimonials"><h2>Others like you said</h2><div class="lf-review">…</div>…</section>.`,
      maxTokens: 1000,
    },
  ],
  presets: [
    {
      id: "soft-conversational",
      name: "Soft Conversational",
      description: "Rounded, friendly, feels like a chat. Best for consumer goods.",
      palette: {
        bg: "#fef3e8",
        fg: "#422006",
        primary: "#ea580c",
        secondary: "#a16207",
        accent: "#16a34a",
        muted: "#fef9c3",
      },
      fontPair: { heading: "Nunito", body: "Nunito" },
      radius: "pill",
      density: "normal",
    },
    {
      id: "clinical-diagnostic",
      name: "Clinical Diagnostic",
      description: "Feels like a doctor's questionnaire. Best for skincare, supplements, health.",
      palette: {
        bg: "#f8fafc",
        fg: "#0f172a",
        primary: "#0ea5e9",
        secondary: "#64748b",
        accent: "#14b8a6",
        muted: "#e2e8f0",
      },
      fontPair: { heading: "system-ui", body: "system-ui" },
      radius: "md",
      density: "normal",
    },
    {
      id: "night-mode",
      name: "Night Mode",
      description: "Dark background, neon accents. Great for tech/gaming/fitness.",
      palette: {
        bg: "#0f172a",
        fg: "#e2e8f0",
        primary: "#22d3ee",
        secondary: "#64748b",
        accent: "#f59e0b",
        muted: "#1e293b",
      },
      fontPair: { heading: "system-ui", body: "system-ui" },
      radius: "md",
      density: "normal",
    },
  ],
  stitcher: {
    layout: "inline-css-quiz",
    maxWidth: 640,
    googleFontHeading: "Nunito",
    googleFontBody: "Nunito",
    dropshipPack: true,
  },
  copyRules: {
    bannedWords: UNIVERSAL_BANNED_WORDS,
    styleGuide: UNIVERSAL_STYLE_GUIDE,
    executionDirective:
      "You are building a quiz that FEELS like it learns about the user. Every question should seem relevant to the outcome, even though the code routes everyone to the same result. The user should finish the quiz feeling seen, not sold.",
  },
  imageGen: [
    {
      id: "hero-quiz-intro",
      purpose: "Welcoming quiz-intro hero illustration",
      promptTemplate:
        "Friendly illustration representing {{quiz_topic}}, warm colors, approachable, editorial magazine style",
      aspectRatio: "16:9",
    },
    {
      id: "results-hero",
      purpose: "Celebratory results-page image",
      promptTemplate:
        "Aspirational photo of {{product.name}} in use, matching the mood of a quiz-result reveal, soft lighting",
      aspectRatio: "4:3",
    },
  ],
};
