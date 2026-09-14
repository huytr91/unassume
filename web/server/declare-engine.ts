import { localFallbackFromPlanner } from './rag/fallback.ts'
import {
  CALL_A_SYSTEM,
  filterCallAQuestions,
  mergeCallAQuestions,
  metaQuestionsForSlots,
} from './rag/call-a-policy.ts'
import {
  planFollowUps,
  planInterview,
  scoreClear,
  type PersonalHint,
  type PlannedQuestion,
} from './rag/planner.ts'
import { detectDomainPack } from './rag/packs/index.ts'
import { detectIntent, detectLocale } from './rag/ontology.ts'
import { buildFollowUpQuestions, looksLikeThinRefusal, nextClarifySlots } from './rag/thin-answer.ts'
import type { ChatMessage, ProviderId } from './providers.ts'

export type Fact = { id: string; label: string; value: string }
export type Answer = { questionId: string; value: string }

export type InterviewQuestion = {
  id: string
  label?: string
  text: string
  context?: string
  options: string[]
  allowCustom: true
  allowNotDecided?: boolean
  priority: 'blocking' | 'important' | 'optional'
  reason?: string
}

export type InterviewTurn = {
  status: 'NOT_CLEAR' | 'CLEAR'
  progress: { confirmedCount: number; remainingEstimate: number; percentHint: number }
  questions: InterviewQuestion[]
  confirmed: Fact[]
  suggested: Fact[]
  unknown: { id: string; label: string; impact: string }[]
  reasonSummary?: string
  source?: 'rag' | 'model' | 'fallback' | 'merged' | 'clear'
  meta?: { intent?: string; pack?: string | null }
}

export type VerifiedResult = {
  answer: string
  structuredRequest: string
  verifiedPrompt: string
  mode?: 'verified' | 'passthrough'
  /** When true, UI should show answer AND offer continue-clarify (never hide the answer). */
  needsMoreInterview?: boolean
  followUpQuestions?: InterviewQuestion[]
  reasonSummary?: string
}

type ChatFn = (args: {
  provider: ProviderId
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature?: number
  signal?: AbortSignal
}) => Promise<string>

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = (fenced?.[1] ?? text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Model did not return JSON')
  return JSON.parse(raw.slice(start, end + 1))
}

const ANSWER_SYSTEM = `You are Unassume — a professional answer compiler.

Hard rule: ALWAYS deliver a useful answer. Never reply with refusal-only text like "không đủ dữ liệu" / "cannot determine" without a concrete deliverable.

How to handle missing details:
- State explicit assumptions in one short line.
- Give a practical framework, checklist, or steps the user can use now.
- Label what would change if they add more specifics later.
- Do NOT invent fake project facts, numbers, credentials, schedules, or "already done" claims.

Style:
- Match the user's language (Vietnamese or English).
- Clear, direct, professional. No filler, no hype, no "As an AI…".

Return ONE JSON object only:
{
  "answer": string,
  "structuredRequest": string,
  "verifiedPrompt": string,
  "adequacy": "sufficient" | "needs_more"
}

adequacy = "needs_more" means the answer is useful but would get sharper with more brief details (subject/audience/channel). Still include a full answer.
adequacy = "sufficient" means confirmed facts already support a solid deliverable.

structuredRequest — plain text with these section headers (only facts the user confirmed; do not invent Fed/VIX/news claims):
OBJECTIVE, CONFIRMED REQUIREMENTS, CONSTRAINTS, UNRESOLVED ITEMS, OUTPUT REQUIREMENTS, INSTRUCTIONS TO DOWNSTREAM AI.
Omit BUSINESS RULES / USER DECISIONS unless the user explicitly stated them.

verifiedPrompt — a single ready-to-paste brief for another AI/agent. Must include:
1) One short instruction line (do not invent; use confirmed only; ask if material gaps remain)
2) The full structuredRequest body
Never set verifiedPrompt to only the user's original one-line question.`

const PASSTHROUGH_SYSTEM = `You are Unassume in partial-clarification mode (user chose to proceed early).

Hard rule: ALWAYS deliver a useful answer (framework / checklist / steps). Never refusal-only.

Rules:
1. originalRequest is the goal; confirmed facts are constraints; state assumptions when needed.
2. Do NOT invent credentials, schedules, destinations, or claims that tools already ran.
3. Match the user's language. Professional, concise — no filler, no "As an AI…".
4. If Vietnamese, one short opening line that clarification was partial. If English, one short English equivalent. No ALL-CAPS labels in the answer body.

Return ONE JSON object only:
{
  "answer": string,
  "structuredRequest": string,
  "verifiedPrompt": string,
  "adequacy": "sufficient" | "needs_more"
}`

