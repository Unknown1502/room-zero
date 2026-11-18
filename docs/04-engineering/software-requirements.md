# Software Requirements Specification

Baseline 1.0. This is the only place requirement IDs are defined. Each requirement is one testable statement. The mapping to tests is in `05-quality/traceability-matrix.md`.

**Priority:** M = must for the vertical slice; S = should; C = could.
**Method:** T = automated test; A = analysis or model checking; I = inspection or review; D = demonstration on a physical headset; P = playtest with people.

Numeric values are starting values. Changing one is a change to this document.

## 1. Scope and context

The system is a client-only web application that presents one chapter of an immersive VR game on Meta Quest headsets through the Quest Browser. It consists of a gameplay domain written in plain TypeScript, application systems running on the IWSDK entity component system, a presentation layer on Three.js through IWSDK, and local persistence. There is no server component beyond static file hosting.

Definitions are in `docs/README.md`. Chapter data is in `01-game-design/first-chapter.md`.

## 2. Game requirements

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-GAME-001 | The chapter shall be completable from start to ending using tracked hands only. | M | T, D |
| REQ-GAME-002 | The chapter shall present five sequences in fixed order: The Arrival, The Missing Staircase, The Wrong Door, First Surveyor Encounter, Room Zero. | M | T |
| REQ-GAME-003 | Executing the reference solution at the authored timings and the reference pacing in `first-chapter.md` section 10 shall take between 5 and 7 minutes. | M | A, P |
| REQ-GAME-004 | The letter shall be in the player's hand at chapter start, return to the satchel strap when released, and complete the chapter when released into pigeonhole 0. | M | T |
| REQ-GAME-005 | From every state reachable by legal commands, the chapter-complete state shall be reachable. | M | A |
| REQ-GAME-006 | The player shall be able to restart the chapter from the ending and from the envelope during play, returning all state to its initial values. | M | T |
| REQ-GAME-007 | Delivering the letter shall play the ending and then enter ChapterComplete without taking control of the player's head or hands. | M | T, D |

## 3. Seam manipulation

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-SEAM-001 | Each seam shall move exactly one module along one authored path with one degree of freedom and two or more authored detents. No other module transform shall be possible. | M | T, I |
| REQ-SEAM-002 | While a travel grip is held, the seam's drawn position shall follow the holding hand's position projected onto the grip's rail, clamped to the path's limits. | M | T, D |
| REQ-SEAM-003 | On release within the snap window of a detent the seam shall commit to that detent; on release elsewhere it shall return to its last committed detent. | M | T |
| REQ-SEAM-004 | The domain shall compute, from authored collision volumes and other modules' committed positions, the stretches of a seam's path that are blocked, and shall clamp the seam at their edges. | M | T |
| REQ-SEAM-005 | While a seam is held within the preview window of a detent, the system shall indicate every socket pair that would connect at that detent. | M | T |
| REQ-SEAM-006 | The house graph shall change only on commit. While a seam is held away from its committed detent, edges that depend on it shall be suspended for new crossings and otherwise unchanged. | M | T |
| REQ-SEAM-007 | A latched seam shall move only while its anchor grip is held; releasing the anchor shall freeze the seam and, after 1.5 s, count as a release. | M | T |
| REQ-SEAM-008 | A seam shall not be operable from a vantage inside the module it moves, and a move command for the module containing the player shall be rejected. | M | T, A |
| REQ-SEAM-009 | A seam shall reject grabs while the Surveyor is crossing an edge that depends on it, and shall show that it is held. | M | T |
| REQ-SEAM-010 | A ratchet seam shall advance exactly one detent, in the direction of the stroke, for each completed stroke. | M | T |
| REQ-SEAM-011 | A seam with several stations shall be one seam in the domain and shall be holdable from only one station at a time. | M | T |
| REQ-SEAM-012 | After release, the drawn module shall reach its resting position within 0.8 s, and commit shall occur when it does. | M | T |

