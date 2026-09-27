import type { DomainPack } from '../ontology.ts'

/** Data / Excel / analytics pack */
export const dataPack: DomainPack = {
  id: 'data',
  label: { vi: 'Dữ liệu / Excel', en: 'Data / Excel' },
  detect: /excel|xlsx|csv|dữ liệu|dataset|bảng|sheet|cột|pivot|thống kê|sql|query|dashboard|power bi|số liệu|postgres|postgresql|portfolio|returns?|fund report|monthly report|invoice|pdf|ocr|clean (up )?(the )?(data|database|records)|dedup|database.*(clean|production)|import .*excel/i,
  intents: ['analyze', 'transform', 'compare'],
  requiredSlots: ['objective', 'evidence', 'output'],
  questions: [
    {
      slot: 'evidence',
      label: { vi: 'Nguồn dữ liệu', en: 'Data source' },
      ask: {
        vi: 'Dữ liệu lấy từ đâu?',
        en: 'Where does the data come from?',
      },
      options: {
        vi: ['File Excel / CSV', 'Database / SQL', 'Tôi sẽ dán mẫu', 'Chưa có — cần giả định tối thiểu'],
        en: ['Excel / CSV file', 'Database / SQL', 'I will paste a sample', 'None yet — minimal assumptions'],
      },
      priority: 'blocking',
      skipIfRequestMatches: /đính kèm|attach|\.xlsx|\.csv|từ file|from file/i,
    },
    {
      slot: 'scope',
      label: { vi: 'Phạm vi', en: 'Scope' },
      ask: {
        vi: 'Phạm vi phân tích / xử lý là gì?',
        en: 'What is the analysis or transform scope?',
      },
      options: {
        vi: ['Một bảng / sheet', 'Nhiều file cần gộp', 'Toàn bộ kỳ (tháng/quý)', 'Chưa quyết định'],
        en: ['One table / sheet', 'Multiple files to merge', 'Full period (month/quarter)', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'output',
      label: { vi: 'Đầu ra', en: 'Output' },
      ask: {
        vi: 'Bạn cần đầu ra dạng nào?',
        en: 'What output format do you need?',
      },
      options: {
        vi: ['Bảng / CSV', 'SQL', 'Tóm tắt insight', 'Biểu đồ mô tả', 'Chưa quyết định'],
        en: ['Table / CSV', 'SQL', 'Insight summary', 'Chart description', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'success',
      label: { vi: 'Tiêu chí đúng', en: 'Success criteria' },
      ask: {
        vi: 'Thế nào là kết quả đúng / chấp nhận được?',
        en: 'What counts as a correct / acceptable result?',
      },
      options: {
        vi: ['Khớp số tổng', 'Đúng từng dòng', 'Đủ để ra quyết định', 'Chưa quyết định'],
        en: ['Totals match', 'Row-level accuracy', 'Good enough to decide', 'Not decided'],
      },
      priority: 'important',
    },
    {
      slot: 'constraints',
      label: { vi: 'Ràng buộc', en: 'Constraints' },
      ask: {
        vi: 'Có cột bắt buộc, kỳ thời gian, hoặc rule nghiệp vụ nào không?',
        en: 'Any required columns, time range, or business rules?',
      },
      options: {
        vi: ['Không ràng buộc đặc biệt', 'Có — dùng Phương án khác', 'Chưa quyết định'],
        en: ['No special constraints', 'Yes — use Other', 'Not decided'],
      },
      priority: 'important',
    },
  ],
  followUps: [
    {
      fromSlot: 'evidence',
      whenValueMatches: /excel|csv|file/i,
      askSlot: 'scope',
    },
  ],
}
