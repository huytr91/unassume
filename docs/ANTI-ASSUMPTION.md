# Anti-assumption rules

## Labels

### User-confirmed

```text
✓ Explicitly provided by user
```

Sources: original request text the user wrote; selected options; custom “Other” text; edits the user made to prior answers.

### AI-suggested

```text
⚠ Suggested by AI
```

Sources: recommended options; inferred defaults in analysis; “recommended” architecture in draft prompts.

### Unknown

```text
? Not specified
```

Material gaps that would change the outcome if filled differently.

## Hard rules

1. Never promote **AI-suggested** → **User-confirmed** without an explicit user action.
2. Never omit a material **Unknown** by filling it in the final prompt as if decided.
3. Options are **hints**, not a closed world — free-form / Other is always available.
4. “Not decided” is a valid confirmation of deferral; record it under UNRESOLVED or explicit deferral, not as a concrete tech choice.
5. Downstream instructions must tell the next AI to **ask** on new material ambiguity — not invent.

## Output integrity check (before Call B)

- [ ] Every requirement in the verified prompt is traceable to user-confirmed (or original user text).
- [ ] No new business rules added by the compiler.
- [ ] Unresolved items listed, not silently resolved.
- [ ] Suggested-only items are absent or clearly marked non-binding (prefer absent from CONFIRMED).
