# CLEAR definition & test cases

## Definition of CLEAR

Pass when all are true:

1. Objective clear  
2. Scope sufficient to perform  
3. Material decisions confirmed (or explicitly deferred)  
4. No ambiguity that would significantly change the result  
5. Output requirements clear enough  
6. Important constraints known or explicitly open  
7. No mandatory questions remaining  

CLEAR does **not** require every conceivable detail.

## Good cases (should reach CLEAR without over-asking)

| ID | Input sketch | Expect |
| --- | --- | --- |
| G1 | Full stack already named (platform, auth, DB, roles, fields, deploy) | Few or zero questions; CLEAR quickly |
| G2 | User answers “Not decided” on non-blocking polish | May CLEAR with item in UNRESOLVED |
| G3 | Free-form Other resolves several gaps at once | Re-analyze; do not re-ask resolved gaps |
| G4 | Narrow ask: “SQL revenue this month from table sales, columns amount, sold_at” | Do not interview for unrelated app architecture |

## Bad cases (engine failure modes)

| ID | Failure | Expect detection |
| --- | --- | --- |
| B1 | Compiles verified prompt while platform/auth still unknown for a full app | Must stay NOT_CLEAR or list as unresolved — not invent |
| B2 | Marks “PostgreSQL” confirmed because it was only a suggested option | Provenance must stay ai_suggested until user picks |
| B3 | Asks 20 nice-to-have questions after material gaps closed | Over-ask; should CLEAR |
| B4 | Ignores custom answer “We use SQL Server 2022” and asks DB again | Must absorb free-form |
| B5 | Progressive miss: user said Mobile, never asks iOS/Android when that changes delivery | Should ask follow-up if material |
| B6 | Final prompt adds “use Redis cache” never mentioned | Output integrity fail |

## Manual checklist per interview

- [ ] Options include path to Other / custom  
- [ ] Progress is estimate, not fixed quiz  
- [ ] Re-evaluate after each answer round  
- [ ] Verified export blocked or labeled until CLEAR  
- [ ] Downstream instructions forbid inventing requirements  
