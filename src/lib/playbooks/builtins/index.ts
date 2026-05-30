import type { PlaybookDefinition } from "../types";
import { advertorialPlaybook } from "./advertorial";
import { genericLandingPlaybook } from "./generic-landing";
import { listiclePlaybook } from "./listicle";
import { quizFunnelPlaybook } from "./quiz-funnel";

/** Every builtin playbook. The seed script inserts these on first boot. */
export const BUILTIN_PLAYBOOKS: PlaybookDefinition[] = [
  genericLandingPlaybook,
  advertorialPlaybook,
  listiclePlaybook,
  quizFunnelPlaybook,
];
