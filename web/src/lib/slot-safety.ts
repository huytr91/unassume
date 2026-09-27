/**
 * Slot / confirmed-value hygiene — block instruction-injection style strings
 * from Personal ★ boost and from compiled verified briefs.
 */

const MAX_SLOT_VALUE_LEN = 280

/** Vague / non-answers already skipped elsewhere; keep aligned. */
export const SKIP_SLOT_VALUE =
  /^(not decided|chưa quyết định|chưa xác định|ok|tùy|được|none|không)$/i

/**
 * Patterns that look like prompt-injection / jailbreak, not real brief facts.
 * Conservative: prefer false negatives over blocking normal product language.
 */
const UNSAFE_SLOT_VALUE =
  /ignore (all |any )?(previous|prior|above|earlier) (instructions?|prompts?|rules?)|disregard (all |any )?(previous|prior) |forget (your|all) (instructions?|rules?)|you are now |jailbreak|DAN mode|do not follow (your|the) (system|developer)|system\s*:|<\s*\/?\s*system\s*>|\[INST\]|<<SYS>>|override (the )?system|reveal (your )?(system )?prompt|bypass (safety|filter)|act as if you (have )?no (restrictions?|rules?)/i

export function isUnsafeSlotValue(value: string): boolean {
  const v = value.replace(/^\★\s*/, '').trim()
  if (!v) return true
  if (v.length > MAX_SLOT_VALUE_LEN) return true
  if (UNSAFE_SLOT_VALUE.test(v)) return true
  return false
}

/** True if value may be stored as Personal ★ or emitted into a brief. */
export function isSafeSlotValue(value: string): boolean {
  const v = value.replace(/^\★\s*/, '').trim()
  if (!v || v.length < 2) return false
  if (SKIP_SLOT_VALUE.test(v)) return false
  if (isUnsafeSlotValue(v)) return false
  return true
}

export function sanitizeConfirmedFacts<T extends { id: string; label: string; value: string }>(
  facts: T[],
): T[] {
  return facts.filter((f) => isSafeSlotValue(f.value))
}
