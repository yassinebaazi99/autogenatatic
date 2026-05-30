import type { PlaybookDefinition } from "../playbooks/types";
// Re-use the existing builtin playbook TypeScript as the canonical section
// templates for Nivara landers. The Playbook JSON editor (DB row) is dead
// in the Nivara design, but the source-of-truth TS files still hold the
// world's best advertorial/listicle/quiz prompts — no reason to rewrite
// them. When src/lib/playbooks/ eventually moves to src/lib/landers/
// templates/, this file becomes the only import we need to update.
import { advertorialPlaybook } from "../playbooks/builtins/advertorial";
import { listiclePlaybook } from "../playbooks/builtins/listicle";
import { quizFunnelPlaybook } from "../playbooks/builtins/quiz-funnel";

import type { LanderType } from "../lander-project/types";

/** A LanderTemplate has the same shape as a PlaybookDefinition — one type
 *  alias to keep the runner happy without introducing a parallel type. */
export type LanderTemplate = PlaybookDefinition;

/**
 * The three lander types Nivara supports, mapped to their underlying
 * template. The generic/landing playbook is intentionally excluded —
 * Nivara's design only ships advertorial, listicle, and quiz.
 */
export const LANDER_TEMPLATES: Record<LanderType, LanderTemplate> = {
  advertorial: advertorialPlaybook,
  listicle: listiclePlaybook,
  quiz: quizFunnelPlaybook,
};

export function getLanderTemplate(type: LanderType): LanderTemplate {
  return LANDER_TEMPLATES[type];
}
