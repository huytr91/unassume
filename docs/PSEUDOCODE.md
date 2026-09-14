# Interview engine — short pseudo-code

Provider-agnostic sketch. Not production code; not a copy of any app pipeline.

```text
function declare(request, history = []):
  context = { request, answers: history }

  loop:
    analysis = CallA_analyze(context)
    // returns: objective, confirmed[], suggested[], unknowns[], priority_ranked

    if is_clear(analysis):
      return CallB_compile(analysis)
      // verified_prompt + structured_request
      // only user-confirmed (+ explicit deferrals)

    questions = generate_questions(analysis.unknowns)
    // each question: options[] as hints, allow_custom = true
    // skip non-material unknowns

    if questions is empty:
      // nothing material left to ask
      return CallB_compile(analysis)

    answers = present_to_user(questions)
    // interpret free-form; do not only store raw strings

    context.answers.append(normalize(answers))
    // re-evaluate next iteration

function is_clear(analysis):
  return
    analysis.objective_ok
    and analysis.scope_sufficient
    and no_material_unknowns(analysis.unknowns)
    and analysis.output_requirements_ok
    and analysis.mandatory_questions_remaining == 0

function no_material_unknowns(unknowns):
  // CLEAR ≠ complete encyclopedia
  return none where impact == "changes_outcome_significantly"
```

## Gate invariant

```text
assert status == CLEAR before CallB_compile for “verified” export
```

Draft / unverified export (if any) must be labeled — never silently presented as DECLARE-verified.
