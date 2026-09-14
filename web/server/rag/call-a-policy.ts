import type { Locale } from './ontology.ts'
import type { PlannedQuestion } from './planner.ts'

/** Slots Call A may ever emit — meta about the USER request only. */
export const CALL_A_ALLOWED_SLOTS = new Set([
  'objective',
  'scope',
  'output',
  'constraints',
  'audience',
  'evidence',
  'source',
  'success',
  'actor',
  'platform',
  'auth',
  'database',
  'destination',
  'schedule',
  'risk',
  'existing',
  'artifact',
])

/**
 * Heuristic: question quizzes the user on domain knowledge / causes / facts
 * instead of clarifying the brief.
 */
const SUBJECT_MATTER_QUIZ =
  /nguyên nhân|nguyên do|lý do chính|ai là|nhóm đối tượng|yếu tố bên ngoài|đáp án|đúng nhất|gây ra|ảnh hưởng bởi|what (is|are|causes)|which of the following|who (is|are) (the )?(main|primary)|root cause|đúng hay sai|trắc nghiệm|giải thích (tại sao|vì sao)|hãy chọn|chọn đáp án|true or false|multiple choice|câu hỏi kiểm tra|quiz\b|kiến thức về/i

const SUBJECT_OPTIONS =
  /giảm nhu cầu|tăng cung|lãi suất|fed\b|địa chính trị|người mua vàng|người bán vàng|toàn cầu|kinh tế vĩ mô|đúng cả|cả a và b|tất cả các đáp án/i

export function looksLikeSubjectMatterQuiz(text: string, options: string[] = []): boolean {
  if (SUBJECT_MATTER_QUIZ.test(text)) return true
  const joined = options.join(' | ')
  // Many factual-looking options without brief cues → likely quiz
  if (options.length >= 3 && SUBJECT_OPTIONS.test(joined) && !/kỳ|giai đoạn|đầu ra|phạm vi|format|audience|nguồn được phép/i.test(text)) {
    return true
  }
  return false
}

export function isAllowedCallASlot(id: string): boolean {
  return CALL_A_ALLOWED_SLOTS.has(id)
}

/** Keep only allowlisted meta questions; drop domain quizzes. */
export function filterCallAQuestions(
  questions: PlannedQuestion[],
  allowedSlotIds: string[],
): PlannedQuestion[] {
  const allow = new Set(allowedSlotIds.length ? allowedSlotIds : [...CALL_A_ALLOWED_SLOTS])
  return questions.filter((q) => {
    if (!isAllowedCallASlot(q.id)) return false
    if (!allow.has(q.id)) return false
    if (looksLikeSubjectMatterQuiz(q.text, q.options)) return false
    if (looksLikeSubjectMatterQuiz(q.label, q.options)) return false
    return true
  })
}

/** Merge: seed first; model may only add/replace ids in allowedSlotIds. */
export function mergeCallAQuestions(
  seed: PlannedQuestion[],
  model: PlannedQuestion[],
  allowedSlotIds: string[],
): PlannedQuestion[] {
  const allow = new Set(allowedSlotIds)
  const filtered = filterCallAQuestions(model, allowedSlotIds)
  const byId = new Map<string, PlannedQuestion>()
  for (const q of seed) byId.set(q.id, q)
  for (const q of filtered) {
    if (!allow.has(q.id) && seed.length > 0) continue
    if (!byId.has(q.id)) byId.set(q.id, { ...q, reason: 'Call A (meta slot only)' })
  }
  return [...byId.values()].slice(0, 4)
}

export const CALL_A_SYSTEM = `You are Unassume Call A — a BRIEF clarifier, not a tutor and not a domain expert quiz.

Mission: ask what is MISSING from the USER'S REQUEST so another AI can execute later.
You clarify the brief (scope, time window, output format, constraints, audience, evidence source).

HARD RULES:
1. NEVER ask subject-matter / knowledge questions about the topic (causes, who is affected, which factor, quiz options about the domain).
2. NEVER ask the user to answer the content of their own request (e.g. "What causes gold prices to fall?").
3. ONLY ask meta questions about how they want the work done.
4. Each question id MUST be one of the allowedSlotIds provided in the user JSON.
5. 1–4 questions max. Short option hints only. UI always has "Other".
6. Match the user's language (Vietnamese or English).
7. Return ONE JSON object only.

GOOD (meta / brief):
- id: scope — "Phân tích cho giai đoạn / kỳ nào?"
- id: output — "Bạn muốn đầu ra dạng gì?"
- id: constraints — "Có ràng buộc nào (không dự đoán số, chỉ dùng nguồn công bố…)?"
- id: audience — "Đối tượng đọc kết quả là ai?"

BAD (forbidden — subject quiz):
- "Nguyên nhân chính khiến giá vàng giảm là gì?"
- "Ai bị ảnh hưởng bởi sự sụt giảm giá vàng?"
- "Yếu tố bên ngoài ảnh hưởng giá vàng là gì?"
- Any multiple-choice that answers the user's topic instead of clarifying the brief.

JSON shape:
{
  "questions": [{
    "id": string,
    "label": string,
    "text": string,
    "options": string[],
    "priority": "blocking" | "important" | "optional"
  }]
}`

