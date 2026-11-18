# Product Requirements Document

Product: ROOM ZERO: THE UNRETURNED LETTER (working title). Baseline 1.0. Requirement IDs cited here are defined in `04-engineering/software-requirements.md`.

## 1. Summary

A single-chapter, hands-only, seated VR puzzle-adventure that runs in the Meta Quest Browser from a URL. The player rearranges sections of an oversized boarding house to open a route to Room Zero and to block or misdirect the Surveyor, an enemy that navigates the same connections.

## 2. Target audience

**Primary: Quest owners who like short, authored puzzle-adventures.** They have finished games such as The Room VR or A Fisherman's Tale, play seated, are comfortable with hand tracking or willing to try it, and value atmosphere over challenge. They will give a browser experience about one minute to prove itself.

**Secondary: competition judges and XR developers.** They assess originality, technical credibility and polish in a single short session, often back to back with other entries. For them the chapter must be completable on the first try without help, and the central idea must be evident within ninety seconds.

**Not targeted:** players seeking action, long campaigns, jump-scare horror or multiplayer; children under the platform's age guidance; players who cannot use either hand (see `02-experience-design/accessibility.md` for what is and is not supported).

## 3. Problem and motivation

Most VR puzzle games let the player manipulate objects inside a room. Most VR horror games give the enemy a navigation mesh the player cannot influence, so the only verbs are hide and run. Hand tracking is often used for buttons and little else.

Players want to do something large with their hands, to out-think a threat rather than outrun it, and to do both without nausea. ROOM ZERO answers with one verb: move the architecture. That verb opens the route, solves the puzzle and controls the enemy.

## 4. Product promise

- You can finish it in one sitting of about five to seven minutes once you know it, and in about twelve on a first visit.
- You need only your hands and a chair.
- You will never be moved against your will.
- The enemy plays by rules you can learn in one encounter.
- The ending recontextualises what you did.

## 5. Core user stories

| ID | As a | I want | So that | Requirements |
|---|---|---|---|---|
| US-01 | first-time player | to enter VR and know what to touch without reading instructions | I start playing within a minute | REQ-UX-001, REQ-UX-002, REQ-INPUT-001 |
| US-02 | player | to grab a brass grip and feel a whole room move | I believe I am changing the house | REQ-SEAM-002, REQ-SEAM-012, REQ-UX-003 |
| US-03 | player | the room to click into place when the doorways line up, and to refuse when they do not | I trust the house's rules | REQ-SEAM-003, REQ-SEAM-005, REQ-GRAPH-002 |
| US-04 | player | to move between places by pointing and pinching at a lamp | I can explore while seated without discomfort | REQ-COMFORT-001, REQ-COMFORT-002, REQ-INPUT-003 |
| US-05 | player | to see and hear where the Surveyor is going | I can plan instead of panic | REQ-ENEMY-007, REQ-AUDIO-002 |
| US-06 | player | to cut the Surveyor's route or send it elsewhere by changing the house | I win by thinking | REQ-ENEMY-002, REQ-ENEMY-003, REQ-ENEMY-004 |
| US-07 | player | to be put back a short way if I am caught | failure costs seconds, not the session | REQ-STATE-003, REQ-SAVE-002 |
| US-08 | player | to take the headset off and resume later | interruptions do not lose progress | REQ-STATE-002, REQ-SAVE-001 |
| US-09 | player who gets motion sick | no gliding, no camera shake and no moving floor | I can finish | REQ-COMFORT-002, REQ-COMFORT-004, REQ-SEAM-008 |
| US-10 | player with one usable hand | to complete every puzzle | I am not locked out | REQ-A11Y-001 |
| US-11 | player | to deliver the letter and get an ending | the experience feels complete | REQ-GAME-004, REQ-GAME-007 |
| US-12 | player or judge | to restart cleanly | I can show it to someone else | REQ-GAME-006 |

## 6. Functional requirements (product level)

The SRS holds the detailed, testable form. At product level the chapter must provide:

