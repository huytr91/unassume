/**
 * Gold set runner — CLEAR + plan + Call A filter.
 * Or: npm run test:gold
 */
import { runGoldSet } from './gold-set.ts'

const result = runGoldSet()
for (const r of result.results) {
  const mark = r.pass ? 'PASS' : 'FAIL'
  const detail = r.detail as Record<string, unknown>
  const extra = [
    detail.pack != null ? `pack=${detail.pack}` : '',
    detail.actualPack != null ? `pack=${detail.actualPack}` : '',
    detail.actualSlots ? `slots=${JSON.stringify(detail.actualSlots)}` : '',
    detail.kept ? `kept=${JSON.stringify(detail.kept)}` : '',
    detail.reason ? String(detail.reason) : '',
    detail.note ? String(detail.note) : '',
  ].filter(Boolean).join(' | ')
  console.log(`${mark} ${r.id}${extra ? ` — ${extra}` : ''}`)
}
console.log(`\n${result.passed}/${result.total} passed`)
if (!result.ok) {
  console.error('Gold set failed:', result.failed.map((f) => f.id).join(', '))
  process.exit(1)
}
