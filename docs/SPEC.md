# DECLARE Engine SPEC

Normative flow for any implementation of DECLARE. Provider-agnostic.

## Goal

Convert ambiguity into an **explicit interview** before downstream AI execution.

**Policy:** Ask everything the product can clarify locally; only then (or on explicit user proceed) may the original goal reach the model — never invent requirements.

Passthrough / raw generate is a **last resort**, not a shortcut. See [ARCHITECTURE.md](./ARCHITECTURE.md) ladder.

## Calls

```text
User request
    ↓
Local classify + packs + personal (+ Call A meta only if needed)
    ↓
Gate — CLEAR?
   ↙        ↘
 NO          YES
  ↓           ↓
 more Q     Call B — Execute / compile verified prompt
 (or rare labeled passthrough if exhausted / user proceed)
```

| Call | Allowed | Forbidden |
| --- | --- | --- |
| **Call A** | Analyze request; detect missing/ambiguous facts; emit questions + options; interpret answers; re-evaluate CLEAR | Invent confirmed requirements; produce final deliverable as if decided; treat AI suggestions as user-confirmed |
| **Gate** | Allow Call B only when state = `CLEAR` | Generate “final” prompt while `NOT_CLEAR` (except explicit force/export draft, if product allows and labels it unverified) |
| **Call B** | Compile verified prompt / structured request from **user-confirmed** data only; instruct downstream AI not to invent | Add new business requirements; silently resolve unknowns |

## Pipeline stages

1. **Understand** — objective, scope hints, constraints already stated.
2. **Identify requirements** — only categories relevant to this request (not a fixed questionnaire).
3. **Detect missing / ambiguous** — prioritize facts that would **change the outcome**.
4. **Determine necessity** — skip questions that do not materially affect implementation at this clarity level.
5. **Generate questions** — clear, relevant, actionable, non-leading, progressive.
6. **Collect answers** — options are suggestions; **Other / free-form** always allowed; optional `Not decided` when appropriate.
7. **Re-analyze** — free-form answers are re-interpreted, not only stored verbatim.
8. **Evaluate CLEAR** — see [../checklists/test-cases.md](../checklists/test-cases.md).
9. **Compile** — verified prompt + structured request (Call B / compile step).

## Interview turn (logical)

Each turn outputs roughly:

- `status`: `NOT_CLEAR` | `CLEAR`
- `progress` (UX only): confirmed count, remaining estimate — not a fixed quiz length
- `questions[]`: id, text, context?, options[], allowCustom, allowNotDecided?, priority, reason
- `confirmed[]`: facts marked user-confirmed
- `unknown[]` / `suggested[]`: never promote suggested → confirmed without user action

JSON shapes: [../schemas/interview-turn.schema.json](../schemas/interview-turn.schema.json).

## CLEAR (definition)

A request is **CLEAR** when:

1. Objective is clear.
2. Scope is sufficient to act.
3. Material decisions are confirmed (or explicitly deferred as `Not decided` and labeled unresolved).
4. No remaining ambiguity that would **significantly** change the result.
5. Output requirements are clear enough.
6. Important constraints are known or explicitly open.
7. No mandatory questions remain.

CLEAR ≠ “every possible detail exists.”

## Verified output integrity

```text
User Intent → Interview → Confirmed Data → Final Prompt
```

Must not become:

```text
User Intent → AI Assumption → Final Prompt
```

Structured request must separate:

- OBJECTIVE  
- CONFIRMED REQUIREMENTS  
- CONSTRAINTS  
- BUSINESS RULES  
- USER DECISIONS  
- UNRESOLVED ITEMS  
- OUTPUT REQUIREMENTS  
- INSTRUCTIONS TO DOWNSTREAM AI (`Do not invent requirements. Ask before material decisions.`)

Schema: [../schemas/verified-request.schema.json](../schemas/verified-request.schema.json).

## Anti-assumption (summary)

| Label | Meaning |
| --- | --- |
| User-confirmed | Explicitly provided or chosen by user |
| AI-suggested | Engine proposal; not binding |
| Unknown | Not specified |

Full rules: [ANTI-ASSUMPTION.md](ANTI-ASSUMPTION.md).

## Question principles

- **Clear** — non-experts understand.
- **Relevant** — tied to this request.
- **Actionable** — user knows how to answer.
- **Non-leading** — options are not the “AI favorite.”
- **Progressive** — later questions depend on earlier answers.
- **Stop** — when CLEAR; do not ask everything imaginable.

## Provider independence

Core logic must not be tightly coupled to one model vendor. BYOK / client-side keys are product choices (see BRD); the gate contract above stays the same.

## Implementation note

Products (e.g. Userward) may use local rules + model interview as Call A. This SPEC only requires the **gate semantics**, not a particular stack.
