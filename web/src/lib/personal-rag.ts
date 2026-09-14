/**
 * Phase 4 — Personal RAG on this device only.
 * No cloud telemetry, no model training. Frequent answers become local options.
 */

export type PersonalEntry = {
  intent: string
  slot: string
  value: string
  count: number
  lastUsed: string
  source: 'option' | 'other'
}

export type PersonalHint = {
  slot: string
  value: string
  count: number
}

const STORAGE_KEY = 'unassume.personal-rag.v1'
const ENABLED_KEY = 'unassume.personal-rag.enabled'

const THRESHOLD = 3

export function isPersonalRagEnabled(): boolean {
  const raw = localStorage.getItem(ENABLED_KEY)
  if (raw === null) return true
  return raw === '1'
}

export function setPersonalRagEnabled(on: boolean) {
  localStorage.setItem(ENABLED_KEY, on ? '1' : '0')
}

export function loadPersonalEntries(): PersonalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersonalEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function savePersonalEntries(entries: PersonalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 500)))
}

export function clearPersonalRag() {
  localStorage.removeItem(STORAGE_KEY)
}

const SKIP_VALUE = /^(not decided|chưa quyết định|chưa xác định|ok|tùy|được|none|không)$/i

/** Record answers after a successful interview round / CLEAR. */
export function recordPersonalAnswers(input: {
  intent?: string
  answers: { slot: string; value: string; fromOther?: boolean }[]
}) {
  if (!isPersonalRagEnabled()) return
  const intent = input.intent || 'general'
  const entries = loadPersonalEntries()
  const now = new Date().toISOString().slice(0, 10)

  for (const a of input.answers) {
    const value = a.value.replace(/^\★\s*/, '').trim()
    if (!value || value.length < 2 || SKIP_VALUE.test(value)) continue
    const idx = entries.findIndex((e) => e.intent === intent && e.slot === a.slot && e.value === value)
    if (idx >= 0) {
      entries[idx] = {
        ...entries[idx],
        count: entries[idx].count + 1,
        lastUsed: now,
        source: a.fromOther ? 'other' : entries[idx].source,
      }
    } else {
      entries.push({
        intent,
        slot: a.slot,
        value,
        count: 1,
        lastUsed: now,
        source: a.fromOther ? 'other' : 'option',
      })
    }
  }

  savePersonalEntries(entries)
}

/** Hints for server planner — only values used often enough. */
export function getPersonalHints(intent?: string): PersonalHint[] {
  if (!isPersonalRagEnabled()) return []
  const entries = loadPersonalEntries()
  return entries
    .filter((e) => e.count >= THRESHOLD)
    .filter((e) => !intent || e.intent === intent || e.intent === 'general')
    .map((e) => ({ slot: e.slot, value: e.value, count: e.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40)
}
