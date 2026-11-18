# Requirements traceability matrix

Every requirement in the SRS, with the tests that verify it. Test IDs are defined in `test-strategy.md` (UT, MC, INS, PT, HQ), `interaction-test-matrix.md` (RT), `performance-test-plan.md` (PF) and `comfort-test-plan.md` (CF).

**Columns.** *Automated* tests run without a headset: unit, model, runtime under IWER, and scripted inspections. *Manual or headset* tests need a person, a headset or both. A requirement whose only verification is in the second column cannot be closed without hardware or reviewers; those are marked with an asterisk.

**Status of every row: not run.**

## Game

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-GAME-001 | RT-15 | HQ-06 |
| REQ-GAME-002 | UT-PUZ-06, MC-02 | |
| REQ-GAME-003 | MC-05 | PT-04 |
| REQ-GAME-004 | UT-PUZ-06, RT-21 | |
| REQ-GAME-005 | MC-01 | |
| REQ-GAME-006 | UT-STATE-05, RT-13 | |
| REQ-GAME-007 | RT-15, RT-21 | HQ-06 |

## Seam manipulation

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-SEAM-001 | UT-SEAM-01, UT-CONN-06 | INS-09 |
| REQ-SEAM-002 | UT-ADPT-01, RT-06 | HQ-02 |
| REQ-SEAM-003 | UT-SEAM-02, UT-SEAM-03, RT-07, RT-08 | |
| REQ-SEAM-004 | UT-SEAM-04, UT-CONN-05, RT-09 | |
| REQ-SEAM-005 | UT-SEAM-13, RT-07 | |
| REQ-SEAM-006 | UT-SEAM-05 | |
| REQ-SEAM-007 | UT-SEAM-06, RT-05 | HQ-03 |
| REQ-SEAM-008 | UT-SEAM-07, UT-CONN-06 | |
| REQ-SEAM-009 | UT-SEAM-08, RT-14 | |
| REQ-SEAM-010 | UT-SEAM-09 | |
| REQ-SEAM-011 | UT-SEAM-10 | |
| REQ-SEAM-012 | UT-SEAM-12, RT-07 | |

## House graph

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-GRAPH-001 | UT-GRAPH-01, INS-01 | |
| REQ-GRAPH-002 | UT-CONN-01, UT-CONN-02, UT-CONN-03, UT-CONN-04 | |
| REQ-GRAPH-003 | UT-GRAPH-03 | |
| REQ-GRAPH-004 | UT-GRAPH-04 | |
| REQ-GRAPH-005 | INS-01, RT-22 | INS-09 |
| REQ-GRAPH-006 | UT-GRAPH-02, UT-GRAPH-06 | |
| REQ-GRAPH-007 | UT-CONN-06 | |
| REQ-GRAPH-008 | UT-GRAPH-05 | |

## Enemy

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-ENEMY-001 | UT-SURV-01, UT-SURV-10 | |
| REQ-ENEMY-002 | UT-SURV-03, MC-04 | |
| REQ-ENEMY-003 | UT-SURV-04 | |
| REQ-ENEMY-004 | UT-SURV-05 | |
| REQ-ENEMY-005 | UT-SURV-06, UT-SURV-07, MC-04 | |
| REQ-ENEMY-006 | UT-SURV-13 | |
| REQ-ENEMY-007 | UT-SURV-11, RT-14 | PT-03 |
| REQ-ENEMY-008 | UT-SURV-08, RT-14 | |
| REQ-ENEMY-009 | UT-SURV-09 | |
| REQ-ENEMY-010 | INS-01, UT-GRAPH-05 | INS-09 |
| REQ-ENEMY-011 | UT-SURV-12 | |
| REQ-ENEMY-012 | UT-SURV-02 | |

## Puzzles

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-PUZZLE-001 | UT-PUZ-01 | |
| REQ-PUZZLE-002 | UT-PUZ-02 | PT-02 |
| REQ-PUZZLE-003 | MC-03 | |
| REQ-PUZZLE-004 | UT-PUZ-03, UT-SEAM-04, RT-09 | |
| REQ-PUZZLE-005 | UT-PUZ-05, INS-01 | |
| REQ-PUZZLE-006 | UT-PUZ-04 | |

## Input

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-INPUT-001 | RT-15 | HQ-06 |
| REQ-INPUT-002 | RT-04 | HQ-02 |
| REQ-INPUT-003 | RT-10 | HQ-06 |
| REQ-INPUT-004 | RT-16 | HQ-06 |
| REQ-INPUT-005 | RT-17 | |
| REQ-INPUT-006 | UT-SEAM-11, UT-ADPT-02, RT-11 | HQ-05 |
| REQ-INPUT-007 | INS-01 | |
| REQ-INPUT-008 * | | INS-10 |
| REQ-INPUT-009 | UT-ADPT-03, RT-04, RT-05 | |
| REQ-INPUT-010 | RT-03 | |

## Comfort

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-COMFORT-001 | RT-22 | HQ-04, CF-01 |
| REQ-COMFORT-002 | RT-10 | INS-09, CF-02 |
| REQ-COMFORT-003 | RT-10 | CF-02 |
| REQ-COMFORT-004 * | | INS-09, CF-06 |
| REQ-COMFORT-005 | RT-16 | CF-05 |
| REQ-COMFORT-006 | RT-06 | CF-03 |
| REQ-COMFORT-007 | RT-14 | CF-04 |
| REQ-COMFORT-008 | RT-12 | HQ-07, CF-06 |

