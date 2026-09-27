import { PROVIDER_BY_ID, type ProviderId } from './providers-catalog'
import { toUserError } from './errors'

export type { ProviderId }
export type Connection = {
  provider: ProviderId
  apiKey: string
  model: string
  remember: boolean
}

export type Fact = { id: string; label: string; value: string }

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

export type PortablePromptDocument = {
  schemaVersion: '1.0'
  mode: 'verified' | 'passthrough'
  label: 'VERIFIED' | 'UNVERIFIED_PARTIAL' | 'PASSTHROUGH'
  locale: 'vi' | 'en'
  originalRequest: string
  portableText: string
  sections: {
    objective: string
    confirmedRequirements: string[]
    constraints: string[]
    unresolvedItems: string[]
    outputRequirements: string[]
    instructionsToDownstreamAi: string[]
  }
  passthrough?: {
    reason: string
    warning: string
    confirmedFactCount?: number
  }
  meta?: { intent?: string; pack?: string | null; product: 'Unassume' }
}

export type VerifiedResult = {
  answer: string
  structuredRequest: string
  verifiedPrompt: string
  portableDocument?: PortablePromptDocument
  mode?: 'verified' | 'passthrough'
  needsMoreInterview?: boolean
  followUpQuestions?: InterviewQuestion[]
  reasonSummary?: string
}

export type ProviderTestResult = {
  ok: true
  provider: ProviderId
  model: string
  models: string[]
}

const STORAGE_KEY = 'unassume.connection.v1'
const LEGACY_STORAGE_KEY = 'declare.connection.v1'

export function loadConnection(): Connection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
      ?? sessionStorage.getItem(STORAGE_KEY)
      ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Connection>
    const provider = (parsed.provider && PROVIDER_BY_ID[parsed.provider] ? parsed.provider : null) as ProviderId | null
    if (!provider || !parsed.model) return null
    if (provider !== 'ollama' && !parsed.apiKey) return null
    return {
      provider,
      apiKey: provider === 'ollama' ? 'local' : String(parsed.apiKey),
      model: String(parsed.model),
      remember: Boolean(parsed.remember ?? localStorage.getItem(STORAGE_KEY)),
    }
  } catch {
    return null
  }
}

export function saveConnection(conn: Connection) {
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  const payload = JSON.stringify(conn)
  if (conn.remember) {
    localStorage.setItem(STORAGE_KEY, payload)
    sessionStorage.removeItem(STORAGE_KEY)
  } else {
    sessionStorage.setItem(STORAGE_KEY, payload)
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function clearConnection() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}

export async function postInterview(args: {
  connection: Connection
  request: string
  answers: { questionId: string; value: string }[]
  confirmed: Fact[]
  personalHints?: { slot: string; value: string; count: number }[]
  forceClarify?: boolean
  signal?: AbortSignal
}): Promise<InterviewTurn> {
  const res = await fetch('/api/interview', {
    method: 'POST',
    signal: args.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: args.connection.provider,
      apiKey: args.connection.apiKey,
      model: args.connection.model,
      request: args.request,
      answers: args.answers,
      confirmed: args.confirmed,
      personalHints: args.personalHints ?? [],
      forceClarify: args.forceClarify ?? false,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(toUserError(String(data.error || 'Không làm rõ được yêu cầu')))
  return data as InterviewTurn
}

export async function postAnswer(args: {
  connection: Connection
  request: string
  confirmed: Fact[]
  mode?: 'verified' | 'passthrough'
  signal?: AbortSignal
}): Promise<VerifiedResult> {
  const res = await fetch('/api/answer', {
    method: 'POST',
    signal: args.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: args.connection.provider,
      apiKey: args.connection.apiKey,
      model: args.connection.model,
      request: args.request,
      confirmed: args.confirmed,
      mode: args.mode ?? 'verified',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(toUserError(String(data.error || 'Không tạo được câu trả lời')))
  return data as VerifiedResult
}

export async function testProvider(args: {
  provider: ProviderId
  apiKey: string
}): Promise<ProviderTestResult> {
  const res = await fetch('/api/providers/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: args.provider,
      apiKey: args.apiKey,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(toUserError(String(data.error || 'Không kiểm tra được kết nối')))
  return data as ProviderTestResult
}
