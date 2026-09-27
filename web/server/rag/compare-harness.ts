import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { planInterview } from './planner.ts'
import { looksLikeSubjectMatterQuiz } from './call-a-policy.ts'

export type BenchmarkCase = {
  id: string
  request: string
  locale?: 'vi' | 'en'
  domain_hint?: string
  seeded_by: 'maintainer' | 'community'
  note?: string
  expect_interview?: boolean
  /** At least this many of expect_slots_any must appear in first-turn questions. */
  expect_slot_hits_min?: number
  expect_slots_any?: string[]
  hidden?: string[]
}

const benchRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../benchmark')

function loadCases(): BenchmarkCase[] {
  const dir = join(benchRoot, 'cases')
  if (!existsSync(dir)) return []
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
  const all: BenchmarkCase[] = []
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(dir, f), 'utf8')) as BenchmarkCase | BenchmarkCase[]
    if (Array.isArray(raw)) all.push(...raw)
    else all.push(raw)
  }
  return all
}

function rawBranch(request: string) {
  return {
    branch: 'raw' as const,
    interview: false,
    questions: [] as { id: string; text: string }[],
    note: 'Would send original request straight to the model (no Unassume interview).',
    promptPreview: request.trim(),
  }
}

function unassumeBranch(request: string) {
  const plan = planInterview(request)
  const quizHits = plan.questions.filter((q) => looksLikeSubjectMatterQuiz(q.text, q.options))
  return {
    branch: 'unassume' as const,
    interview: !plan.ordinaryQa && plan.questions.length > 0,
    ordinaryQa: plan.ordinaryQa,
    intent: plan.intent,
    pack: plan.pack?.id ?? null,
    needsModelInterview: plan.needsModelInterview,
    questions: plan.questions.map((q) => ({ id: q.id, text: q.text, options: q.options })),
    quizHits: quizHits.map((q) => q.id),
    slots: plan.questions.map((q) => q.id),
    note: plan.ordinaryQa
      ? 'Ordinary Q&A — Unassume may answer without interview.'
      : 'Interview planned before answer (local pack / meta).',
  }
}

function slotExpectationOk(c: BenchmarkCase, slots: string[]): { ok: boolean; hits: string[]; detail: string } {
  if (!c.expect_slots_any?.length) {
    return { ok: true, hits: [], detail: 'no slot golden' }
  }
  const want = new Set(c.expect_slots_any)
  const hits = slots.filter((s) => want.has(s))
  const min = c.expect_slot_hits_min ?? Math.min(2, c.expect_slots_any.length)
  const ok = hits.length >= min
  return {
    ok,
    hits,
    detail: `slot_hits=${hits.length}/${min} [${hits.join(',') || 'none'}] want_any=[${c.expect_slots_any.join(',')}]`,
  }
}

function printCase(c: BenchmarkCase) {
  const raw = rawBranch(c.request)
  const ua = unassumeBranch(c.request)
  console.log('\n' + '='.repeat(72))
  console.log(`${c.id}  [seeded_by=${c.seeded_by}]  ${c.domain_hint ?? ''}`)
  console.log(`REQUEST: ${c.request}`)
  if (c.note) console.log(`NOTE: ${c.note}`)
  if (c.hidden?.length) console.log(`HIDDEN: ${c.hidden.join('; ')}`)
  console.log('-'.repeat(72))
  console.log('RAW:', JSON.stringify(raw, null, 2))
  console.log('UNASSUME:', JSON.stringify(ua, null, 2))
  console.log('-'.repeat(72))
  console.log('HUMAN RUBRIC (record in benchmark/BENCHMARK.md):')
  console.log('  1. Did raw risk a material assumption Unassume would ask about? (yes/no)')
  console.log('  2. Are Unassume questions meta-brief (not domain quiz)? (yes/no)')
  console.log('  3. Winner for avoid-wrong-assumption: raw | unassume | tie')

  let ok = true
  if (c.expect_interview != null) {
    const interviewOk = ua.interview === c.expect_interview
    console.log(`  offline expect_interview=${c.expect_interview} actual=${ua.interview} → ${interviewOk ? 'PASS' : 'FAIL'}`)
    if (!interviewOk) ok = false
  }
  if (ua.quizHits.length) {
    console.log(`  offline quizHits=${ua.quizHits.join(',')} → FAIL`)
    ok = false
  } else {
    console.log('  offline quizHits=[] → PASS')
  }
  const slotCheck = slotExpectationOk(c, ua.slots)
  if (c.expect_slots_any?.length) {
    console.log(`  offline golden slots: ${slotCheck.detail} → ${slotCheck.ok ? 'PASS' : 'FAIL'}`)
    if (!slotCheck.ok) ok = false
  }
  return ok
}

function main() {
  const args = process.argv.slice(2)
  const only = args.find((a) => a.startsWith('--case='))?.slice('--case='.length)
    ?? (args.includes('--case') ? args[args.indexOf('--case') + 1] : undefined)
  const fileFilter = args.find((a) => a.startsWith('--file='))?.slice('--file='.length)
  if (args.includes('--live')) {
    console.log('Live dual-model call is intentionally out of scope for v1.')
    console.log('Offline harness prints side-by-side plans for human judging.')
  }

  let cases = loadCases()
  if (fileFilter) {
    const dir = join(benchRoot, 'cases')
    const path = join(dir, fileFilter.endsWith('.json') ? fileFilter : `${fileFilter}.json`)
    if (!existsSync(path)) {
      console.error(`Case file not found: ${path}`)
      process.exit(1)
    }
    const raw = JSON.parse(readFileSync(path, 'utf8')) as BenchmarkCase | BenchmarkCase[]
    cases = Array.isArray(raw) ? raw : [raw]
  }
  if (only) cases = cases.filter((c) => c.id === only)
  if (!cases.length) {
    console.error('No benchmark cases found under benchmark/cases/')
    process.exit(1)
  }

  let failed = 0
  const fails: string[] = []
  for (const c of cases) {
    if (!printCase(c)) {
      failed += 1
      fails.push(c.id)
    }
  }
  console.log('\n' + '='.repeat(72))
  console.log(`Offline compare: ${cases.length - failed}/${cases.length} checks passed.`)
  if (fails.length) console.log(`Failed: ${fails.join(', ')}`)
  if (failed) process.exit(1)
}

main()
