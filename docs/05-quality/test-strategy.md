# Test strategy

How the chapter is verified. This document defines the test suites and the IDs of unit, model, inspection, playtest and headset tests. Runtime tests are in `interaction-test-matrix.md`, performance tests in `performance-test-plan.md`, comfort tests in `comfort-test-plan.md`. The mapping from requirements is `traceability-matrix.md`.

Unit and model suites are implemented and run by `npm run check`. The first-room navigation path also has a live IWER audit and saved runtime evidence. Physical Quest comfort, performance, and playtest checks remain separate and have not been run.

## 1. Shape of the strategy

The architecture puts the rules in a pure domain so that most of the risk can be retired without a headset. The strategy follows that.

| Level | Runs in | Proves | Cannot prove |
|---|---|---|---|
| Unit (UT) | Node | Each rule does what the specification says | That the rules are fun |
| Model checks (MC) | Node | Properties over every reachable state: no softlock, no teleport, a fair encounter | Anything about hands |
| Inspection (INS) | Scripts and review | Structural rules: dependencies, forbidden APIs, provenance | Behaviour |
| Runtime (RT) | Desktop browser with IWER, driven by the SDK command-line tool | The application wiring: SDK input reaches the domain, the domain reaches the screen | Tracking quality, comfort, device performance |
| Performance (PF) | Quest 3 | Frame time, memory, hitches | |
| Comfort (CF) | Quest 3, people | Reach, vection, intensity | |
| Headset (HQ) | Quest 3, people | Real hands, real tracking loss, legibility, audio | |
| Playtest (PT) | Quest 3, first-time players | Onboarding, comprehension, completion | |

Order of work: UT and MC are written with the domain (M1 to M5). RT begins at M0 with one seam. HQ smoke tests begin at M0 if a headset is available. PF, CF and PT are M6 and M7, with early readings whenever a headset is at hand.

## 2. Unit tests

Run by `npm test`. Each ID is a group of cases.

### Graph

| ID | Verifies |
|---|---|
| UT-GRAPH-01 | The graph built from the initial content has exactly the expected nodes and edges |
| UT-GRAPH-02 | Edge symmetry; a socket is in at most one edge; no edge joins a module to itself |
| UT-GRAPH-03 | `usable` respects player and enemy flags, locks and suspension; `houseClosing` unlocks `dead-letter`-`den` |
| UT-GRAPH-04 | A commit publishes the difference before any consumer reads the new graph, in the order of `domain-model.md` section 6 |
| UT-GRAPH-05 | Replaying a recorded command and tick sequence gives the same state hash every time |
| UT-GRAPH-06 | Property test: after each step of long random legal and illegal command sequences, all invariants hold |

### Connection rules

| ID | Verifies |
|---|---|
| UT-CONN-01 | Position tolerance: accepted at 0.05 m, refused just beyond |
| UT-CONN-02 | Orientation: opposed normals and aligned up within 2 degrees; refused beyond |
| UT-CONN-03 | Profile matrix: only like with like |
| UT-CONN-04 | A socket on a module in motion does not mate; an already mated socket does not mate again; forbidden pairs do not mate |
| UT-CONN-05 | Two modules whose collision volumes would overlap at rest cannot both be brought there |
| UT-CONN-06 | Content validation over all 288 seam configurations: computed connections equal declared ones; no near-misses; no overlaps at rest; every ID resolves |

### Seams

| ID | Verifies |
|---|---|
| UT-SEAM-01 | Drag values are clamped to path limits |
| UT-SEAM-02 | Release inside a snap window commits that detent |
| UT-SEAM-03 | Release outside every snap window returns to the committed detent and changes nothing |
| UT-SEAM-04 | Blocked stretches: the arm is blocked while the lift is at corridor level and free otherwise; clamping stops at the edge |
| UT-SEAM-05 | During a hold the graph is unchanged and dependent edges are suspended; commit happens only when settle ends |
| UT-SEAM-06 | Latched seams: refused without the anchor; frozen when the anchor is released; released after 1.5 s; one-handed latch pin |
| UT-SEAM-07 | A move command for the module containing the player is refused; no station's vantage is inside its seam's module |
| UT-SEAM-08 | Grabs are refused while the Surveyor crosses a dependent edge, and accepted again after |
| UT-SEAM-09 | Ratchet: one detent per completed stroke, both directions, cyclic wrap |
| UT-SEAM-10 | A seam with two stations cannot be held from both; state is shared |
| UT-SEAM-11 | Release with reason `lost` uses the last valid value and never commits outside a snap window; forced release always returns |
| UT-SEAM-12 | Settle never exceeds 16 ticks; commit occurs on the last settle tick |
| UT-SEAM-13 | Preview: inside the preview window, the socket pairs reported are exactly those that open when that detent is committed; none are reported for a blocked or refused detent |

### Puzzles

