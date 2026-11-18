# Documentation gate audit

The consistency audit required before implementation begins. Performed on 2026-11-16 on baseline 1.0 of this package.

## 1. What kind of audit this is

It was done by the same author that wrote the documents, in the same sitting. It is not an independent review. It has three parts with different strengths:

| Part | Method | Strength |
|---|---|---|
| Mechanical | A script read every document and cross-checked identifiers, counts and file references | Strong for what it checks: nothing was missed by eye |
| Diagram parsing | Every Mermaid block was parsed with the Mermaid parser (version 11) | Shows the diagrams are syntactically valid. They were not rendered or inspected visually |
| Design model | A small throwaway model of the chapter's rules, written for this audit and kept outside the project, was run to check the documents' claims about solvability, the count and timings | A second derivation of the design's numbers. It is a simplification written by the same author, not the implementation and not a substitute for MC-01 to MC-05 |
| Reading | The gate checklist was answered by re-reading the documents | Weakest. An independent reader should repeat it |

No application code was written. The model and scripts are not in this repository.

## 2. Gate checklist

| # | Check | Result | Basis |
|---|---|---|---|
| 1 | PRD and GDD agree on scope | Pass | Both: one chapter, five sequences, eleven modules, six seams, one enemy, hands only, seated, local save. Exclusions in the PRD section 9 contradict nothing in the GDD |
| 2 | Every gameplay mechanic exists in the GDD and in the architecture | Pass | See section 3 |
| 3 | Every SRS requirement has a test or an explicit manual validation method | Pass | Mechanical: 125 of 125 requirements have a row in the traceability matrix with at least one test; 103 have an automated test; 22 are verified only by inspection, headset or playtest and are marked |
| 4 | All interaction APIs exist in the installed IWSDK version | Pass with conditions | Every SDK symbol the architecture names was read in the 1.1.0 type declarations or in guidance shipped by the generator, and is listed with its evidence level in `iwsdk-verification.md`. Eleven assumptions about *behaviour* are untested and are the first work of M0 |
| 5 | The architecture supports hands-only gameplay | Pass on paper | Three gestures, each mapped to a declared SDK mechanism; no required step uses a controller; one-handed mode specified. Unproven on hardware (risk R-01, R-07) |
| 6 | The graph is the authoritative source of room connectivity | Pass | ADR-002; `domain-model.md` section 5; REQ-GRAPH-001 and REQ-GRAPH-005; presentation is given a view and events only |
| 7 | Surveyor pathfinding reads that graph | Pass | `domain-model.md` section 7: routing takes the graph and nothing else; REQ-ENEMY-002 |
| 8 | Rendering does not own game logic | Pass | ADR-008; layer rules in `technical-architecture.md` section 3; enforced by INS-01 and INS-09 once code exists |
| 9 | The save schema is versioned | Pass | `save-schema.md`: `schemaVersion` and `contentVersion`; validation; recovery ladder |
| 10 | Performance targets are measurable | Pass | Each REQ-PERF has a numeric threshold, a method and a tool in `performance-test-plan.md`. None has been measured |

## 3. Mechanic coverage