## 4. House graph

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-GRAPH-001 | The domain shall hold a graph whose nodes are modules and whose edges are mated socket pairs, and this graph shall be the only source of connectivity for traversal, puzzles and enemy navigation. | M | T, I |
| REQ-GRAPH-002 | Two sockets shall form an edge only if all hold: positions within 0.05 m; normals opposed and up vectors aligned within 2 degrees; profiles equal; neither module in motion and neither socket already mated; no chapter rule forbids the pair. | M | T |
| REQ-GRAPH-003 | Each edge shall carry: open, player-traversable, enemy-traversable, locked, suspended and puzzle-active. | M | T |
| REQ-GRAPH-004 | On commit the graph shall be recomputed and a difference of opened and closed edges published before any consumer reads the new graph. | M | T |
| REQ-GRAPH-005 | No domain or application code shall derive connectivity from Three.js object transforms. | M | I, T |
| REQ-GRAPH-006 | The invariants in `house-graph-rules.md` section 9 shall hold after every command. | M | T |
| REQ-GRAPH-007 | A content validation shall compute all socket poses for every detent combination and fail on any connection not declared by the author, any declared connection not computed, any near-miss, and any overlap of collision volumes at rest. | M | T |
| REQ-GRAPH-008 | Given the same initial state and the same sequence of commands and ticks, the domain shall produce the same state, compared by hash. | M | T |

## 5. Enemy

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-ENEMY-001 | The Surveyor shall be a deterministic state machine with the states Dormant, Listening, Replanning, Investigating, Approaching, Hunting, Blocked, Searching and Retreating, and only the transitions in `enemy-surveyor.md` section 5. | M | T |
| REQ-ENEMY-002 | The Surveyor shall begin a crossing only over an edge that is open, unlocked, not suspended and enemy-traversable. | M | T |
| REQ-ENEMY-003 | After any graph difference or change of the player's room, the Surveyor's target and route shall be re-evaluated within one domain tick. | M | T |
| REQ-ENEMY-004 | The Surveyor's target shall be the newest reachable fresh joint; failing that, the player's room if a route exists; failing that, none. | M | T |
| REQ-ENEMY-005 | The Surveyor's position shall always be a module or an open edge, and shall change module only by completing a crossing after spending the authored crossing time. | M | T, A |
| REQ-ENEMY-006 | The Surveyor shall start in the Survey Office and shall not leave Dormant before the player first reaches `v-cwest-end`. | M | T |
| REQ-ENEMY-007 | On forming a plan the Surveyor shall emit a count equal to the number of edges on its route, capped at five, and shall emit the remaining count on entering each room. | M | T |
| REQ-ENEMY-008 | When the next edge on its route ceases to be usable, the Surveyor shall stop at that edge, remain Blocked for the block time, then replan. | M | T |
| REQ-ENEMY-009 | The player shall be caught when, and only when, the Surveyor has been in the player's module for that module's reach time while the game is not paused. | M | T |
| REQ-ENEMY-010 | The Surveyor's behaviour shall be a pure function of domain state and elapsed ticks, using no randomness, network service or learned model. | M | I, T |
| REQ-ENEMY-011 | All Surveyor timings shall be data, with a second profile for reduced intensity. | M | T |
| REQ-ENEMY-012 | Routes shall be found by uniform-cost search with ties broken by lowest edge ID. | M | T |

## 6. Puzzles

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-PUZZLE-001 | The edge `stair`-`landing` shall be open only when `seam-hall` = 1 and `seam-landing` = 2. | M | T |
| REQ-PUZZLE-002 | A player route from `landing` to `c-west` shall exist only when `seam-rotunda` = 1. | M | T |
| REQ-PUZZLE-003 | From the state at `cp-corridor` there shall exist a sequence of player commands that reaches `cp-east` without the player being caught. | M | A |
| REQ-PUZZLE-004 | `seam-arm` shall be blocked from reaching detent 1 while `seam-lift` = 1, and the edge `lift`-`zero` shall be open only when `seam-lift` = 1 and `seam-arm` = 1. | M | T |
| REQ-PUZZLE-005 | Puzzle objectives shall be evaluated only from graph state, seam detents, flags and progress. | M | I, T |
| REQ-PUZZLE-006 | After 40, 80 and 120 s of idle time at an unsolved station with the Surveyor more than one edge away, the envelope shall show hint tiers 1, 2 and 3. | S | T |

