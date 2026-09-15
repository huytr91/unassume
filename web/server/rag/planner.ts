import { tClearReason, scoreClear, blockingSlotsFor } from './clear-scorer.ts'
import { metaQuestionsForSlots } from './call-a-policy.ts'
import {
  detectIntent,
  detectLocale,
  pickLocale,
  type IntentFamily,
  type Locale,
} from './ontology.ts'
import { detectDomainPack } from './packs/index.ts'
import type { DomainPack } from './ontology.ts'

export type PlannedQuestion = {
  id: string
  label: string
  text: string
  options: string[]
  priority: 'blocking' | 'important' | 'optional'
  reason: string
  packId?: string
}

export type PersonalHint = {
  slot: string
  value: string
  count: number
}

export type PlanResult = {
  locale: Locale
  intent: IntentFamily
  pack: DomainPack | null
  ordinaryQa: boolean
  /** Only true when local meta questions cannot cover missing blocking slots. */
  needsModelInterview: boolean
  questions: PlannedQuestion[]
  source: 'rag' | 'fallback' | 'rule'
  /** Slots still missing for CLEAR — Call A may only fill these. */
  missingSlots: string[]
}

function injectPersonalOptions(q: PlannedQuestion, hints: PersonalHint[]): PlannedQuestion {
  const hit = hints
    .filter((h) => h.slot === q.id && h.count >= 3)
    .sort((a, b) => b.count - a.count)[0]
  if (!hit) return q
  const tag = `★ ${hit.value}`
  if (q.options.some((o) => o.includes(hit.value))) {
    return {
      ...q,
      options: [tag, ...q.options.filter((o) => !o.includes(hit.value))],
      reason: `${q.reason} + personal RAG`,
    }
  }
  return {
    ...q,
    options: [tag, ...q.options],
    reason: `${q.reason} + personal RAG`,
  }
}

/** Intent-family default meta slots when no pack matches. */
function intentMetaSlots(intent: IntentFamily): string[] {
  switch (intent) {
    case 'research':
    case 'analyze':
    case 'decide':
      return ['scope', 'output', 'constraints', 'audience']
    case 'write':
      return ['objective', 'audience', 'output', 'constraints']
    case 'compare':
    case 'transform':
      return ['source', 'scope', 'output', 'success']
    case 'automate':
      return ['source', 'schedule', 'scope', 'output']
    case 'build':
    default:
      return ['objective', 'output', 'constraints', 'platform']
  }
}

/**
 * Local-first planner.
 * Prefer pack / ontology meta questions. Call A only if missing slots have no local template.
 */
