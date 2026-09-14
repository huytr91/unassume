import type { DomainPack } from '../ontology.ts'

/**
 * Research / analysis / growth brief — meta clarification only (no subject quizzes).
 * Growth/viral-style asks need objective + audience before CLEAR.
 */
export const researchPack: DomainPack = {
  id: 'research',
  label: { vi: 'Nghiên cứu / phân tích', en: 'Research / analysis' },
  detect:
    /phân tích|analyze|nghiên cứu|research|thị trường|market|giá vàng|vàng|chứng khoán|kinh tế|macro|tin tức|news|triển vọng|outlook|dự báo|forecast|xu hướng|trend|chính sách|policy|fed|lạm phát|viral|marketing|go.?to.?market|tăng trưởng|lan tỏa|thu hút|engagement|chiến lược (nội dung|truyền thông)|content strategy|growth|seo|brand/i,
  intents: ['research', 'analyze', 'decide', 'write'],
  requiredSlots: ['objective', 'audience', 'output', 'scope'],
  questions: [
    {
      slot: 'objective',
      label: { vi: 'Đối tượng phân tích', en: 'Subject / goal' },
      ask: {
        vi: 'Bạn đang nói tới sản phẩm / dự án / chủ đề nào cụ thể?',
        en: 'What specific product, project, or topic is this about?',
      },
      options: {
        vi: ['App / sản phẩm số', 'Thương hiệu / nội dung', 'Chủ đề nghiên cứu chung', 'Chưa quyết định'],
        en: ['App / digital product', 'Brand / content', 'General research topic', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'audience',
      label: { vi: 'Đối tượng', en: 'Audience' },
      ask: {
        vi: 'Đối tượng mục tiêu là ai?',
        en: 'Who is the target audience?',
      },
      options: {
        vi: ['Người dùng cuối / khách hàng', 'Nhà đầu tư', 'Đội nội bộ', 'Công chúng rộng', 'Chưa quyết định'],
        en: ['End users / customers', 'Investors', 'Internal team', 'Broad public', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'scope',
      label: { vi: 'Phạm vi / kỳ', en: 'Scope / period' },
      ask: {
        vi: 'Phạm vi hoặc giai đoạn cần làm rõ là gì?',
        en: 'What time window or scope should this cover?',
      },
      options: {
        vi: ['Ngắn hạn (ngày/tuần tới)', 'Trung hạn (1–3 tháng)', 'Dài hạn (6–12 tháng+)', 'Chưa quyết định'],
        en: ['Short-term (days/weeks)', 'Medium-term (1–3 months)', 'Long-term (6–12 months+)', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'output',
      label: { vi: 'Đầu ra', en: 'Output' },
      ask: {
        vi: 'Bạn cần đầu ra dạng gì?',
        en: 'What output do you need?',
      },
      options: {
        vi: ['Tóm tắt ngắn', 'Khung lập luận / các giả định', 'Checklist hành động', 'Bài phân tích dài', 'Chưa quyết định'],
        en: ['Short summary', 'Argument frame / assumptions', 'Action checklist', 'Long-form analysis', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'constraints',
      label: { vi: 'Ràng buộc', en: 'Constraints' },
      ask: {
        vi: 'Có ràng buộc cho câu trả lời không?',
        en: 'Any constraints on the answer?',
      },
      options: {
        vi: ['Không dự đoán số cụ thể', 'Chỉ nêu giả định rõ', 'Không ngân sách ads lớn', 'Không ràng buộc đặc biệt', 'Chưa quyết định'],
        en: ['No numeric forecasts', 'State assumptions clearly', 'No large ad budget', 'No special constraints', 'Not decided'],
      },
      priority: 'important',
    },
    {
      slot: 'artifact',
      label: { vi: 'Kênh / hình thức', en: 'Channel / format' },
      ask: {
        vi: 'Ưu tiên kênh hoặc hình thức nào?',
        en: 'Which channel or format should we prioritize?',
      },
      options: {
        vi: ['Mạng xã hội', 'Nội dung / SEO', 'Cộng đồng / referral', 'Đa kênh', 'Chưa quyết định'],
        en: ['Social', 'Content / SEO', 'Community / referral', 'Multi-channel', 'Not decided'],
      },
      priority: 'important',
    },
  ],
  followUps: [
    {
      fromSlot: 'output',
      whenValueMatches: /checklist|hành động|action|dài|long-form|khung|frame/i,
      askSlot: 'artifact',
    },
    {
      fromSlot: 'objective',
      whenValueMatches: /phương án khác|other|mô tả/i,
      askSlot: 'audience',
    },
  ],
}