## 7. Input

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-INPUT-001 | Every interaction needed to complete the chapter shall be performable with tracked hands and no controller. | M | T, D |
| REQ-INPUT-002 | A grip shall be taken by closing a pinch within 0.08 m of it and held until the pinch opens. | M | T, D |
| REQ-INPUT-003 | A hop shall be requested by pointing a hand ray at a lit signal lamp and pinching. | M | T, D |
| REQ-INPUT-004 | Envelope seals, the latch pin and turn-markers shall be operated by a fingertip press. | M | T, D |
| REQ-INPUT-005 | Paired controllers shall be usable for every interaction as an optional alternative. | S | T |
| REQ-INPUT-006 | On loss of tracking of a holding hand, after a 0.25 s grace the hold shall end as a release at the last valid value, and shall never commit a detent outside whose snap window that value lay. | M | T, D |
| REQ-INPUT-007 | Input adapters shall translate device input into domain commands. Domain modules shall import nothing from Three.js, IWSDK or browser APIs. | M | T, I |
| REQ-INPUT-008 | Only the SDK's tracked-hand visual shall represent the player's hands. | M | I |
| REQ-INPUT-009 | Either hand shall be able to perform any interaction role. | M | T |
| REQ-INPUT-010 | If hand tracking is not available in the session, the player shall be told how to enable it and that controllers can be used. | M | T |

## 8. Comfort

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-COMFORT-001 | At every vantage all grips, rails, seals and markers shall lie within: height 0.75 to 1.25 m, forward 0.30 to 0.55 m, sideways within 0.45 m of the seated reference point. | M | T, D |
| REQ-COMFORT-002 | The player's viewpoint shall move only by a hop between vantages or by an optional snap turn. | M | I, T |
| REQ-COMFORT-003 | A hop shall fade to black in 0.20 s, reposition while black, and fade in over 0.25 s. | M | T |
| REQ-COMFORT-004 | The application shall never translate, rotate, shake or animate the camera or player rig other than as in REQ-COMFORT-002. | M | I, T |
| REQ-COMFORT-005 | Snap turn shall be available as a setting, off by default, in steps of 30 or 45 degrees. | S | T |
| REQ-COMFORT-006 | While any module moves, the player's own module and station shall remain still and visible; drawn module speed shall be capped so a full traverse takes at least 1.2 s and rotation does not exceed 60 degrees per second; no full-field flash or strobe shall occur. | M | T, D |
| REQ-COMFORT-007 | The Surveyor shall never be drawn closer to the camera than 1.5 m, or 2.5 m in reduced intensity. | M | T, D |
| REQ-COMFORT-008 | The session shall be interruptible at any moment with no loss beyond the current position within a sequence. | M | T, D |

## 9. Experience

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-UX-001 | At least 80% of first-time players shall commit the first seam within 90 s of entering VR without assistance. | M | P |
| REQ-UX-002 | Every grip shall share one visual design and shall respond to hand proximity. | M | I, T |
| REQ-UX-003 | Each event in `interaction-feedback.md` shall produce both its listed visual and its listed audio response. | M | T, I |
| REQ-UX-004 | A vantage's signal lamp shall be lit if and only if the player can hop to it now. | M | T |
| REQ-UX-005 | During play no interface shall be shown other than the envelope and the two cards in `ux-flow.md`. | M | I |

## 10. Game state

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-STATE-001 | The game shall be in exactly one of: Boot, Title, ChapterIntro, Exploration, PuzzleActive, SeamInteraction, ThreatEncounter, Checkpoint, Pause, FailureRecovery, ChapterComplete; and shall change state only by the transitions in `runtime-lifecycle.md`. | M | T |
| REQ-STATE-002 | When the XR session is not visible the game shall pause, releasing held grips with return, and on resuming shall continue from the identical domain state. | M | T, D |
| REQ-STATE-003 | When the player is caught the game shall restore the canonical snapshot of the last checkpoint. | M | T |
| REQ-STATE-004 | The domain shall advance in fixed steps of 50 ms driven by an accumulator, with at most 5 steps per frame, and no rule decision shall depend on frame rate. | M | T |
| REQ-STATE-005 | Each frame shall execute in the order: input adapters, command application, domain ticks, event dispatch, presentation, audio. | M | I, T |

## 11. Data and persistence

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-SAVE-001 | Saved data shall carry an integer schema version. | M | T |
| REQ-SAVE-002 | Saved data shall contain only: schema version, chapter ID, checkpoint ID, seam detents, flags, puzzle progress, the Surveyor snapshot at that checkpoint, the edge list for validation, catch count, completion and settings. | M | T, I |
| REQ-SAVE-003 | Saved data shall be kept only in the browser's local storage for the site's origin. | M | I, T |
| REQ-SAVE-004 | On load, saved data shall be accepted only if it parses, matches the schema, references only known IDs, and its edge list equals the graph recomputed from its seam detents and flags. | M | T |
| REQ-SAVE-005 | If saved data is rejected the system shall, in order: migrate it if its version is older and a migration exists; else restore the canonical snapshot of its checkpoint if the checkpoint ID is known; else start a new game. It shall not throw. | M | T |
| REQ-SAVE-006 | Saves shall be written only at checkpoints, on completion and on settings changes, by writing a new record and then switching a pointer to it. | M | T |
| REQ-SAVE-007 | A saved record shall not exceed 8 KB. | M | T |

