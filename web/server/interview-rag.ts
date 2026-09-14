/** @deprecated Use `rag/planner.ts` — kept for import stability. */
export type { PlannedQuestion as RagQuestion } from './rag/planner.ts'
export { planInterview, planFollowUps, scoreClear, tClearReason } from './rag/planner.ts'
export { localFallbackFromPlanner as localFallbackQuestions } from './rag/fallback.ts'
export { mergeQuestions } from './rag/merge.ts'
