import type { PlannedQuestion } from './planner.ts'
import { mergeCallAQuestions } from './call-a-policy.ts'

/** @deprecated Prefer mergeCallAQuestions — kept for any legacy imports. */
export function mergeQuestions(seed: PlannedQuestion[], model: PlannedQuestion[]): PlannedQuestion[] {
  const allowed = [...new Set([...seed, ...model].map((q) => q.id))]
  return mergeCallAQuestions(seed, model, allowed)
}

export { mergeCallAQuestions }
