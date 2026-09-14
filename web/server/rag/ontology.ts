/**
 * Unassume Ontology — Phase 1
 * Universal slots + intent families. Domain packs only specialize wording/options.
 */

export type Locale = 'vi' | 'en'

export type IntentFamily =
  | 'build'
  | 'analyze'
  | 'transform'
  | 'compare'
  | 'automate'
  | 'write'
  | 'decide'
  | 'research'

export type SlotId =
  | 'objective'
  | 'actor'
  | 'artifact'
  | 'source'
  | 'destination'
  | 'platform'
  | 'auth'
  | 'database'
  | 'scope'
  | 'schedule'
  | 'constraints'
  | 'success'
  | 'evidence'
  | 'risk'
  | 'output'
  | 'audience'
  | 'existing'

export type Priority = 'blocking' | 'important' | 'optional'

export type SlotDef = {
  id: SlotId
  /** Outcome impact if missing */
  impact: 'changes_outcome_significantly' | 'nice_to_have'
  defaultPriority: Priority
}

export type LocalizedText = { vi: string; en: string }

export type QuestionTemplate = {
  slot: SlotId
  label: LocalizedText
  ask: LocalizedText
  options: { vi: string[]; en: string[] }
  priority?: Priority
  /** Only ask if these slots already answered with matching regex (on value) */
  when?: { slot: SlotId; match: RegExp }[]
  /** Skip if request already contains this signal */
  skipIfRequestMatches?: RegExp
}

export type FollowUpEdge = {
  fromSlot: SlotId
  whenValueMatches: RegExp
  askSlot: SlotId
}

export type DomainPackId = 'coding' | 'data' | 'business_ops' | 'research'

export type DomainPack = {
  id: DomainPackId
  label: LocalizedText
  /** Match request → pack score */
  detect: RegExp
  intents: IntentFamily[]
  /** Blocking slots that must be filled (or deferred) for CLEAR in this pack */
  requiredSlots: SlotId[]
  questions: QuestionTemplate[]
  followUps: FollowUpEdge[]
}

export type IntentDef = {
  id: IntentFamily
  label: LocalizedText
  detect: RegExp
  /** Core slots usually needed for this intent */
  coreSlots: SlotId[]
}

/** Phase 1 — universal ontology slots */
export const ONTOLOGY_SLOTS: SlotDef[] = [
  { id: 'objective', impact: 'changes_outcome_significantly', defaultPriority: 'blocking' },
  { id: 'actor', impact: 'nice_to_have', defaultPriority: 'optional' },
  { id: 'artifact', impact: 'changes_outcome_significantly', defaultPriority: 'blocking' },
  { id: 'source', impact: 'changes_outcome_significantly', defaultPriority: 'blocking' },
  { id: 'destination', impact: 'changes_outcome_significantly', defaultPriority: 'important' },
  { id: 'platform', impact: 'changes_outcome_significantly', defaultPriority: 'blocking' },
  { id: 'auth', impact: 'changes_outcome_significantly', defaultPriority: 'important' },
  { id: 'database', impact: 'changes_outcome_significantly', defaultPriority: 'important' },
  { id: 'scope', impact: 'changes_outcome_significantly', defaultPriority: 'blocking' },
  { id: 'schedule', impact: 'nice_to_have', defaultPriority: 'optional' },
  { id: 'constraints', impact: 'changes_outcome_significantly', defaultPriority: 'important' },
  { id: 'success', impact: 'changes_outcome_significantly', defaultPriority: 'important' },
  { id: 'evidence', impact: 'changes_outcome_significantly', defaultPriority: 'blocking' },
  { id: 'risk', impact: 'nice_to_have', defaultPriority: 'optional' },
  { id: 'output', impact: 'changes_outcome_significantly', defaultPriority: 'blocking' },
  { id: 'audience', impact: 'nice_to_have', defaultPriority: 'optional' },
  { id: 'existing', impact: 'changes_outcome_significantly', defaultPriority: 'important' },
]

/** Phase 1 — 8 intent families */
export const INTENT_FAMILIES: IntentDef[] = [
  {
    id: 'build',
    label: { vi: 'Xây dựng', en: 'Build' },
    detect: /tạo|xây|build|create|implement|develop|làm app|hệ thống|website|ứng dụng|phần mềm/i,
    coreSlots: ['objective', 'platform', 'output', 'constraints'],
  },
  {
    id: 'analyze',
    label: { vi: 'Phân tích', en: 'Analyze' },
    detect: /phân tích|analyze|analyse|thống kê|insight|đánh giá|report|báo cáo/i,
    coreSlots: ['objective', 'evidence', 'output', 'success'],
  },
  {
    id: 'transform',
    label: { vi: 'Chuyển đổi', en: 'Transform' },
    detect: /chuyển|convert|transform|chuẩn hóa|parse|import|export|migrate|map cột|làm sạch/i,
    coreSlots: ['source', 'destination', 'scope', 'output'],
  },
  {
    id: 'compare',
    label: { vi: 'So khớp', en: 'Compare' },
    detect: /so sánh|so khớp|đối chiếu|đối soát|compare|match|reconcile|verify|khớp/i,
    coreSlots: ['source', 'evidence', 'success', 'output'],
  },
  {
    id: 'automate',
    label: { vi: 'Tự động hóa', en: 'Automate' },
    detect: /tự động|automation|workflow|schedule|mỗi ngày|khi có|rpa|pipeline/i,
    coreSlots: ['source', 'destination', 'schedule', 'scope'],
  },
  {
    id: 'write',
    label: { vi: 'Viết nội dung', en: 'Write' },
    detect: /viết|soạn|draft|copy|email|proposal|đề xuất|blog|nội dung|document|viral|marketing|lan tỏa|tăng trưởng/i,
    coreSlots: ['objective', 'audience', 'output', 'constraints'],
  },
  {
    id: 'decide',
    label: { vi: 'Ra quyết định', en: 'Decide' },
    detect: /nên chọn|quyết định|recommend|đánh đổi|trade-?off|ưu nhược|which should/i,
    coreSlots: ['objective', 'constraints', 'success', 'risk'],
  },
  {
    id: 'research',
    label: { vi: 'Nghiên cứu', en: 'Research' },
    detect: /nghiên cứu|research|tìm hiểu|survey|benchmark|tổng quan|overview/i,
    coreSlots: ['objective', 'scope', 'output', 'audience'],
  },
]

export function detectLocale(text: string): Locale {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)
    ? 'vi'
    : 'en'
}

export function pickLocale(text: LocalizedText, locale: Locale): string {
  return text[locale]
}

export function detectIntent(request: string): IntentFamily {
  let best: IntentFamily = 'build'
  let score = 0
  for (const intent of INTENT_FAMILIES) {
    const hits = request.match(intent.detect)
    const n = hits ? 1 + (hits.length > 0 ? 1 : 0) : 0
    // Prefer longer/more specific later by simple test
    if (intent.detect.test(request) && n >= score) {
      // weight compare/automate slightly when matched
      const bonus = intent.id === 'compare' || intent.id === 'automate' ? 0.5 : 0
      if (1 + bonus >= score) {
        score = 1 + bonus
        best = intent.id
      }
    }
  }
  // If nothing matched strongly, soft default
  if (score === 0) {
    if (/phân tích|analyze|excel|csv|data/i.test(request)) return 'analyze'
    if (/viết|draft|email|blog/i.test(request)) return 'write'
    return 'research'
  }
  return best
}
