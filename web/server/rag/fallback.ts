import { detectLocale } from './ontology.ts'
import type { PlannedQuestion } from './planner.ts'

export function localFallbackFromPlanner(request = ''): PlannedQuestion[] {
  const locale = detectLocale(request || 'vi')
  if (locale === 'en') {
    return [
      {
        id: 'objective',
        label: 'Objective',
        text: 'What do you want to achieve?',
        options: ['A product / feature', 'Analysis / report', 'Document / proposal', 'Not decided'],
        priority: 'blocking',
        reason: 'Fallback',
      },
      {
        id: 'output',
        label: 'Output',
        text: 'What output do you need?',
        options: ['Spec', 'Code / script', 'Table / SQL', 'Prose', 'Not decided'],
        priority: 'blocking',
        reason: 'Fallback',
      },
      {
        id: 'constraints',
        label: 'Constraints',
        text: 'Any important constraints?',
        options: ['None', 'Yes — type under Other', 'Not decided'],
        priority: 'important',
        reason: 'Fallback',
      },
    ]
  }
  return [
    {
      id: 'objective',
      label: 'Mục tiêu',
      text: 'Bạn muốn đạt được điều gì?',
      options: ['Một sản phẩm / tính năng', 'Phân tích / báo cáo', 'Văn bản / đề xuất', 'Chưa quyết định'],
      priority: 'blocking',
      reason: 'Fallback',
    },
    {
      id: 'output',
      label: 'Đầu ra',
      text: 'Đầu ra mong muốn là gì?',
      options: ['Spec', 'Code / script', 'Bảng / SQL', 'Văn bản', 'Chưa quyết định'],
      priority: 'blocking',
      reason: 'Fallback',
    },
    {
      id: 'constraints',
      label: 'Ràng buộc',
      text: 'Có ràng buộc quan trọng nào không?',
      options: ['Không', 'Có — ghi ở Phương án khác', 'Chưa quyết định'],
      priority: 'important',
      reason: 'Fallback',
    },
  ]
}