## 12. Platform

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-PLAT-001 | The application shall run in the Meta Quest Browser on Quest 3 and Quest 3S. Quest 2 is best effort. | M | D |
| REQ-PLAT-002 | The application shall request a WebXR `immersive-vr` session with a floor-level reference space and hand tracking as an optional feature. | M | T, D |
| REQ-PLAT-003 | The project shall be created with the official IWSDK generator, and the versions of Node, IWSDK, Three.js, IWER, Vite and TypeScript shall be recorded from its lockfile. | M | I |
| REQ-PLAT-004 | The production build shall be static files servable over HTTPS from any path, with no server-side logic. | M | T, I |
| REQ-PLAT-005 | The application shall run in a desktop browser under IWER for development and automated runtime tests. | M | T |
| REQ-PLAT-006 | The IWSDK world shall own the render loop. Application code shall not call `requestAnimationFrame`, `setAnimationLoop` or timers to drive simulation. | M | I, T |
| REQ-PLAT-007 | Three.js symbols shall be imported only from `@iwsdk/core`. | M | T |
| REQ-PLAT-008 | Only the SDK features in use shall be enabled: grabbing on; physics, locomotion, scene understanding, environment raycast and camera off, unless M0 findings change this by an ADR. | M | I |

## 13. Performance

Measured on Quest 3 in the Quest Browser unless stated. Emulator figures are recorded separately and never substituted (REQ-PERF-011).

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-PERF-001 | At a 72 Hz display rate, at least 95% of frames shall complete within 13.7 ms and 99% within 16.6 ms, at every vantage and during every seam move. | M | D |
| REQ-PERF-002 | No 5 s window during the reference playthrough shall average more than 16.6 ms per frame. A violation blocks release. | M | D |
| REQ-PERF-003 | Draw calls shall not exceed 120 per frame at any vantage. | M | T, D |
| REQ-PERF-004 | Triangles submitted shall not exceed 300,000 per frame at any vantage. | M | T, D |
| REQ-PERF-005 | GPU texture memory shall not exceed 256 MB; total download shall not exceed 60 MB; assets required before the title shall not exceed 25 MB. | M | T, D |
| REQ-PERF-006 | The combined update time of all application systems shall not exceed 2.0 ms at the 95th percentile; one domain tick shall not exceed 0.3 ms. | M | T, D |
| REQ-PERF-007 | Application systems shall not allocate in their per-frame update; no garbage collection pause over 4 ms shall occur during the reference playthrough. | M | I, D |
| REQ-PERF-008 | After ChapterIntro, no single frame shall exceed 30 ms due to shader compilation or texture upload. | M | D |
| REQ-PERF-009 | A change in the holding hand's position shall be reflected in the grip's drawn position by the next frame. | M | T, D |
| REQ-PERF-010 | Time from navigation to an enabled Enter VR button shall not exceed 10 s on a 50 Mbit/s connection. | S | D |
| REQ-PERF-011 | Every performance result shall be labelled with the device, browser version, build and whether it was measured under IWER or on a headset. | M | I |

## 14. Reliability

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-REL-001 | Ending and re-entering the XR session shall leave domain state consistent and resumable. | M | T, D |
| REQ-REL-002 | Every subscription, listener and timer created by a system shall be released on teardown; ten consecutive restarts shall not increase retained heap by more than 5 MB. | M | T, I |
| REQ-REL-003 | An uncaught error in application code shall stop the simulation, show the error card with a restart control, and not leave a frozen frame. | M | T |
| REQ-REL-004 | Failure to load a critical asset shall be reported on the web page with a retry; failure of a background asset shall not stop play. | M | T |
| REQ-REL-005 | Removing the headset or hiding the tab shall pause the game. | M | T, D |