function buildStructuredFallback(
  request: string,
  confirmed: Fact[],
  locale: 'vi' | 'en',
  mode: 'verified' | 'passthrough',
): string {
  const lines = confirmed.map((f) => `- ${f.label}: ${f.value}`).join('\n') || '(none)'
  const unresolved = confirmed.length < 2
    ? (locale === 'vi' ? 'Một số chi tiết brief chưa được người dùng xác nhận.' : 'Some brief details were not confirmed by the user.')
    : (locale === 'vi' ? 'Không có — hoặc chỉ các mục người dùng đã để mở.' : 'None — or only items the user left open.')
  const instr = locale === 'vi'
    ? 'Chỉ dùng CONFIRMED REQUIREMENTS. Không bịa số liệu, nguồn, hay side-effect. Thiếu dữ liệu thực tế thì nêu giả định / hỏi thêm — vẫn đưa khung hữu ích.'
    : 'Use only CONFIRMED REQUIREMENTS. Do not invent figures, sources, or side-effects. If real data is missing, state assumptions / ask — still give a useful framework.'
  return [
    'OBJECTIVE',
    request.trim(),
    '',
    'CONFIRMED REQUIREMENTS',
    lines,
    '',
    'CONSTRAINTS',
    mode === 'passthrough'
      ? (locale === 'vi' ? 'Brief làm rõ một phần — không bịa phần còn thiếu.' : 'Partial clarification — do not invent missing pieces.')
      : (locale === 'vi' ? 'Không bịa yêu cầu chưa được xác nhận.' : 'Do not invent unconfirmed requirements.'),
    '',
    'UNRESOLVED ITEMS',
    unresolved,
    '',
    'OUTPUT REQUIREMENTS',
    locale === 'vi' ? 'Trả lời rõ, có cấu trúc; nêu giả định nếu cần.' : 'Clear structured answer; state assumptions if needed.',
    '',
    'INSTRUCTIONS TO DOWNSTREAM AI',
    instr,
  ].join('\n')
}

function isWeakPortablePrompt(prompt: string, request: string): boolean {
  const p = prompt.trim()
  const r = request.trim()
  if (!p) return true
  if (p.length < 100) return true
  if (p === r) return true
  // Mostly just the raw question
  if (r.length >= 8 && p.replace(/\s+/g, ' ').includes(r) && p.length < r.length + 60) return true
  if (!/OBJECTIVE|CONFIRMED REQUIREMENTS|INSTRUCTIONS/i.test(p)) return true
  return false
}

function buildPortablePrompt(structured: string, locale: 'vi' | 'en'): string {
  const lead = locale === 'vi'
    ? 'Thực hiện brief sau đây. Chỉ dùng phần đã xác nhận. Không bịa. Phần còn mở phải nêu rõ hoặc hỏi lại trước khi khẳng định.'
    : 'Execute the brief below. Use only confirmed items. Do not invent. State or ask about open items before asserting.'
  return `${lead}\n\n${structured.trim()}`
}

function friendlyEngineError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err)
  if (/did not return json/i.test(raw)) {
    return Object.assign(new Error('Model trả về sai định dạng. Thử lại hoặc đổi model.'), { status: 502 })
  }
  if (/empty/i.test(raw)) {
    return Object.assign(new Error('Model không trả lời được. Thử lại hoặc đổi model.'), { status: 502 })
  }
  return err instanceof Error ? err : new Error(raw)
}

function userFacingSummary(locale: 'vi' | 'en', kind: 'ask' | 'clear' | 'ordinary' | 'follow'): string {
  if (locale === 'vi') {
    switch (kind) {
      case 'ordinary':
        return 'Đủ rõ để trả lời.'
      case 'clear':
        return 'Đã đủ thông tin để trả lời.'
      case 'follow':
        return 'Còn vài điểm cần làm rõ — chọn phương án hoặc nhập Phương án khác.'
      default:
        return 'Chọn phương án phù hợp hoặc nhập Phương án khác.'
    }
  }
  switch (kind) {
    case 'ordinary':
      return 'Clear enough to answer.'
    case 'clear':
      return 'Enough information to answer.'
    case 'follow':
      return 'A few points still need clarification — choose an option or use Other.'
    default:
      return 'Choose an option or enter your own under Other.'
  }
}

function toInterview(q: PlannedQuestion): InterviewQuestion {
  return {
    id: q.id,
    label: q.label,
    text: q.text,
    options: q.options.map((o) => o.replace(/^\★\s*/, '★ ')),
    allowCustom: true,
    allowNotDecided: true,
    priority: q.priority,
    // Internal reason kept off the wire for UI cleanliness
  }
}