| Mechanic | GDD | Rules | Architecture | Requirements | Tests |
|---|---|---|---|---|---|
| Seam manipulation | Section 5 | `house-graph-rules.md` 4 to 6 | `domain-model.md` 6; hand adapter | REQ-SEAM-001 to 012 | UT-SEAM-01 to 13; RT-04 to RT-09 |
| Sockets and connection | Section 6 | `house-graph-rules.md` 2 | `domain-model.md` 5 | REQ-GRAPH-002 | UT-CONN-01 to 06 |
| House graph | Section 6 | `house-graph-rules.md` | `domain-model.md` 5 | REQ-GRAPH-001 to 008 | UT-GRAPH-01 to 06 |
| Blocking | Section 5 | `house-graph-rules.md` 5 | `domain-model.md` 6 | REQ-SEAM-004 | UT-SEAM-04; RT-09 |
| Vantage hops | Section 4 | `locomotion-comfort.md` 2 | Hop Coordinator | REQ-COMFORT-002, 003 | RT-10; CF-02 |
| Puzzles and hints | Section 7 | `puzzle-design.md` | `domain-model.md` 8 | REQ-PUZZLE-001 to 006 | UT-PUZ-01 to 06; MC-01 to 03 |
| The Surveyor | Section 8 | `enemy-surveyor.md` | `domain-model.md` 7 | REQ-ENEMY-001 to 012 | UT-SURV-01 to 13; MC-03, MC-04; RT-14 |
| The letter and envelope | Sections 4, 12 | `hand-interaction-spec.md` 8, 9 | Letter adapter; envelope view | REQ-GAME-004; REQ-UX-005 | UT-PUZ-06; RT-16, RT-21 |
| Checkpoints and failure | Section 11 | `first-chapter.md` 6, 9 | `runtime-lifecycle.md` 3 | REQ-STATE-003; REQ-SAVE-001 to 007 | UT-STATE-03; UT-SAVE-01 to 06 |
| Game states | Section 13 | `runtime-lifecycle.md` 3 | Progression | REQ-STATE-001 to 005 | UT-STATE-01 to 05 |

## 4. Mechanical results

| Check | Result |
|---|---|
| Requirement IDs defined | 125, all unique; group counts match the SRS table |
| References to requirement IDs across all documents | About 565; none to an undefined ID |
| Test IDs defined | 129: 59 unit, 5 model, 10 inspection, 24 runtime, 9 performance, 7 comfort, 10 headset, 5 playtest |
| References to test IDs | About 800; none to an undefined ID |
| Tests defined but never cited by the matrix | None after the fixes below |
| Traceability rows | 125; none without a test; the manual-only marks agree with the columns |
| Questions | 38 defined; every reference resolves |
| SDK assumptions | 11; each has a question |
| Risks | 21; each has impact, mitigation and validation; every reference resolves |
| Chapter identifiers | 11 modules, 22 sockets, 6 seams, 11 vantages, 6 checkpoints; every seam, vantage, checkpoint and socket named in any document exists in `first-chapter.md` |
| Seam configurations | 2 x 3 x 4 x 2 x 3 x 2 = 288, as stated |
| Vantage adjacency | Symmetric |
| Anchor rule | No station is in the module its seam moves |
| File references | About 260; all resolve |
| Mermaid diagrams | 10; all parse |
| Placeholder text | None found |
| Acceptance criteria | 11, each with automated and headset evidence named |
| Milestones | 8, each with acceptance criteria and a complexity estimate |

## 5. Design model results

The model used the modules, connections, seams, vantages and timings of `first-chapter.md` and the Surveyor's rules as written.

| Claim in the documents | Model result |
|---|---|
| The Turning Room gives a route only at position 1 | Confirmed: position 0 connects the landing only; 1 connects both; 2 and 3 connect neither |
| The chapter cannot be softlocked by the player's own moves | Confirmed for the model without the Surveyor: 1,548 reachable states covering all 288 configurations; Room Zero is reachable from every one |
| The reference solution is ten hops and eight seam moves | Consistent: the shortest solution without the Surveyor is 17 actions, being the same route less the two bridge moves, with the landing's two notches counted separately |
| The lift and arm must be operated in order | Confirmed: the docked state is reachable only after moving the lift away |
| The count is 3 on waking, 2 on entering the East Corridor, 2 after the bridge swings, 1 on entering the bridge | Confirmed |
| Doing nothing is fatal | Confirmed: reached 36 s after arriving at `v-cwest-end` |
| The window to seal the Surveyor in the office | 12.6 s, recurring about every 15 s |
| The finale's count is 3 | Confirmed |
| Time to leave the corridor at the finale | 18.7 s from docking |
| The chapter takes 5 to 7 minutes | 5 minutes 28 seconds at the reference pacing now stated in `first-chapter.md` section 10 |