## 15. Accessibility

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-A11Y-001 | A one-handed mode shall allow the chapter to be completed with either hand alone. | M | T, D |
| REQ-A11Y-002 | Station layouts shall be mirrorable for handedness. | S | T |
| REQ-A11Y-003 | A reduced-intensity mode shall apply the alternative Surveyor profile and presentation in `locomotion-comfort.md` section 5. | M | T |
| REQ-A11Y-004 | Every sound listed as carrying game information shall have the visual twin listed in `accessibility.md`. | M | I, D |
| REQ-A11Y-005 | No game information shall be conveyed by hue alone. | M | I |
| REQ-A11Y-006 | Grips and lit lamps shall have a luminance contrast of at least 3:1 against their surroundings, and envelope text a capital height of at least 20 mm. | M | I, D |

## 16. Audio

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-AUDIO-001 | Seam, joint and Surveyor sounds shall be positional at their source using the SDK's audio component. | M | T, D |
| REQ-AUDIO-002 | The sound identifying a Surveyor state shall begin within 0.5 s of entering that state. | M | T |
| REQ-AUDIO-003 | Each positional source's level shall be attenuated by the number of edges on the shortest open route between its module and the player's, as given by the domain. | S | T, D |
| REQ-AUDIO-004 | Audio shall start on the Enter VR gesture and resume whenever the session becomes visible. | M | T, D |
| REQ-AUDIO-005 | The mix shall not clip, and Surveyor state sounds shall not be ducked by any other sound. | M | I, D |

## 17. Security and privacy

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-SEC-001 | After assets are loaded the application shall make no network requests, and shall include no analytics, advertising or third-party scripts. | M | T, I |
| REQ-SEC-002 | Head and hand pose data shall not be stored or transmitted. | M | I |
| REQ-SEC-003 | Saved data shall be treated as untrusted input and validated before use. | M | T |
| REQ-SEC-004 | Runtime dependencies shall be limited to those installed by the IWSDK generator, and shall have no known high-severity advisories at release. | M | I |

## 18. Error handling

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-ERR-001 | Where `immersive-vr` is not supported the web page shall say so and say what is needed. | M | T |
| REQ-ERR-002 | If a session request is refused or fails, the page shall say so and allow another attempt. | M | T |
| REQ-ERR-003 | A domain command that is not legal in the current state shall be rejected with a reason code and shall change nothing. | M | T |
| REQ-ERR-004 | When saved data is rejected, the player shall be told once, on the envelope, that earlier progress could not be restored. | S | T |

## 19. Originality

| ID | Requirement | Pri | Method |
|---|---|---|---|
| REQ-ART-001 | Every shipped asset shall have a completed row in the asset register stating its source and rights. | M | I |
| REQ-ART-002 | Every character, environment and key image shall pass the originality checklist in the art direction bible. | M | I |

## 20. Runtime limitations

Stated so that nobody plans against capabilities the platform does not have.

| Limitation | Consequence for the design |
|---|---|
| Tracked hands have no haptics | All feedback is visual and audio |
| Hand tracking loses hands outside the cameras' view, when hands overlap, and in poor light | Stations keep hands in front and apart; bracing hand is still; loss handling is specified |
| WebXR runs in a browser on a mobile GPU | Baked lighting, small draw-call budget, no post-processing |
| Browsers require a user gesture to start XR and audio | The Enter VR button |
| WebXR requires a secure context | HTTPS hosting; a local certificate in development |
| Web audio has no geometry-aware occlusion | Graph-based attenuation |
| Local storage is small and can be cleared by the user or browser | Saves are tiny, validated, and optional |
| IWER emulates input and view, not tracking quality, comfort or device performance | Headset validation is a separate gate |
| The SDK is young and changing: 1.1.0 is current and 1.2.0 has a release candidate | Versions are locked; SDK use is confined to adapters and systems; an upgrade is a deliberate task |
| The world scale of a WebXR session cannot be changed per user | Scale is built into the geometry |

## 21. Requirement counts

| Group | Count |
|---|---|
| GAME | 7 |
| SEAM | 12 |
| GRAPH | 8 |
| ENEMY | 12 |
| PUZZLE | 6 |
| INPUT | 10 |
| COMFORT | 8 |
| UX | 5 |
| STATE | 5 |
| SAVE | 7 |
| PLAT | 8 |
| PERF | 11 |
| REL | 5 |
| A11Y | 6 |
| AUDIO | 5 |
| SEC | 4 |
| ERR | 4 |
| ART | 2 |
| **Total** | **125** |
