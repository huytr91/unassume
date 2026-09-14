import type { DomainPack } from '../ontology.ts'

/** Coding / software build pack */
export const codingPack: DomainPack = {
  id: 'coding',
  label: { vi: 'Lập trình / phần mềm', en: 'Coding / software' },
  detect: /app|ứng dụng|hệ thống|\bsystem\b|website|web app|api|backend|frontend|react|node|code|phần mềm|login|auth|database|crud|repo|git|employee management|crm/i,
  intents: ['build', 'transform', 'automate'],
  requiredSlots: ['objective', 'platform', 'output'],
  questions: [
    {
      slot: 'objective',
      label: { vi: 'Mục tiêu', en: 'Objective' },
      ask: {
        vi: 'Mục tiêu chính của hệ thống / tính năng này là gì?',
        en: 'What is the main objective of this system or feature?',
      },
      options: {
        vi: ['Quản lý dữ liệu / hồ sơ', 'Tự động hóa quy trình', 'Tích hợp / API', 'MVP để thử nghiệm', 'Chưa quyết định'],
        en: ['Manage records / data', 'Automate a process', 'Integration / API', 'MVP to try out', 'Not decided'],
      },
      priority: 'blocking',
      skipIfRequestMatches: /quản lý|crm|bán hàng|nhân viên|employee|invoice|đặt lịch|booking|thanh toán|payment/i,
    },
    {
      slot: 'platform',
      label: { vi: 'Nền tảng', en: 'Platform' },
      ask: {
        vi: 'Ứng dụng chạy trên nền tảng nào?',
        en: 'Which platform should this run on?',
      },
      options: {
        vi: ['Web', 'iOS', 'Android', 'Web + Mobile', 'Desktop', 'Chưa quyết định'],
        en: ['Web', 'iOS', 'Android', 'Web + Mobile', 'Desktop', 'Not decided'],
      },
      priority: 'blocking',
      // Avoid matching "website" via bare "web" — require clearer signals
      skipIfRequestMatches: /\b(ios|android|desktop)\b|web app|ứng dụng web|mobile app|app di động/i,
    },
    {
      slot: 'auth',
      label: { vi: 'Đăng nhập', en: 'Authentication' },
      ask: {
        vi: 'Cần xác thực người dùng thế nào?',
        en: 'How should users authenticate?',
      },
      options: {
        vi: ['Email + mật khẩu', 'OAuth / SSO', 'Không cần đăng nhập', 'Chưa quyết định'],
        en: ['Email + password', 'OAuth / SSO', 'No login', 'Not decided'],
      },
      priority: 'important',
      skipIfRequestMatches: /oauth|sso|đăng nhập|email \+ |password login/i,
    },
    {
      slot: 'output',
      label: { vi: 'Đầu ra', en: 'Output' },
      ask: {
        vi: 'Bạn muốn đầu ra kỹ thuật gì?',
        en: 'What technical output do you want?',
      },
      options: {
        vi: ['Spec / kiến trúc', 'Code / patch', 'Schema DB', 'Checklist triển khai', 'Chưa quyết định'],
        en: ['Spec / architecture', 'Code / patch', 'DB schema', 'Deploy checklist', 'Not decided'],
      },
      priority: 'blocking',
    },
    {
      slot: 'database',
      label: { vi: 'Cơ sở dữ liệu', en: 'Database' },
      ask: {
        vi: 'Dùng database nào?',
        en: 'Which database should be used?',
      },
      options: {
        vi: ['PostgreSQL', 'MySQL', 'SQL Server', 'MongoDB', 'SQLite', 'Chưa quyết định'],
        en: ['PostgreSQL', 'MySQL', 'SQL Server', 'MongoDB', 'SQLite', 'Not decided'],
      },
      priority: 'important',
      skipIfRequestMatches: /postgres|mysql|mongodb|sql server|sqlite/i,
    },
    {
      slot: 'constraints',
      label: { vi: 'Ràng buộc', en: 'Constraints' },
      ask: {
        vi: 'Có ràng buộc stack / thời gian / phạm vi nào không?',
        en: 'Any stack, time, or scope constraints?',
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
      fromSlot: 'platform',
      whenValueMatches: /mobile|ios|android|web \+ mobile/i,
      askSlot: 'auth',
    },
  ],
}
