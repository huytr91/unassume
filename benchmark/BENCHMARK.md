# Unassume benchmark (community-ready)

**Status:** maintainer-seeded baseline (not an independent third-party study).

This folder is a **harness + seed set**, not a marketing scoreboard.
Anyone can run the offline compare locally and propose new cases via PR.

## What we measure

For each case:

1. **Raw** — original request would go straight to a model (no interview).
2. **Unassume** — local plan/interview before answer (packs + meta slots).

Humans judge (do **not** auto-score with another LLM in v1):

| Rubric | Values |
| --- | --- |
| R1 Material assumption risk if raw? | yes / no |
| R2 Unassume questions are meta-brief (not domain quiz)? | yes / no |
| R3 Winner for avoid-wrong-assumption | `raw` / `unassume` / `tie` |

Offline automation checks (when present):

- `expect_interview`
- `quizHits` empty (no subject-matter quiz)
- `expect_slots_any` + `expect_slot_hits_min` (golden first-turn slots)

## Seed provenance

| Batch | Source | Label |
| --- | --- | --- |
| `cases/maintainer-seed.json` (B01–B28) | Written by maintainer | `seeded_by: maintainer` |
| `cases/hard-ambiguity-20.json` (H01–H20) | Hard ambiguity set + golden slots | `seeded_by: maintainer` |

Community cases must set `seeded_by: community` and link a real transcript or issue.

## Run

```bash
cd web
npm run test:compare
npm run test:compare -- --case H14
npm run test:compare -- --file=hard-ambiguity-20.json
```

Gold CLEAR regression (CI):

```bash
cd web
npm run test:gold
```

## Results table (human)

Maintainer offline judgment (2026-09-15): plans from `npm run test:compare` + case notes.
R1 = material assumption risk if raw; R2 = Unassume questions are meta-brief; R3 = winner for avoid-wrong-assumption.
All cases had `quizHits: []` after anti-quiz brief-cue fix.

| Case | Judge | R1 raw risk | R2 meta-ok | R3 winner | Notes |
| --- | --- | --- | --- | --- | --- |
| B01 | maintainer | yes | yes | unassume | platform/output missing on classic build |
| B02 | maintainer | yes | yes | unassume | CRM → coding pack (build bias) |
| B03 | maintainer | yes | yes | unassume | Excel needs evidence/scope |
| B04 | maintainer | yes | yes | unassume | churn CSV — same data slots |
| B05 | maintainer | yes | yes | unassume | ops workflow — actor/objective |
| B06 | maintainer | yes | yes | unassume | gold market — meta only, not quiz |
| B07 | maintainer | yes | yes | unassume | EN outlook — meta brief |
| B08 | maintainer | yes | yes | unassume | viral without subject/audience |
| B09 | maintainer | yes | yes | unassume | SaaS viral — same |
| B10 | maintainer | yes | yes | unassume | write intent — audience/tone |
| B11 | maintainer | yes | yes | unassume | launch copy — audience/output |
| B12 | maintainer | yes | yes | unassume | reconcile tables — evidence |
| B13 | maintainer | yes | yes | unassume | Nest vs Express — criteria |
| B14 | maintainer | yes | yes | unassume | Postgres vs Mongo — criteria |
| B15 | maintainer | yes | yes | unassume | Slack report — schedule/output |
| B16 | maintainer | yes | yes | unassume | invoice reminders — actors |
| B17 | maintainer | yes | yes | unassume | forecast ask still needs scope |
| B18 | maintainer | yes | yes | unassume | booking app — platform |
| B19 | maintainer | yes | yes | unassume | migrate monolith — scope/success |
| B20 | maintainer | yes | yes | unassume | blog — audience/output |
| B21 | maintainer | yes | yes | unassume | CI/CD checklist — platform |
| B22 | maintainer | yes | yes | unassume | legal summary — constraints/audience |
| B23 | maintainer | no | yes | tie | ordinary definitional EN |
| B24 | maintainer | no | yes | tie | ordinary definitional VI |
| B25 | maintainer | yes | yes | unassume | KPI dashboard — evidence/scope |
| B26 | maintainer | yes | yes | unassume | content calendar — audience |
| B27 | maintainer | yes | yes | unassume | SSO refactor — platform/auth |
| B28 | maintainer | yes | yes | unassume | SOP onboarding — actor/scope |

**Summary (maintainer seed B):** R3 unassume 26/28 · tie 2/28 (ordinary Q&A) · raw 0/28.

### Hard ambiguity batch H01–H20 (2026-09-27)

Offline audit: `expect_interview` + `quizHits=[]` + golden `expect_slots_any` (≥2 hits).
Ran via `npm run test:compare -- --file=hard-ambiguity-20.json` → **20/20 PASS**.
Full suite (B+H): **48/48 PASS**.

| Case | Domain | R1 | R2 | R3 | Golden slots (offline) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| H01 | coding / hotel app | yes | yes | unassume | PASS | payment/PMS hidden |
| H02 | growth / FB ads | yes | yes | unassume | PASS | budget/KPI hidden |
| H03 | data / fund report | yes | yes | unassume | PASS | methodology/benchmark hidden |
| H04 | write / JD | yes | yes | unassume | PASS | salary/stack hidden |
| H05 | coding / recommender | yes | yes | unassume | PASS | cold-start/privacy hidden |
| H06 | write / contract | yes | yes | unassume | PASS | jurisdiction/IP hidden |
| H07 | coding / clinic | yes | yes | unassume | PASS | regs/EMR hidden |
| H08 | coding / AI tutor | yes | yes | unassume | PASS | level/curriculum hidden |
| H09 | data / Excel→PG | yes | yes | unassume | PASS | schema/dedup hidden |
| H10 | data / OCR invoices | yes | yes | unassume | PASS | fields/accuracy hidden |
| H11 | coding / security | yes | yes | unassume | PASS | threat model hidden |
| H12 | coding / real estate | yes | yes | unassume | PASS | country/data source hidden |
| H13 | ops / routing | yes | yes | unassume | PASS | fleet/windows hidden |
| H14 | automate / hotel FB | yes | yes | unassume | PASS | PMS/approval golden |
| H15 | coding / share feature | yes | yes | unassume | PASS | permissions hidden |
| H16 | automate / Python | yes | yes | unassume | PASS | file types/logic hidden |
| H17 | automate / email agent | yes | yes | unassume | PASS | approval/PII hidden |
| H18 | research / strategy | yes | yes | unassume | PASS | market/budget hidden |
| H19 | write / dashboard UX | yes | yes | unassume | PASS | users/tasks hidden |
| H20 | data / DB cleanup | yes | yes | unassume | PASS | delete vs archive / PII |

**Summary (hard H):** R3 unassume 20/20 · offline golden 20/20. Pack routing fixed so fund/report/cleanup stay on **data**, not coding.

## Contribute a case

1. Open a GitHub issue with template **Benchmark case**.
2. Or PR adding an object to `cases/` (JSON) with `seeded_by: community`.
3. Include: original request, what went wrong with raw chat (if any), suggested slots / `expect_slots_any`.

Do **not** submit only easy wins. Prefer cases where a model assumed a material requirement.