/** Deterministic meta templates when model is unavailable or filtered empty. */
export function metaQuestionsForSlots(slots: string[], locale: Locale): PlannedQuestion[] {
  const catalog: Record<string, PlannedQuestion> = locale === 'vi'
    ? {
        scope: {
          id: 'scope',
          label: 'Phạm vi / kỳ',
          text: 'Phạm vi hoặc giai đoạn cần làm rõ là gì?',
          options: ['Ngắn hạn (ngày/tuần)', 'Trung hạn (tháng/quý)', 'Dài hạn', 'Chưa quyết định'],
          priority: 'blocking',
          reason: 'Ontology meta',
        },
        output: {
          id: 'output',
          label: 'Đầu ra',
          text: 'Bạn muốn đầu ra dạng gì?',
          options: ['Tóm tắt ngắn', 'Phân tích có khung lập luận', 'Checklist / gạch đầu dòng', 'Bài viết dài', 'Chưa quyết định'],
          priority: 'blocking',
          reason: 'Ontology meta',
        },
        constraints: {
          id: 'constraints',
          label: 'Ràng buộc',
          text: 'Có ràng buộc nào cho câu trả lời không?',
          options: ['Không dự đoán số cụ thể', 'Chỉ dựa nguồn công bố', 'Không ràng buộc đặc biệt', 'Chưa quyết định'],
          priority: 'important',
          reason: 'Ontology meta',
        },
        audience: {
          id: 'audience',
          label: 'Đối tượng',
          text: 'Ai sẽ dùng kết quả này?',
          options: ['Cá nhân', 'Đội nội bộ', 'Khách hàng / công chúng', 'Chưa quyết định'],
          priority: 'important',
          reason: 'Ontology meta',
        },
        objective: {
          id: 'objective',
          label: 'Mục tiêu',
          text: 'Mục tiêu chính của yêu cầu này là gì?',
          options: ['Hiểu tình hình', 'Ra quyết định', 'Viết / trình bày', 'Chưa quyết định'],
          priority: 'blocking',
          reason: 'Ontology meta',
        },
        evidence: {
          id: 'evidence',
          label: 'Nguồn',
          text: 'Được phép dựa trên nguồn nào?',
          options: ['Kiến thức chung của model', 'Tôi sẽ cung cấp nguồn', 'Chỉ nguồn tôi nêu', 'Chưa quyết định'],
          priority: 'important',
          reason: 'Ontology meta',
        },
        artifact: {
          id: 'artifact',
          label: 'Kênh / hình thức',
          text: 'Ưu tiên kênh hoặc hình thức nào?',
          options: ['Mạng xã hội', 'Nội dung / SEO', 'Cộng đồng', 'Đa kênh', 'Chưa quyết định'],
          priority: 'important',
          reason: 'Ontology meta',
        },
        success: {
          id: 'success',
          label: 'Tiêu chí xong',
          text: 'Thế nào là kết quả đạt?',
          options: ['Đủ để quyết định', 'Đầy đủ chi tiết', 'Ngắn gọn là được', 'Chưa quyết định'],
          priority: 'optional',
          reason: 'Ontology meta',
        },
      }
    : {
        scope: {
          id: 'scope',
          label: 'Scope / period',
          text: 'What time window or scope should this cover?',
          options: ['Short-term (days/weeks)', 'Medium-term (months/quarter)', 'Long-term', 'Not decided'],
          priority: 'blocking',
          reason: 'Ontology meta',
        },
        output: {
          id: 'output',
          label: 'Output',
          text: 'What output format do you want?',
          options: ['Short summary', 'Structured analysis', 'Checklist / bullets', 'Long-form write-up', 'Not decided'],
          priority: 'blocking',
          reason: 'Ontology meta',
        },
        constraints: {
          id: 'constraints',
          label: 'Constraints',
          text: 'Any constraints on the answer?',
          options: ['No numeric forecasts', 'Public sources only', 'No special constraints', 'Not decided'],
          priority: 'important',
          reason: 'Ontology meta',
        },
        audience: {
          id: 'audience',
          label: 'Audience',
          text: 'Who is this for?',
          options: ['Personal use', 'Internal team', 'Customers / public', 'Not decided'],
          priority: 'important',
          reason: 'Ontology meta',
        },
        objective: {
          id: 'objective',
          label: 'Objective',
          text: 'What is the main objective?',
          options: ['Understand the situation', 'Make a decision', 'Write / present', 'Not decided'],
          priority: 'blocking',
          reason: 'Ontology meta',
        },
        evidence: {
          id: 'evidence',
          label: 'Sources',
          text: 'Which sources may be used?',
          options: ['Model general knowledge', 'I will provide sources', 'Only sources I name', 'Not decided'],
          priority: 'important',
          reason: 'Ontology meta',
        },
        artifact: {
          id: 'artifact',
          label: 'Channel / format',
          text: 'Which channel or format should we prioritize?',
          options: ['Social', 'Content / SEO', 'Community', 'Multi-channel', 'Not decided'],
          priority: 'important',
          reason: 'Ontology meta',
        },
        success: {
          id: 'success',
          label: 'Done when',
          text: 'What counts as good enough?',
          options: ['Enough to decide', 'Full detail', 'Brief is fine', 'Not decided'],
          priority: 'optional',
          reason: 'Ontology meta',
        },
      }

  const out: PlannedQuestion[] = []
  for (const slot of slots) {
    const q = catalog[slot]
    if (q) out.push(q)
    if (out.length >= 4) break
  }
  return out
}