| ID | Verifies |
|---|---|
| UT-PUZ-01 | Staircase: `stair`-`landing` is open only with hall = 1 and landing = 2 |
| UT-PUZ-02 | Wrong Door: the four configurations give exactly the connections in `first-chapter.md`; a route from landing to corridor exists only at 1 |
| UT-PUZ-03 | Room Zero: `lift`-`zero` opens only with lift = 1 and arm = 1; that state is reachable only by moving the lift away first |
| UT-PUZ-04 | Hint tiers appear at 40, 80 and 120 s of qualifying idle time and not otherwise |
| UT-PUZ-05 | Objectives and checkpoint triggers are evaluated from state alone; the same state gives the same result |
| UT-PUZ-06 | The sequence order of checkpoints is fixed, and the letter rules hold: start in hand, return to strap, deliver only at the slot in Room Zero |

### Surveyor

| ID | Verifies |
|---|---|
| UT-SURV-01 | Every transition in the state table, and no other, can occur |
| UT-SURV-02 | Uniform-cost search returns the cheapest route; ties resolve to the lower edge IDs |
| UT-SURV-03 | It never begins a crossing over an edge that is closed, locked, suspended or not enemy-traversable; it never enters Room Zero |
| UT-SURV-04 | After a graph difference or a player hop, its plan is re-evaluated on the next tick |
| UT-SURV-05 | Target priority: newest reachable fresh joint, then the letter, then none; same-commit ties by edge ID; the measuring room is the side that stayed still, is fixed when the joint is made, and the Surveyor does not oscillate across a joint it has entered to measure |
| UT-SURV-06 | Property test: across random play, its room changes only by completing a crossing after the authored time |
| UT-SURV-07 | It rides a moved module; it braces while the module is in hand, for no more than the limit |
| UT-SURV-08 | When its next edge disappears it stops there, is Blocked for the block time, then replans |
| UT-SURV-09 | Catch occurs exactly at the room's reach time, resets if the player leaves, and never while paused |
| UT-SURV-10 | Searching visits reachable rooms in the fixed order; retreat after the timeout; sealed behaviour |
| UT-SURV-11 | The count equals the route's edge count, capped at five, on planning and on entering a room; no count when there is no route |
| UT-SURV-12 | The reduced-intensity profile changes timings and nothing else |
| UT-SURV-13 | It stays Dormant until armed; joints made before arming are not fresh; it starts only from the Survey Office |

### State, saves, adapters

| ID | Verifies |
|---|---|
| UT-STATE-01 | Every transition in the game-state table is taken on its event; every other pairing is ignored |
| UT-STATE-02 | Pause then resume leaves the state hash unchanged; held grips are returned, not snapped |
| UT-STATE-03 | Being caught restores the last checkpoint's canonical snapshot exactly and increments the catch count |
| UT-STATE-04 | The accumulator runs the right number of ticks for any frame-time pattern, caps at five, and the outcome is independent of frame rate |
| UT-STATE-05 | Restart returns every field to its initial value and keeps settings; illegal commands return a reason and change nothing |
| UT-SAVE-01 | Encode then decode returns the same data |
| UT-SAVE-02 | Old-version fixtures migrate to the current version |
| UT-SAVE-03 | Malformed and tampered records are rejected with the right reason |
| UT-SAVE-04 | Each rung of the recovery ladder is taken in the right circumstance; nothing throws |
| UT-SAVE-05 | A full record is under 8 KB |
| UT-SAVE-06 | A record contains only the whitelisted fields; writes go to the other slot and switch the pointer |
| UT-ADPT-01 | Rail projection: line and arc, from recorded hand samples, gives the expected parameter |
| UT-ADPT-02 | Loss grace: 0.25 s; continue if recovered; release with the last valid value otherwise; leave-rail at 0.15 m |
| UT-ADPT-03 | Either hand can take either role; a hop request is suppressed when a hand is within 0.20 m of a grip |
| UT-ADPT-04 | Audio route attenuation: level steps down per edge and is never silent |

## 3. Model checks

Run by `npm run test:content`. They explore the domain exhaustively using the real rules and the real content.

| ID | Verifies | Method |
|---|---|---|
| MC-01 | No softlock: from every reachable state, chapter complete is reachable | Breadth-first exploration of the abstract state (seam detents, player vantage, Surveyor room and state class, flags), with player commands, Surveyor ticks and failure recovery as transitions; backward reachability from the goal. Also emits the table of safe configurations used by save validation |
| MC-02 | The reference solution completes the chapter, hitting each checkpoint in order | Replay of the command list in `first-chapter.md` section 10 |
| MC-03 | The encounter is fair: from `cp-corridor` a strategy exists that reaches `cp-east` uncaught; and at no point on it is the response window shorter than 5 s | Search over player strategies against the deterministic Surveyor |
| MC-04 | In every explored trace the Surveyor's room changes only along open edges, and it is never in the player's room without having crossed into it | Trace property over MC-01's exploration |
| MC-05 | The reference solution's duration, using authored times and assumed interaction times, is between 5 and 7 minutes | Sum over the replay, with the assumptions stated in the test |

The abstract state space is small: 288 seam configurations, 11 vantages, about 20 Surveyor positions and a few state classes and flags. Exploration is expected to take well under a minute.

## 4. Inspections

Run by `npm run test:rules` where automated; otherwise a signed checklist.

