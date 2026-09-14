import type { DomainPack, IntentFamily, Locale, SlotId } from './ontology.ts'
import { INTENT_FAMILIES } from './ontology.ts'

const DEFERRED = /^(not decided|chưa quyết định|chưa xác định|unsure|n\/a|none|không rõ)$/i
const VAGUE =
  /^(ok|okay|oke|ừ|uh|um|yes|no|có|không|tùy|tùy bạn|whatever|something|idk|ko biết|không biết|gì cũng được|maybe|fine|được)$/i

export type ClearedAnswer = { slot: SlotId | string; value: string }

export type ClearScoreInput = {
  intent: IntentFamily
  pack: DomainPack | null
  answers: ClearedAnswer[]
  /** Slots already present in the original request text */
  requestSatisfiedSlots?: SlotId[]
}

export type ClearScoreResult = {
  clear: boolean
  filledBlocking: string[]
  missingBlocking: string[]
  vagueSlots: string[]
  reason: string
}

export function isDeferred(value: string): boolean {
  return DEFERRED.test(value.trim())
}

export function isFilled(value: string | undefined): boolean {
  const v = (value || '').trim()
  if (!v) return false
  return true
}

export function isClearValue(value: string | undefined): boolean {
  if (!isFilled(value)) return false
  const v = value!.trim()
  if (v.length < 2) return false
  if (VAGUE.test(v)) return false
  return true
}

/** Blocking slots: pack owns CLEAR when detected; else intent cores. */
export function blockingSlotsFor(intent: IntentFamily, pack: DomainPack | null): SlotId[] {
  if (pack) return [...pack.requiredSlots]
  const intentDef = INTENT_FAMILIES.find((i) => i.id === intent)
  return [...(intentDef?.coreSlots ?? ['objective', 'output'])]
}

/**
 * Phase 3 — CLEAR scorer independent of the model.
 * Deferred ("Not decided") counts as resolved for that slot (explicit deferral).
 */
export function scoreClear(input: ClearScoreInput): ClearScoreResult {
  const blocking = blockingSlotsFor(input.intent, input.pack)
  const bySlot = new Map(input.answers.map((a) => [a.slot, a.value.trim()]))
  const requestHit = new Set(input.requestSatisfiedSlots ?? [])

  const filledBlocking: string[] = []
  const missingBlocking: string[] = []
  const vagueSlots: string[] = []

  for (const slot of blocking) {
    if (requestHit.has(slot)) {
      filledBlocking.push(slot)
      continue
    }
    const value = bySlot.get(slot)
    if (!isFilled(value)) {
      missingBlocking.push(slot)
      continue
    }
    if (isDeferred(value!)) {
      filledBlocking.push(slot)
      continue
    }
    if (!isClearValue(value)) {
      vagueSlots.push(slot)
      continue
    }
    filledBlocking.push(slot)
  }

  const clear = missingBlocking.length === 0 && vagueSlots.length === 0
  const reason = clear
    ? 'Blocking slots confirmed or explicitly deferred.'
    : [
        missingBlocking.length ? `Missing: ${missingBlocking.join(', ')}` : '',
        vagueSlots.length ? `Vague: ${vagueSlots.join(', ')}` : '',
      ].filter(Boolean).join(' · ')

  return { clear, filledBlocking, missingBlocking, vagueSlots, reason }
}

export function tClearReason(result: ClearScoreResult, locale: Locale): string {
  if (result.clear) {
    return locale === 'vi'
      ? 'Đã đủ slot bắt buộc (hoặc đã chọn chưa quyết định).'
      : result.reason
  }
  if (locale === 'vi') {
    const parts: string[] = []
    if (result.missingBlocking.length) parts.push(`Còn thiếu: ${result.missingBlocking.join(', ')}`)
    if (result.vagueSlots.length) parts.push(`Còn chung chung: ${result.vagueSlots.join(', ')}`)
    return parts.join(' · ') || 'Chưa CLEAR'
  }
  return result.reason
}