1. Immersive VR entry from a web page on a Quest headset (REQ-PLAT-001, REQ-PLAT-002).
2. Hands-only play for every required step (REQ-INPUT-001).
3. Six seams across eleven modules, each a constrained one-degree-of-freedom manipulation with snapping, preview, rejection and recovery (REQ-SEAM-001 to REQ-SEAM-012).
4. A deterministic house graph that alone decides connectivity (REQ-GRAPH-001 to REQ-GRAPH-008).
5. Four puzzles in five sequences (REQ-GAME-002, REQ-PUZZLE-001 to REQ-PUZZLE-004).
6. One enemy that paths on the graph and telegraphs its intent (REQ-ENEMY-001 to REQ-ENEMY-012).
7. Vantage-to-vantage movement with a fade (REQ-COMFORT-002).
8. A diegetic envelope that carries objective, hints, checkpoints and settings (REQ-UX-005, REQ-PUZZLE-006).
9. Checkpoints, failure recovery, pause and restart (REQ-STATE-001 to REQ-STATE-003, REQ-GAME-006).
10. A local, versioned save (REQ-SAVE-001 to REQ-SAVE-007).
11. A narrative ending triggered by delivering the letter (REQ-GAME-007).

## 7. Non-functional requirements (product level)

| Area | Commitment | Requirements |
|---|---|---|
| Performance | 72 fps target on Quest 3; sustained performance below 60 fps blocks release | REQ-PERF-001, REQ-PERF-002 |
| Comfort | Seated, no artificial locomotion other than faded hops, no camera shake | REQ-COMFORT-001 to REQ-COMFORT-008 |
| Accessibility | One-handed mode, reduced intensity, visual twin for every critical sound | REQ-A11Y-001 to REQ-A11Y-006 |
| Reliability | Survives session exit and re-entry, headset removal, reload, corrupt save | REQ-REL-001 to REQ-REL-005 |
| Privacy | No account, no network after load, no telemetry, nothing personal stored | REQ-SEC-001 to REQ-SEC-004 |
| Originality | Every shipped asset original or licensed, with provenance | REQ-ART-001, REQ-ART-002 |

## 8. Differentiation

The short form: architecture is the single verb, and the enemy's world model is the same graph the player edits. The longer form, including what is not new, is in `differentiators.md`. We do not claim the mechanic is unprecedented.

## 9. Scope exclusions

| Excluded | Reason |
|---|---|
| Smooth locomotion, free teleport | Comfort, and the player must always be at a known graph node |
| Free-form physics on room modules | Untestable, uncomfortable, and unnecessary for the fantasy |
| Full-body avatar | Cost without benefit in first person; hands are enough |
| Combat, inventory, collectibles | Dilute the single mechanic |
| More than one enemy | The rules must be learnable in one encounter |
| Voice acting, text dialogue | The story is told by the environment and the letter |
| Multiplayer, accounts, cloud save, leaderboards, analytics | Not needed; privacy and scope |
| Mixed reality or passthrough | The fantasy needs a fully virtual, oversized world |
| Store packaging (PWA or APK) | Possible later; the slice ships as a URL |
| Chapters beyond the first | One excellent chapter is the product |
| Localisation | The slice has fewer than forty words of in-world text, all English |

## 10. Success metrics

All are measured on physical Quest hardware with players who have not seen the game. Until then they are targets, not results.

| Metric | Target | Measured by |
|---|---|---|
| Unassisted completion | at least 80% of first-time players | PT-04 |
| First successful seam | median within 90 s of entering VR | PT-01 |
| First-time duration | median 12 minutes or less | PT-04 |
| Known-solution duration | 5 to 7 minutes | MC-05, PT-04 |
| Surveyor rule recall | at least 70% can state "it goes to the newest joint" or "it can only use open doors" afterwards | PT-03 |
| Comfort | no tester stops for discomfort; median discomfort 1 or less on a 0 to 10 scale | CF-06 |
| Frame rate | 95% of frames within 13.7 ms on Quest 3 | PF-01 |
| Controller use | zero controller inputs in the completion run | HQ-06 |

## 11. Assumptions and dependencies

- Quest Browser continues to support WebXR `immersive-vr` with hand tracking. IWSDK 1.x remains available under its current licence.
- A Quest 3 or 3S is available for validation before any release claim. Without one, the project can reach "IWER-verified" and no further (risk R-14).
- Art and audio are produced in-house or from licensed sources recorded in the asset register. The achievable fidelity is "stylised cinematic realism with baked lighting", not photorealism.