function parseModelQuestions(raw: unknown): PlannedQuestion[] {
  const data = raw as { questions?: Array<Partial<PlannedQuestion> & { ask?: string }> }
  if (!Array.isArray(data.questions)) return []
  return data.questions.slice(0, 4).map((q, i) => ({
    id: (q.id || `m${i + 1}`) as PlannedQuestion['id'],
    label: String(q.label || q.id || `Q${i + 1}`),
    text: String(q.text || q.ask || 'Please clarify'),
    options: Array.isArray(q.options) && q.options.length
      ? q.options.map(String).slice(0, 6)
      : ['Yes', 'No', 'Not decided'],
    priority: (['blocking', 'important', 'optional'].includes(String(q.priority))
      ? q.priority
      : 'important') as PlannedQuestion['priority'],
    reason: 'Call A (model)',
  }))
}

function progress(confirmedCount: number, remaining: number, clear: boolean) {
  if (clear) return { confirmedCount, remainingEstimate: 0, percentHint: 100 }
  return {
    confirmedCount,
    remainingEstimate: remaining,
    percentHint: Math.min(95, Math.round((confirmedCount / Math.max(1, confirmedCount + remaining)) * 100)),
  }
}

const SLOT_LABELS_VI: Record<string, string> = {
  objective: 'Mục tiêu',
  platform: 'Nền tảng',
  auth: 'Đăng nhập',
  database: 'Cơ sở dữ liệu',
  scope: 'Phạm vi',
  output: 'Đầu ra',
  constraints: 'Ràng buộc',
  audience: 'Đối tượng',
  evidence: 'Nguồn',
  source: 'Nguồn',
  actor: 'Vai trò',
  success: 'Tiêu chí xong',
  schedule: 'Lịch',
  risk: 'Rủi ro',
  artifact: 'Thành phần / artifact',
  existing: 'Hiện trạng',
  destination: 'Đích',
  goal: 'Yêu cầu',
  request: 'Yêu cầu',
}

function mergeConfirmed(prior: Fact[], answers: Answer[], labels?: Map<string, string>): Fact[] {
  const map = new Map(prior.map((f) => [f.id, f]))
  for (const a of answers) {
    if (!a.value.trim()) continue
    const cleaned = a.value.replace(/^\★\s*/, '').trim()
    map.set(a.questionId, {
      id: a.questionId,
      label:
        labels?.get(a.questionId)
        || prior.find((f) => f.id === a.questionId)?.label
        || SLOT_LABELS_VI[a.questionId]
        || a.questionId,
      value: cleaned,
    })
  }
  return [...map.values()]
}

function ensureQuestions(
  list: InterviewQuestion[],
  request: string,
  missingSlots: string[],
): InterviewQuestion[] {
  if (list.length) return list
  const locale = detectLocale(request)
  const meta = metaQuestionsForSlots(
    missingSlots.length ? missingSlots : ['scope', 'output', 'constraints', 'objective'],
    locale,
  )
  if (meta.length) return meta.map(toInterview)
  return localFallbackFromPlanner(request).map(toInterview)
}

async function callA(args: {
  provider: ProviderId
  apiKey: string
  model: string
  request: string
  confirmed: Fact[]
  intent: string
  packId: string | null
  allowedSlotIds: string[]
  seedQuestions: PlannedQuestion[]
  chat: ChatFn
  signal?: AbortSignal
}): Promise<PlannedQuestion[]> {
  const content = await args.chat({
    provider: args.provider,
    apiKey: args.apiKey,
    model: args.model,
    temperature: 0.2,
    signal: args.signal,
    messages: [
      { role: 'system', content: CALL_A_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          originalRequest: args.request,
          intent: args.intent,
          pack: args.packId,
          alreadyConfirmed: args.confirmed,
          seedQuestionIds: args.seedQuestions.map((q) => q.id),
          allowedSlotIds: args.allowedSlotIds,
          instruction:
            'Ask ONLY meta brief questions for allowedSlotIds. Never quiz subject-matter knowledge.',
        }, null, 2),
      },
    ],
  })
  const parsed = parseModelQuestions(extractJson(content))
  const filtered = filterCallAQuestions(parsed, args.allowedSlotIds)
  if (filtered.length) return filtered
  // Model empty or all quizzes stripped → deterministic meta
  return metaQuestionsForSlots(args.allowedSlotIds, detectLocale(args.request))
}