These confirm that the documents agree with themselves. They do not show that the timings feel right; that needs players.

## 6. Defects found by the audit and fixed

| # | Defect | Found by | Fix |
|---|---|---|---|
| 1 | **The Surveyor's measuring rule was ambiguous and wrong.** "It measures from the far side of the joint" flips once it walks through. In the model it paced across the new doorway for ever and the office trap never held | Design model | Rule replaced: it measures from the side that stayed still, fixed when the joint is made. `enemy-surveyor.md` 6, `domain-model.md` 6 and 7, `save-schema.md`, UT-SURV-05 |
| 2 | The encounter's narrative said the Surveyor stops at a brink with its plumb line when the bridge swings. By its rules that happens only if it is already on the bridge | Reading against the rules | `first-chapter.md` sequence 4 and `puzzle-design.md` rewritten to match; RT-14 expectations corrected and a variant added |
| 3 | The window to seal it in was stated as about eleven seconds; the rules give about twelve and a half | Design model | Corrected in four documents |
| 4 | `stair.head` was listed as connecting when the landing seam alone was right; it also needs the hall seam | Writing the model | Socket table corrected, matching REQ-PUZZLE-001 |
| 5 | The ending in standard intensity placed the ring 1.2 m from the player, inside the 1.5 m minimum of REQ-COMFORT-007 | Reading | Changed to 1.5 m |
| 6 | The 5 to 7 minute claim had no stated pacing assumptions; with fast play the reference solution is nearer four and a half minutes | Design model | A reference pacing table added; REQ-GAME-003 now cites it |
| 7 | The traceability summary counted 104 automated and 21 manual-only; the rows give 103 and 22 | Script | Corrected |
| 8 | UT-SAVE-01 was defined and never cited | Script | Cited under REQ-SAVE-001 |
| 9 | REQ-SEAM-005 (preview), REQ-REL-004 (asset failure) and REQ-ERR-002 (refused session) had no test that actually exercised them | Writing the matrix | UT-SEAM-13 added; RT-23 and RT-24 extended |
| 10 | A semicolon in a sequence-diagram message would have split the statement | Reading before parsing | Removed |

Defect 1 is the reason this kind of audit is worth doing before code. It would have been found in M4, after a state machine had been built round the wrong rule.

## 7. Weak points that remain

Not defects in the documents, but places an implementer should not take on trust.

1. **Hands.** Everything about grab reliability, tracking loss timing and near-versus-far pinch arbitration is assumption until M0.
2. **Comfort of very large moving rooms.** Reasoned, not tested.
3. **The Surveyor's rules have been modelled once, by their author.** The exploit analysis in `enemy-surveyor.md` section 11 is by inspection. MC-01 to MC-04 on the real implementation are the proper check.
4. **Collision volumes do not exist yet.** The one blocking relationship the chapter needs is asserted, not computed.
5. **Socket poses are not authored.** The connection table is intent. Content validation (UT-CONN-06) is what will make it fact.
6. **Budgets are estimates.** No draw call has been counted.
7. **Art scope.** Eleven rooms and a hero character is a great deal of content. The decision point is the end of M5.
8. **The official guides describe an older SDK version** than the one that installs.

## 8. Unresolved decisions

All 38 are in `unresolved-questions.md`. The ones that gate the start of implementation:

- Q-19: is a headset available.
- Q-01 to Q-05: the SDK behaviours the input and movement design depend on.
- Q-12: the test runner.
- Q-17: which generated tooling to keep.

## 9. Gate decision

The documentation package is internally consistent at baseline 1.0 by the checks above, and is fit to be the implementation contract for M0.

It is **not** evidence that the design works. Implementation should begin with the M0 spike and nothing else, and this audit should be repeated by someone other than its author before M1.
