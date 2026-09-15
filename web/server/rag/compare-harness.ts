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
}

const benchRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../benchmark')

function loadCases(): BenchmarkCase[] {
  const seedFile = join(benchRoot, 'cases', 'maintainer-seed.json')
  if (existsSync(seedFile)) {
    return JSON.parse(readFileSync(seedFile, 'utf8')) as BenchmarkCase[]
  }
  const dir = join(benchRoot, 'cases')
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'maintainer-seed.json').sort()
  return files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as BenchmarkCase)
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
    note: plan.ordinaryQa
      ? 'Ordinary Q&A — Unassume may answer without interview.'
      : 'Interview planned before answer (local pack / meta).',
  }
}

function printCase(c: BenchmarkCase) {
  const raw = rawBranch(c.request)
  const ua = unassumeBranch(c.request)
  console.log('\n' + '='.repeat(72))
  console.log(`${c.id}  [seeded_by=${c.seeded_by}]  ${c.domain_hint ?? ''}`)
  console.log(`REQUEST: ${c.request}`)
  if (c.note) console.log(`NOTE: ${c.note}`)
  console.log('-'.repeat(72))
  console.log('RAW:', JSON.stringify(raw, null, 2))
  console.log('UNASSUME:', JSON.stringify(ua, null, 2))
  console.log('-'.repeat(72))
  console.log('HUMAN RUBRIC (record in benchmark/BENCHMARK.md):')
  console.log('  1. Did raw risk a material assumption Unassume would ask about? (yes/no)')
  console.log('  2. Are Unassume questions meta-brief (not domain quiz)? (yes/no)')
  console.log('  3. Winner for avoid-wrong-assumption: raw | unassume | tie')
  if (c.expect_interview != null) {
    const ok = ua.interview === c.expect_interview
    console.log(`  offline expect_interview=${c.expect_interview} actual=${ua.interview} → ${ok ? 'PASS' : 'FAIL'}`)
    return ok
  }
  return true
}

function main() {
  const args = process.argv.slice(2)
  const only = args.find((a) => a.startsWith('--case='))?.slice('--case='.length)
    ?? (args.includes('--case') ? args[args.indexOf('--case') + 1] : undefined)
  if (args.includes('--live')) {
    console.log('Live dual-model call is intentionally out of scope for v1.')
    console.log('Offline harness prints side-by-side plans for human judging.')
  }

  let cases = loadCases()
  if (only) cases = cases.filter((c) => c.id === only)
  if (!cases.length) {
    console.error('No benchmark cases found under benchmark/cases/')
    process.exit(1)
  }

  let failed = 0
  for (const c of cases) {
    if (!printCase(c)) failed += 1
  }
  console.log('\n' + '='.repeat(72))
  console.log(`Offline compare: ${cases.length - failed}/${cases.length} expect_interview checks passed.`)
  if (failed) process.exit(1)
}

main()
