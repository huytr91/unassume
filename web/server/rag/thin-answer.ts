import { metaQuestionsForSlots } from './call-a-policy.ts'
import type { Locale } from './ontology.ts'
import type { PlannedQuestion } from './planner.ts'
import { isClearValue, isDeferred } from './clear-scorer.ts'

/** Pure refusal with little/no actionable body — still show answer, but suggest more clarify. */
const PURE_REFUSAL =
  /không thể xác định|không đủ (thông tin|dữ liệu|cơ sở)[^.!]{0,40}$|không có (dữ liệu|thông tin) cụ thể|cannot determine|not enough (information|data|context)|insufficient (information|data)|unable to (determine|provide a|provide an)/i

const HAS_DELIVERABLE =
  /(^|\n)\s*([0-9]+[.)]|[-•*])\s+\S|(bước|checklist|khung|framework|giả định|assumption|hành động|action items?)/i

/**
 * True only for refusal-heavy answers without a usable framework.
 * A general framework WITH assumptions is NOT a refusal.
 */
export function looksLikeThinRefusal(answer: string): boolean {
  const t = answer.trim()
  if (t.length < 40) return true
  if (HAS_DELIVERABLE.test(t) && t.length >= 120) return false
  if (t.length > 700) return false
  return PURE_REFUSAL.test(t) && !HAS_DELIVERABLE.test(t)
}

/** Slots still worth asking so the next answer can be sharper. */
export function nextClarifySlots(
  request: string,
  confirmed: { id: string; value: string }[],
): string[] {
  const byId = new Map(confirmed.map((c) => [c.id, c.value]))
  const prefer = /viral|marketing|tăng trưởng|lan tỏa|growth|seo|brand|chiến lược/i.test(request)
    ? ['objective', 'audience', 'artifact', 'output', 'scope']
    : ['objective', 'audience', 'scope', 'output', 'constraints', 'artifact']

  const out: string[] = []
  for (const slot of prefer) {
    const val = byId.get(slot)
    if (!val || isDeferred(val) || !isClearValue(val)) {
      out.push(slot)
      continue
    }
    if (slot === 'objective' && /chủ đề (nghiên cứu )?chung|general (research )?topic/i.test(val)) {
      out.push(slot)
    }
  }
  return out.slice(0, 4)
}

export function buildFollowUpQuestions(
  request: string,
  confirmed: { id: string; value: string }[],
  locale: Locale,
): PlannedQuestion[] {
  const slots = nextClarifySlots(request, confirmed)
  const qs = metaQuestionsForSlots(slots.length ? slots : ['objective', 'audience'], locale)
  return qs.map((q) => {
    if (q.id === 'objective' && /viral|marketing|tăng trưởng|lan tỏa|growth/i.test(request)) {
      return {
        ...q,
        text: locale === 'vi'
          ? 'Dự án / sản phẩm cần làm viral là gì? (mô tả ngắn ở Phương án khác nếu cần)'
          : 'What project or product should go viral? (use Other if you need to describe it)',
        options: locale === 'vi'
          ? ['App / sản phẩm số', 'Thương hiệu / nội dung', 'Sự kiện / chiến dịch', 'Chưa quyết định']
          : ['App / digital product', 'Brand / content', 'Event / campaign', 'Not decided'],
      }
    }
    if (q.id === 'audience' && /viral|marketing|tăng trưởng|lan tỏa|growth/i.test(request)) {
      return {
        ...q,
        text: locale === 'vi'
          ? 'Bạn muốn thu hút nhóm đối tượng nào?'
          : 'Which audience do you want to reach?',
      }
    }
    return q
  })
}