## Experience

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-UX-001 * | | PT-01 |
| REQ-UX-002 * | | INS-10, PT-05 |
| REQ-UX-003 | RT-07, RT-08 | INS-10 |
| REQ-UX-004 | RT-22 | |
| REQ-UX-005 * | | INS-10 |

## Game state

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-STATE-001 | UT-STATE-01 | |
| REQ-STATE-002 | UT-STATE-02, RT-12 | HQ-07 |
| REQ-STATE-003 | UT-STATE-03 | |
| REQ-STATE-004 | UT-STATE-04 | |
| REQ-STATE-005 | UT-GRAPH-04 | INS-08 |

## Data and persistence

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-SAVE-001 | UT-SAVE-01, UT-SAVE-02 | |
| REQ-SAVE-002 | UT-SAVE-06 | |
| REQ-SAVE-003 | UT-SAVE-06 | INS-06 |
| REQ-SAVE-004 | UT-SAVE-03 | |
| REQ-SAVE-005 | UT-SAVE-04, RT-19 | |
| REQ-SAVE-006 | UT-SAVE-06, RT-18 | |
| REQ-SAVE-007 | UT-SAVE-05 | |

## Platform

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-PLAT-001 * | | HQ-01, HQ-10 |
| REQ-PLAT-002 | RT-01 | HQ-01 |
| REQ-PLAT-003 * | | INS-08 |
| REQ-PLAT-004 | RT-23 | |
| REQ-PLAT-005 | RT-01, RT-15 | |
| REQ-PLAT-006 | INS-02 | |
| REQ-PLAT-007 | INS-03 | |
| REQ-PLAT-008 * | | INS-08 |

## Performance

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-PERF-001 * | | PF-01 |
| REQ-PERF-002 * | | PF-01 |
| REQ-PERF-003 | PF-02 (emulator half) | PF-02 (headset spot check) |
| REQ-PERF-004 | PF-02 (emulator half) | PF-02 (headset spot check) |
| REQ-PERF-005 | PF-08 (sizes) | PF-03 |
| REQ-PERF-006 * | | PF-04 |
| REQ-PERF-007 * | | PF-05, INS-09 |
| REQ-PERF-008 * | | PF-06 |
| REQ-PERF-009 | PF-07 (emulator half) | PF-07 (headset check) |
| REQ-PERF-010 * | | PF-08 |
| REQ-PERF-011 * | | INS-08 |

## Reliability

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-REL-001 | RT-02 | HQ-07 |
| REQ-REL-002 | PF-09 (emulator half) | PF-09, INS-09 |
| REQ-REL-003 | RT-24 | |
| REQ-REL-004 | RT-24 | |
| REQ-REL-005 | RT-12 | HQ-07 |

## Accessibility

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-A11Y-001 | UT-SEAM-06, RT-16 | CF-07 |
| REQ-A11Y-002 | UT-ADPT-03, RT-16 | |
| REQ-A11Y-003 | UT-SURV-12, RT-16 | CF-04 |
| REQ-A11Y-004 * | | INS-10, HQ-06 |
| REQ-A11Y-005 * | | INS-05 |
| REQ-A11Y-006 * | | INS-10, HQ-09 |

## Audio

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-AUDIO-001 | RT-20 | HQ-08 |
| REQ-AUDIO-002 | RT-20 | |
| REQ-AUDIO-003 | UT-ADPT-04 | HQ-08 |
| REQ-AUDIO-004 | RT-20, RT-12 | HQ-01 |
| REQ-AUDIO-005 * | | INS-10, HQ-08 |

## Security and privacy

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-SEC-001 | RT-23 | INS-06 |
| REQ-SEC-002 | UT-SAVE-06 | INS-06 |
| REQ-SEC-003 | UT-SAVE-03 | |
| REQ-SEC-004 * | | INS-07 |

## Error handling

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-ERR-001 | RT-23 | |
| REQ-ERR-002 | RT-23 | |
| REQ-ERR-003 | UT-STATE-05 | |
| REQ-ERR-004 | RT-19 | |

## Originality

| Requirement | Automated | Manual or headset |
|---|---|---|
| REQ-ART-001 * | | INS-04 |
| REQ-ART-002 * | | INS-05 |

## Coverage summary

| | Count |
|---|---|
| Requirements | 125 |
| With at least one automated test | 103 |
| Verified only by inspection, headset or playtest (marked *) | 22 |
| With no verification | 0 |

The 22 marked requirements are those whose truth is a property of the headset, of people, or of the project's records: frame time, comfort, onboarding, originality, provenance, and the like. Seven of them are performance requirements that depend on access to a Quest 3 (risk R-14).

## Reverse check

Tests that verify no numbered requirement directly but exist to retire a risk or test an assumption:

| Test | Purpose |
|---|---|
| HQ-03 beyond REQ-SEAM-007 | Risk R-01 |
| HQ-09 beyond REQ-A11Y-006 | Risk R-18 |
| PT-03 beyond REQ-ENEMY-007 | Risk R-06 |
| The M0 spike tests | Assumptions A1 to A11 in `04-engineering/iwsdk-verification.md` |

The counts and the absence of dangling IDs in this matrix were checked mechanically when the documentation was assembled; the result is in `07-delivery/documentation-gate-audit.md`.
