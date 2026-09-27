import type { DomainPack, DomainPackId } from '../ontology.ts'
import { businessOpsPack } from './business-ops.ts'
import { codingPack } from './coding.ts'
import { dataPack } from './data.ts'
import { researchPack } from './research.ts'

export { businessOpsPack, codingPack, dataPack, researchPack }

/** Order: more specific packs first for density ties. */
export const DOMAIN_PACKS: DomainPack[] = [codingPack, dataPack, businessOpsPack, researchPack]

export function getPack(id: DomainPackId): DomainPack | undefined {
  return DOMAIN_PACKS.find((p) => p.id === id)
}

/** Highest keyword-hit density wins among matches. */
export function detectDomainPack(request: string): DomainPack | null {
  const matched = DOMAIN_PACKS.filter((p) => p.detect.test(request))
  if (!matched.length) return null
  if (matched.length === 1) return matched[0]

  let densest: DomainPack | null = null
  let dens = -1
  for (const pack of matched) {
    const words = pack.detect.source.split('|').map((w) => w.replace(/[\\^$*+?()[\]{}]/g, ''))
    let hits = 0
    for (const w of words) {
      if (w.length >= 3 && new RegExp(w, 'i').test(request)) hits += 1
    }
    // Prefer research slightly when analysis/market words dominate over coding
    const bias = pack.id === 'research' && /thị trường|giá|outlook|forecast|vàng|macro|viral|marketing|tăng trưởng/i.test(request) ? 2 : 0
    // Prefer coding when build/software signals compete with ops (e.g. "Build a CRM")
    const codingBias = pack.id === 'coding' && /\b(build|app|api|hệ thống|ứng dụng|refactor|migrate|sso|ci\/?cd)\b/i.test(request)
      && !/\b(excel|csv|postgres|portfolio|returns?|invoice|pdf|ocr|clean|dedup|report)\b/i.test(request)
      ? 2 : 0
    // Prefer data when ETL / reporting / cleanup signals are present
    const dataBias = pack.id === 'data' && /\b(excel|csv|postgres|postgresql|portfolio|returns?|invoice|pdf|ocr|clean|dedup|import|report|database)\b/i.test(request) ? 3 : 0
    const score = hits + bias + codingBias + dataBias
    if (score > dens) {
      dens = score
      densest = pack
    }
  }
  return densest ?? matched[0]
}