export async function runInterviewTurn(args: {
  provider: ProviderId
  apiKey: string
  model: string
  request: string
  answers: Answer[]
  confirmed: Fact[]
  personalHints?: PersonalHint[]
  /** Skip CLEAR and ask more meta questions (continue after thin answer). */
  forceClarify?: boolean
  chat: ChatFn
  signal?: AbortSignal
}): Promise<InterviewTurn> {
  const hints = args.personalHints ?? []
  const labelMap = new Map<string, string>()
  for (const f of args.confirmed) labelMap.set(f.id, f.label)
  const confirmed = mergeConfirmed(args.confirmed, args.answers, labelMap)
  const intent = detectIntent(args.request)
  const pack = detectDomainPack(args.request)
  const locale = planLocale(args.request)

  if (args.forceClarify && confirmed.length) {
    const followQs = buildFollowUpQuestions(
      args.request,
      confirmed.map((f) => ({ id: f.id, value: f.value })),
      locale,
    ).map(toInterview)
    const questions = ensureQuestions(followQs, args.request, ['objective', 'audience', 'artifact', 'output'])
    return {
      status: 'NOT_CLEAR',
      progress: progress(confirmed.length, questions.length, false),
      questions,
      confirmed,
      suggested: [],
      unknown: questions.map((q) => ({
        id: q.id,
        label: q.label || q.text,
        impact: 'changes_outcome_significantly',
      })),
      reasonSummary: locale === 'vi'
        ? 'Bổ sung thêm chi tiết để có câu trả lời cụ thể hơn.'
        : 'Add a few more details for a more concrete answer.',
      source: 'fallback',
      meta: { intent, pack: pack?.id ?? null },
    }
  }

  // First turn
  if (!args.answers.length && !args.confirmed.length) {
    const plan = planInterview(args.request, hints)

    if (plan.ordinaryQa) {
      return {
        status: 'CLEAR',
        progress: progress(1, 0, true),
        questions: [],
        confirmed: [{ id: 'request', label: 'Yêu cầu', value: args.request.trim() }],
        suggested: [],
        unknown: [],
        reasonSummary: userFacingSummary(plan.locale, 'ordinary'),
        source: 'clear',
        meta: { intent: plan.intent, pack: plan.pack?.id ?? null },
      }
    }

    let questions = plan.questions.map(toInterview)
    let source: InterviewTurn['source'] = plan.source === 'rag' ? 'rag' : plan.source === 'fallback' ? 'fallback' : 'rag'
    const allowedSlotIds = plan.missingSlots.length
      ? plan.missingSlots
      : plan.questions.map((q) => q.id)

    if (plan.needsModelInterview) {
      try {
        const modelQs = await callA({
          ...args,
          confirmed,
          intent: plan.intent,
          packId: plan.pack?.id ?? null,
          allowedSlotIds,
          seedQuestions: plan.questions,
        })
        const merged = mergeCallAQuestions(plan.questions, modelQs, allowedSlotIds)
        questions = merged.map(toInterview)
        source = plan.questions.length && modelQs.length ? 'merged' : modelQs.length ? 'model' : source
      } catch (error) {
        if (args.signal?.aborted) throw error
        questions = ensureQuestions(questions, args.request, allowedSlotIds)
        source = 'fallback'
      }
    }

    questions = ensureQuestions(questions, args.request, allowedSlotIds)

    return {
      status: 'NOT_CLEAR',
      progress: progress(0, questions.length, false),
      questions,
      confirmed: [],
      suggested: [],
      unknown: questions.map((q) => ({
        id: q.id,
        label: q.label || q.text,
        impact: 'changes_outcome_significantly',
      })),
      reasonSummary: userFacingSummary(plan.locale, 'ask'),
      source,
      meta: { intent: plan.intent, pack: plan.pack?.id ?? null },
    }
  }

  // Follow-up: rule CLEAR first, then pack follow-ups, then model only if needed
  const answerSlots = confirmed.map((f) => ({ slot: f.id, value: f.value }))
  const scored = scoreClear({
    intent,
    pack,
    answers: answerSlots,
  })

  if (scored.clear) {
    return {
      status: 'CLEAR',
      progress: progress(confirmed.length, 0, true),
      questions: [],
      confirmed,
      suggested: [],
      unknown: [],
      reasonSummary: userFacingSummary(planLocale(args.request), 'clear'),
      source: 'clear',
      meta: { intent, pack: pack?.id ?? null },
    }
  }

  const follow = planFollowUps(args.request, answerSlots, hints)
  let questions = follow.questions.map(toInterview)
  let source: InterviewTurn['source'] = follow.questions.length ? 'rag' : 'fallback'
  const allowedSlotIds = follow.missingSlots.length
    ? follow.missingSlots
    : scored.missingBlocking.length
      ? scored.missingBlocking
      : ['scope', 'output', 'constraints']

  // Prefer local meta before Call A — passthrough is never automatic here
  if (!questions.length) {
    questions = ensureQuestions([], args.request, allowedSlotIds)
    source = 'fallback'
  }

  if (follow.needsModelInterview) {
    try {
      const modelQs = await callA({
        ...args,
        confirmed,
        intent,
        packId: pack?.id ?? null,
        allowedSlotIds,
        seedQuestions: follow.questions,
      })
      const merged = mergeCallAQuestions(
        questions.map((q) => ({
          id: q.id,
          label: q.label || q.id,
          text: q.text,
          options: q.options,
          priority: q.priority,
          reason: 'local',
        })),
        modelQs,
        allowedSlotIds,
      )
      questions = merged.map(toInterview)
      source = follow.questions.length && modelQs.length ? 'merged' : modelQs.length ? 'model' : source
    } catch (error) {
      if (args.signal?.aborted) throw error
      questions = ensureQuestions(questions, args.request, allowedSlotIds)
      source = 'fallback'
    }
  }

  questions = ensureQuestions(questions, args.request, allowedSlotIds)

  return {
    status: 'NOT_CLEAR',
    progress: progress(confirmed.length, questions.length, false),
    questions,
    confirmed,
    suggested: [],
    unknown: questions.map((q) => ({
      id: q.id,
      label: q.label || q.text,
      impact: 'changes_outcome_significantly',
    })),
    reasonSummary: userFacingSummary(planLocale(args.request), 'follow'),
    source,
    meta: { intent, pack: pack?.id ?? null },
  }
}

