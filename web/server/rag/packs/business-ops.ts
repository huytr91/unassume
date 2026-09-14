import type { DomainPack } from '../ontology.ts'

/** Business operations / workflow pack */
export const businessOpsPack: DomainPack = {
  id: 'business_ops',
  label: { vi: 'Vận hành doanh nghiệp', en: 'Business operations' },
  detect: /nhân sự|hr|nhân viên|khách hàng|crm|bán hàng|đơn hàng|duyệt|quy trình|ops|vận hành|hợp đồng|invoice|công việc|task|ticket/i,
  intents: ['build', 'automate', 'decide', 'write'],
  requiredSlots: ['objective', 'actor', 'output'],
  questions: [
    {
      slot: 'actor',
      label: { vi: 'Người dùng', en: 'Users / roles' },
      ask: {
        vi: 'Ai sẽ dùng quy trình / hệ thống này?',
        en: 'Who will use this process or system?',
      },
      options: {
        vi: ['Nhân viên nội bộ', 'Quản lý', 'Khách hàng', 'Nhiều vai trò', 'Chưa quyết định'],
        en: ['Internal staff', 'Managers', 'Customers', 'Multiple roles', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'objective',
      label: { vi: 'Mục tiêu nghiệp vụ', en: 'Business objective' },
      ask: {
        vi: 'Mục tiêu nghiệp vụ chính là gì?',
        en: 'What is the main business objective?',
      },
      options: {
        vi: ['Giảm thao tác thủ công', 'Theo dõi / báo cáo', 'Kiểm soát phê duyệt', 'Phục vụ khách hàng', 'Chưa quyết định'],
        en: ['Reduce manual work', 'Tracking / reporting', 'Approval control', 'Customer service', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'scope',
      label: { vi: 'Phạm vi MVP', en: 'MVP scope' },
      ask: {
        vi: 'Phạm vi lần đầu (MVP) nên gồm gì?',
        en: 'What should the first MVP include?',
      },
      options: {
        vi: ['Một quy trình lõi', 'Nhiều module liên quan', 'Chỉ thiết kế quy trình', 'Chưa quyết định'],
        en: ['One core workflow', 'Several related modules', 'Process design only', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'output',
      label: { vi: 'Đầu ra', en: 'Output' },
      ask: {
        vi: 'Bạn cần Unassume trả về gì?',
        en: 'What should Unassume return?',
      },
      options: {
        vi: ['Quy trình / SOP', 'Danh sách yêu cầu', 'Mô hình dữ liệu', 'Kế hoạch triển khai', 'Chưa quyết định'],
        en: ['Process / SOP', 'Requirements list', 'Data model', 'Rollout plan', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'constraints',
      label: { vi: 'Ràng buộc', en: 'Constraints' },
      ask: {
        vi: 'Có quy định nội bộ, công cụ bắt buộc, hoặc hạn chế nào không?',
        en: 'Any internal policies, required tools, or limits?',
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
      fromSlot: 'actor',
      whenValueMatches: /nhiều vai trò|multiple roles|quản lý|manager/i,
      askSlot: 'scope',
    },
  ],
}
