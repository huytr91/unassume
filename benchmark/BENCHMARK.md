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

Offline automation only checks `expect_interview` when present (plan exists vs ordinary Q&A).

## Seed provenance

| Batch | Source | Label |
| --- | --- | --- |
| `cases/maintainer-seed.json` (B01–B28) | Written by maintainer | `seeded_by: maintainer` |

Community cases must set `seeded_by: community` and link a real transcript or issue.

## Run

```bash
cd web
npm run test:compare
npm run test:compare -- --case B08
```

Gold CLEAR regression (CI):

```bash
cd web
npm run test:gold
```

## Results table (human)

Fill after running the harness. Leave blank until judged.

| Case | Judge | R1 raw risk | R2 meta-ok | R3 winner | Notes |
| --- | --- | --- | --- | --- | --- |
| B01 | maintainer | | | | pending |
| B02 | maintainer | | | | pending |
| B03 | maintainer | | | | pending |
| B04 | maintainer | | | | pending |
| B05 | maintainer | | | | pending |
| B06 | maintainer | | | | pending |
| B07 | maintainer | | | | pending |
| B08 | maintainer | | | | pending |
| B09 | maintainer | | | | pending |
| B10 | maintainer | | | | pending |
| B11 | maintainer | | | | pending |
| B12 | maintainer | | | | pending |
| B13 | maintainer | | | | pending |
| B14 | maintainer | | | | pending |
| B15 | maintainer | | | | pending |
| B16 | maintainer | | | | pending |
| B17 | maintainer | | | | pending |
| B18 | maintainer | | | | pending |
| B19 | maintainer | | | | pending |
| B20 | maintainer | | | | pending |
| B21 | maintainer | | | | pending |
| B22 | maintainer | | | | pending |
| B23 | maintainer | | | | pending |
| B24 | maintainer | | | | pending |
| B25 | maintainer | | | | pending |
| B26 | maintainer | | | | pending |
| B27 | maintainer | | | | pending |
| B28 | maintainer | | | | pending |

## Contribute a case

1. Open a GitHub issue with template **Benchmark case**.
2. Or PR adding an object to `cases/` (JSON) with `seeded_by: community`.
3. Include: original request, what went wrong with raw chat (if any), suggested slots.

Do **not** submit only easy wins. Prefer cases where a model assumed a material requirement.