function planLocale(request: string): 'vi' | 'en' {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(request) ? 'vi' : 'en'
}

export async function compileVerifiedAnswer(args: {
  provider: ProviderId
  apiKey: string
  model: string
  request: string
  confirmed: Fact[]
  /** Last-resort generate with original goal; still must not invent requirements. */
  mode?: 'verified' | 'passthrough'
  chat: ChatFn
  signal?: AbortSignal
}): Promise<VerifiedResult> {
  const mode = args.mode ?? 'verified'
  let content: string
  try {
    content = await args.chat({
      provider: args.provider,
      apiKey: args.apiKey,
      model: args.model,
      temperature: 0.2,
      signal: args.signal,
      messages: [
        { role: 'system', content: mode === 'passthrough' ? PASSTHROUGH_SYSTEM : ANSWER_SYSTEM },
        {
          role: 'user',
          content: JSON.stringify({
            mode,
            originalRequest: args.request,
            userConfirmedFacts: args.confirmed,
          }, null, 2),
        },
      ],
    })
  } catch (err) {
    throw friendlyEngineError(err)
  }

  let raw: Partial<VerifiedResult> & { adequacy?: string }
  try {
    raw = extractJson(content) as Partial<VerifiedResult> & { adequacy?: string }
  } catch (err) {
    throw friendlyEngineError(err)
  }
  const answer = String(raw.answer || '').trim()
  if (!answer) throw friendlyEngineError(new Error('Model returned empty answer'))

  const locale = planLocale(args.request)
  const structured = String(raw.structuredRequest || '').trim()
    || buildStructuredFallback(args.request, args.confirmed, locale, mode)

  let portable = String(raw.verifiedPrompt || '').trim()
  if (isWeakPortablePrompt(portable, args.request)) {
    portable = buildPortablePrompt(structured, locale)
  } else if (!/OBJECTIVE|CONFIRMED REQUIREMENTS/i.test(portable)) {
    portable = `${portable.trim()}\n\n${structured}`
  }

  const modelSaysNeedsMore = raw.adequacy === 'needs_more'
  const thin = looksLikeThinRefusal(answer)
  const suggestMore = modelSaysNeedsMore || thin || nextClarifySlots(
    args.request,
    args.confirmed.map((f) => ({ id: f.id, value: f.value })),
  ).length >= 2
  const followUpQuestions = suggestMore
    ? buildFollowUpQuestions(
      args.request,
      args.confirmed.map((f) => ({ id: f.id, value: f.value })),
      locale,
    ).map(toInterview)
    : undefined

  return {
    answer,
    mode,
    needsMoreInterview: Boolean(suggestMore && followUpQuestions?.length),
    followUpQuestions,
    reasonSummary: suggestMore
      ? (locale === 'vi'
        ? 'Đã có câu trả lời. Bạn có thể bổ sung thêm chi tiết để làm cụ thể hơn.'
        : 'Answer ready. You can add more details to make it more specific.')
      : undefined,
    structuredRequest: structured,
    verifiedPrompt: portable,
  }
}