export function planInterview(request: string, personalHints: PersonalHint[] = []): PlanResult {
  const locale = detectLocale(request)
  const trimmed = request.trim()
  const intent = detectIntent(request)
  const pack = detectDomainPack(request)

  // Pure definitional one-liners only — not work requests
  // Note: JS \b is ASCII-only; do not rely on \b after Vietnamese letters.
  const workish =
    /tạo|build|phân tích|analyze|viết|write|thiết kế|design|so sánh|compare|tự động|automate|triển khai|implement|hệ thống|app|crm|thị trường|excel|quy trình/i.test(trimmed)
  const ordinaryQa =
    !workish
    && !pack
    && trimmed.length < 80
    && (
      /^(why|what is|what's)\b/i.test(trimmed)
      || /^(vì sao|tại sao|nghĩa là gì|định nghĩa)(\s|$|[?.!:])/i.test(trimmed)
    )

  if (ordinaryQa) {
    return {
      locale,
      intent: 'research',
      pack: null,
      ordinaryQa: true,
      needsModelInterview: false,
      questions: [],
      source: 'rule',
      missingSlots: [],
    }
  }

  const blocking = blockingSlotsFor(intent, pack)
  let questions: PlannedQuestion[] = []

  if (pack) {
    for (const template of pack.questions) {
      if (template.skipIfRequestMatches?.test(request)) continue
      questions.push({
        id: template.slot,
        label: pickLocale(template.label, locale),
        text: pickLocale(template.ask, locale),
        options: template.options[locale],
        priority: template.priority ?? 'important',
        reason: `Pack ${pack.id}`,
        packId: pack.id,
      })
      if (questions.length >= 4) break
    }
  }

  if (!questions.length) {
    questions = metaQuestionsForSlots(intentMetaSlots(intent), locale)
  }

  // Ensure blocking slots that have meta templates appear
  const have = new Set(questions.map((q) => q.id))
  const stillMissing = blocking.filter((s) => !have.has(s))
  if (stillMissing.length) {
    const extra = metaQuestionsForSlots(stillMissing, locale)
    for (const q of extra) {
      if (!have.has(q.id)) {
        questions.push(q)
        have.add(q.id)
      }
      if (questions.length >= 4) break
    }
  }

  const enriched = questions.slice(0, 4).map((q) => injectPersonalOptions(q, personalHints))
  const covered = new Set(enriched.map((q) => q.id))
  const missingSlots = blocking.filter((s) => !covered.has(s))

  // Call A only if local templates cannot cover a required slot at all
  const needsModelInterview = missingSlots.some((s) => metaQuestionsForSlots([s], locale).length === 0)

  return {
    locale,
    intent,
    pack,
    ordinaryQa: false,
    needsModelInterview,
    questions: enriched,
    source: pack ? 'rag' : 'fallback',
    missingSlots,
  }
}

export function planFollowUps(
  request: string,
  answers: { slot: string; value: string }[],
  personalHints: PersonalHint[] = [],
): PlanResult {
  const base = planInterview(request, personalHints)
  const bySlot = new Map(answers.map((a) => [a.slot, a.value]))
  const scored = scoreClear({
    intent: base.intent,
    pack: base.pack,
    answers: answers.map((a) => ({ slot: a.slot, value: a.value })),
  })

  if (scored.clear) {
    return { ...base, needsModelInterview: false, questions: [], missingSlots: [], source: 'rule' }
  }

  const extra: PlannedQuestion[] = []

  if (base.pack) {
    for (const edge of base.pack.followUps) {
      const val = bySlot.get(edge.fromSlot)
      if (!val || !edge.whenValueMatches.test(val)) continue
      if (bySlot.has(edge.askSlot)) continue
      const template = base.pack.questions.find((q) => q.slot === edge.askSlot)
      if (!template) continue
      extra.push({
        id: template.slot,
        label: pickLocale(template.label, base.locale),
        text: pickLocale(template.ask, base.locale),
        options: template.options[base.locale],
        priority: template.priority ?? 'important',
        reason: `Follow-up after ${edge.fromSlot}`,
        packId: base.pack.id,
      })
    }
  }

  for (const slot of scored.missingBlocking) {
    if (bySlot.has(slot) || extra.some((q) => q.id === slot)) continue
    if (base.pack) {
      const template = base.pack.questions.find((q) => q.slot === slot)
      if (template) {
        extra.push({
          id: template.slot,
          label: pickLocale(template.label, base.locale),
          text: pickLocale(template.ask, base.locale),
          options: template.options[base.locale],
          priority: 'blocking',
          reason: tClearReason(scored, base.locale),
          packId: base.pack.id,
        })
        continue
      }
    }
    const meta = metaQuestionsForSlots([slot], base.locale)
    extra.push(...meta.map((q) => ({ ...q, reason: tClearReason(scored, base.locale) })))
  }

  for (const slot of scored.vagueSlots) {
    if (extra.some((q) => q.id === slot)) continue
    const meta = metaQuestionsForSlots([slot], base.locale)
    if (meta[0]) {
      extra.push({
        ...meta[0],
        text: base.locale === 'vi'
          ? `${meta[0].text} (câu trước còn chung chung — hãy cụ thể hơn)`
          : `${meta[0].text} (previous answer was too vague — be specific)`,
        reason: 'Re-ask vague slot',
      })
    }
  }

  const enriched = extra.slice(0, 4).map((q) => injectPersonalOptions(q, personalHints))
  const missingSlots = scored.missingBlocking.filter((s) => !enriched.some((q) => q.id === s))
  const needsModelInterview = missingSlots.some((s) => metaQuestionsForSlots([s], base.locale).length === 0)

  return {
    ...base,
    needsModelInterview,
    questions: enriched,
    missingSlots: scored.missingBlocking,
    source: enriched.length ? (base.pack ? 'rag' : 'fallback') : 'fallback',
  }
}

export { scoreClear, tClearReason, blockingSlotsFor }
