# Unassume Architecture — Ontology → Packs → CLEAR → Personal RAG

> Avoid two traps: (1) Call A only = fake diversity; (2) giant fixed questionnaires = not mass-market.

## One-line policy

**Ask everything the app knows it must ask; only when no valid clarification remains (or the user explicitly says proceed) may the original goal be sent to the model — still without inventing requirements or side-effects.**

Passthrough is the **last door**, never a shortcut. Jumping to generate early = wrapping a generic AI.

## Mandatory ladder (exhaust local ability first)

```text
1. Classify
   ordinary Q&A → answer directly
   work request → continue

2. Pack local
   ontology + domain packs (coding / data / business_ops / research)
   + intent meta (write / decide / …)
   Many cases finish here — no Call A.

3. Personal (on-device)
   Frequent answers (≥3) boosted as ★ options

4. Call A — meta only
   Whitelist slots; ban domain quizzes; pass intent family + missing slots

5. Filter
   Drop exam-style / subject-matter questions
   If ≥1–2 valid meta remain → ask the user

6. Follow-up CLEAR
   Vague (“ok / tùy”) → re-ask specifically
   Deferred (“Chưa quyết định”) counts as resolved for that slot

7. Passthrough (last resort only)
   When AND only when:
   - local pack cannot cover AND Call A fails/times out AND filter left nothing valid
   - OR user explicitly chooses “proceed with what I confirmed”
   Then: original goal + confirmed facts only; label unverified; never invent
   destination / schedule / “tool already ran” claims.
```

**Unassume ≠ wrap AI:** wrap AI = send prompt → model. Unassume clarifies the brief locally first; generate is authorized only after the ladder is exhausted or the user opts in.

## Phase 1 — Ontology + intent families

Universal slots (`objective`, `platform`, `evidence`, …) and 8 intents:

`build` · `analyze` · `transform` · `compare` · `automate` · `write` · `decide` · `research`

Code: `web/server/rag/ontology.ts`

## Phase 2 — Domain packs

| Pack | Audience |
| --- | --- |
| `coding` | Software / apps |
| `data` | Excel / CSV / SQL / analytics |
| `business_ops` | HR, CRM, approvals, ops |
| `research` | Market / news / analysis brief (meta slots only) |

Each pack: slots, VI/EN templates, options, follow-up edges.

Code: `web/server/rag/packs/`

No pack → ontology **meta** questions (`scope` / `output` / `constraints` / …), not Call A by default.

## Phase 3 — CLEAR scorer (model-independent)

`scoreClear()` uses pack `requiredSlots` (or intent cores if no pack).  
Deferred (“Chưa quyết định” / “Not decided”) counts as resolved.  
Vague answers (`ok`, `tùy`, …) do **not**.

Gold set must pass before shipping CLEAR / planner / Call A policy changes:

```bash
cd web && npm run test:gold
```

Covers: CLEAR cases, first-turn plan (pack + meta slots), anti subject-matter quiz filter.

Code: `web/server/rag/clear-scorer.ts`, `gold-set.ts`, `call-a-policy.ts`

### Call A contract (meta brief only)

Call A may only ask allowlisted **brief** slots (scope, output, constraints, audience, …).  
It must **never** quiz domain knowledge (“nguyên nhân giá vàng…”, “ai bị ảnh hưởng…”).  
Post-filter strips quizzes; merge only into missing allowlisted slots.  
If filtered empty → deterministic `metaQuestionsForSlots` (still ask the user — do **not** passthrough).

## Phase 4 — Learning (local Personal RAG only)

**No cloud telemetry. No model training.**

On-device: answers used ≥ 3 times are injected as ★ options next time.

- Toggle: “Nhớ lựa chọn trên máy này”
- Clear: “Xóa lịch sử gợi ý”
- Code: `web/src/lib/personal-rag.ts`

## Runtime flow

```text
Request
  → classify (ordinary | work)
  → detect intent + domain pack
  → plan questions (max 4)
  → personal ★ options
  → Call A only if local templates cannot cover a required slot
  → filter (meta only)
  → user answers (options + Other)
  → scoreClear (rules) → follow-ups
  → CLEAR → verified compile
  → else exhausted / user proceed → labeled passthrough (rare)
```

## Portable prompt (integration)

Machine-readable export for other agents:

- Schema: [`schemas/portable-prompt.schema.json`](../schemas/portable-prompt.schema.json)
- `mode`: `verified` | `passthrough`
- `label`: `VERIFIED` | `UNVERIFIED_PARTIAL` | `PASSTHROUGH`
- When `mode=passthrough`, document **must** include `passthrough.reason` + `passthrough.warning`

Examples under `schemas/examples/`.

## Thin answer / mood-killer guard

Policy: **always deliver a useful answer** (framework / checklist + stated assumptions). Never refusal-only.

If the answer is thin or could be sharper, Unassume still **shows the answer** and offers **Làm rõ thêm để cụ thể hơn** — it does not hide the deliverable to ask more questions.

Code: `web/server/rag/thin-answer.ts`, `declare-engine.ts`

## Moat

Not the UI. The moat is: ontology + packs + CLEAR gold set + on-device personal memory + disciplined Call A / passthrough gates.