| ID | Checks | How |
|---|---|---|
| INS-01 | Domain/content stay in the pure rule layer; persistence depends only on domain/content; IWSDK imports stay in runtime integration paths | TypeScript import-graph script |
| INS-02 | No `requestAnimationFrame`, `setAnimationLoop`, `setInterval`, or `setTimeout` driving simulation in `src/` | TypeScript AST rule check |
| INS-03 | No direct import of `three` | TypeScript AST import scan |
| INS-04 | Every shipped asset has a completed register row | Review at M6 and M7 |
| INS-05 | Originality checklist signed for each character, environment and key image; colour-vision simulation of each station | Review |
| INS-06 | No network requests after load; no third-party origins; no storage keys other than ours | Browser network and storage panels on the production build |
| INS-07 | Runtime dependency list and licences recorded; no high-severity advisories with development dependencies omitted | `npm audit`, lockfile review |
| INS-08 | Version ledger matches the lockfile; SDK features enabled match the specification; systems are registered at the specified priorities; every performance result carries its device, browser, build and environment labels | Review |
| INS-09 | Code review checklist: no allocation in `update`; every subscription in `cleanupFuncs`; no entity arrays in systems; no rule decided in presentation; nothing writes the player rig or camera except the hop and snap-turn code; no randomness or wall-clock time in the domain | Review per change |
| INS-10 | The only interfaces in play are the envelope and the two cards; one shared grip design; every information-carrying sound has its visual twin | Review of the build against `interaction-feedback.md` and `accessibility.md` |

## 5. Runtime tests under IWER

Defined in `interaction-test-matrix.md` (RT-01 to RT-24). The targeted gate is `tests/runtime/navigation-state.mjs` plus `tests/runtime/m5-gate.mjs`, launched by `npm run test:runtime`. The complete executable IWER matrix is `tools/rt/run-rt.mjs`; the preserved 2026-11-17 capture has 22 passing rows and two unrecorded rows (RT-01 and RT-15). The M5 gate checks real IWER hand-source availability, feeds fingertip positions through the pointer system for comfort controls, and replays the canonical full-chapter solution through the live `GameSession`. The IWER matrix drives hand devices but is automation, not a human run; physical tracking, comfort and device performance still require a Quest.

## 6. Playtests

Six to eight first-time players per round, on a headset, seated, unassisted, observed and timed. One round at M5 on graybox, one at M7 on the final build.

| ID | Measures | Pass |
|---|---|---|
| PT-01 | Time from entering VR to committing the first seam | Median 90 s or less; 80% without help |
| PT-02 | Wrong Door: time to solve; whether the player can say afterwards why the first door was wrong | Median under 120 s; most can explain |
| PT-03 | Surveyor: after playing, can the player state either rule in their own words | 70% or more |
| PT-04 | Completion without help; total time; time on a second run | 80% complete; first-run median 12 minutes or less; informed run 5 to 7 minutes |
| PT-05 | Affordances: does anyone try to grab something that is not brass, or fail to notice a lamp | Recorded and fixed; no blocker |

## 7. Regression

Every defect found in the rules is fixed with a test that replays the command sequence that showed it, using the reproduction data described in `04-engineering/runtime-lifecycle.md` section 9.

## 8. Physical Quest validation plan

A separate release requirement. Nothing can be labelled Quest-tested, and no performance or comfort claim made, until this plan has run on hardware.

**Devices.** Quest 3 required. Quest 3S if available. Quest 2 best effort. Record headset model, system version and browser version with every result.

**Conditions.** Seated, normal indoor lighting, no controllers paired or within reach for hands-only runs.

| ID | Test | Pass |
|---|---|---|
| HQ-01 | Open the production URL in the Quest Browser, enter VR | Session starts; hands appear |
| HQ-02 | Grip reliability: 40 holds of 10 s moving 0.4 m along a rail, both hands, three people | At least 95% not dropped |
| HQ-03 | Two-hand seams with real hands, including the bracing hand partly occluded by the other | Each two-hand seam completed 10 times; no unintended commit |
| HQ-04 | Reach: every station by three people of different arm lengths, seated | All grips reached without leaning more than 20 cm |
| HQ-05 | Real tracking loss: drop the holding hand out of view mid-move; cover a hand; clasp hands | Room returns or snaps per the rule; never commits wrongly |
| HQ-06 | Full chapter, hands only, no controller input recorded; repeat with sound off to check visual twins | Completed; zero controller events |
| HQ-07 | Remove the headset mid-encounter for 30 s, put it back | Paused and resumed; Surveyor did not move |
| HQ-08 | Audio: locate the Surveyor by ear with eyes closed at three positions; identify its state by sound | Direction correct within about 45 degrees; states told apart |
| HQ-09 | Legibility: envelope text, door profiles at distance, grips in darkness, at each foveation level | Read without effort at the chosen setting |
| HQ-10 | Smoke test on Quest 3S and Quest 2 | Runs; notes on performance |

If no headset is available, the project stops at IWER-verified and says so (risk R-14).

## 9. Reporting

Each test run records: build identifier, content version, date, environment (Node, IWER on which browser, or headset model and versions), and the result. Emulator and headset results are kept in separate columns and never merged.
