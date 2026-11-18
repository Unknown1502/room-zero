# Milestones

A one-page view of `implementation-roadmap.md`. Tracking updated 2026-11-18: M0–M4 have implementation in the workspace but are not individually closed in this record; M5 has a manual tracked-hand IWER completion and targeted IWER gate evidence, while its repeatability and physical acceptance evidence remains open; M6–M7 are not started.

| | Milestone | Runs at the end | Tests that must pass | Evidence level | Complexity | Main risks retired |
|---|---|---|---|---|---|---|
| M0 | Technical feasibility | One room, one seam, two sockets, one hand grab, in VR | RT-01, RT-03, RT-04, RT-06, RT-07, RT-08; assumptions A1 to A11 answered | IWER-verified, one seam | M | R-01 (first reading), R-07 (first reading), R-16, R-17, R-21 |
| M1 | Core spatial mechanic | Every kind of seam: linear, lever, ratchet, latched | UT-SEAM (most), UT-CONN-01 to 04, UT-ADPT-01 to 03, RT-05, RT-11 | IWER-verified, mechanic | M to L | R-02, R-07, R-08 (first reading) |
| M2 | House graph | Whole house in graybox; hop anywhere the graph allows | UT-GRAPH, UT-CONN-05, UT-CONN-06, UT-SEAM-04, 07, 10; INS-01 to 03; RT-09, RT-10, RT-22 | IWER-verified, traversal | L | R-03, R-04 |
| M3 | First puzzle | Title to the landing, with save and pause | UT-PUZ-01, 04 to 06; UT-STATE-01, 02, 04, 05; UT-SAVE; RT-02, 12, 13, 16, 18, 19 | IWER-verified, sequences 1 and 2 | M to L | R-09 (first reading), R-11, R-12, R-18 |
| M4 | Surveyor | The encounter in graybox | UT-SURV; UT-SEAM-08; UT-STATE-03; UT-ADPT-04; MC-01 to 05; RT-14, RT-20 | IWER-verified, encounter | L | R-05, R-06, R-13 (first reading) |
| M5 | Complete vertical slice | Whole chapter in graybox, hands only, restartable | All UT/MC pass; one manual hand-driven IWER completion; targeted IWER chapter, comfort-control and recovery gate passes twice; 22 of 24 runtime rows pass (RT-01 and RT-15 remain); headset/participant rounds remain | Core chapter IWER smoke, 22/24 recorded runtime rows and one manual completion; not headset verified; M5 acceptance open | L | R-08, R-09, R-19; scope decision for R-15 |
| M6 | Cinematic and polish | The chapter with final art and sound | INS-04, 05, 10; PF-02, PF-03; HQ-08, HQ-09 | As M5, with final content | XL | R-10, R-13, R-15, R-18 |
| M7 | QA and release | A hosted release build | Everything, on the release build; release checklist | Accepted, or the level reached | M | R-14, R-20 |

## Gates

| Gate | Question | If no |
|---|---|---|
| After M0 | Can a hand hold a grip and move a room, reliably, in the SDK as installed? | Change the input plan before M1 |
| After M1, on a headset | Is moving a very large room comfortable to watch? | Lower speed caps and redesign the view before building eleven rooms |
| After M4 | Is the encounter fair in the model and understandable in play? | Retune or simplify the Surveyor's rules before integration |
| After M5 | Do first-time players finish, comfortably, at frame rate, in graybox? | Fix design before spending on art; cut scope |
| After M7 | Is there evidence for each acceptance criterion at the level claimed? | Report the lower level |

## Tracking

Each milestone closes with a short record: what ran, which tests passed with which evidence label, which risks were closed, which questions were answered, and what changed in these documents as a result.
