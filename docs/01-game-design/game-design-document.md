# Game Design Document

Baseline 1.0. Chapter content is specified in `first-chapter.md`. This document explains the design and how its parts fit. Requirement IDs refer to the SRS.

## 1. High concept

First-person, seated, hands-only VR. You are a courier about a third the size of the house's intended residents. The house is a set of rooms hung in a void, joined only where doorways meet. You move rooms. A caretaker called the Surveyor walks the doorways you open.

Genre: dark fairytale puzzle-adventure with pursuit. Tone: uneasy, quiet, never gory.

## 2. Core game loop

**Observe, grip, align, commit, traverse, and the house responds.** Detail and timing at three scales are in `gameplay-loop.md`.

1. **Observe.** From a vantage, read the rooms across the void: which doorways exist, their shapes, which way they face.
2. **Grip.** Take a brass grip at the seam station beside you. Brace with the other hand if the seam is latched.
3. **Align.** Slide or turn. The room follows with weight. Light gathers round doorways that will connect.
4. **Commit.** Let go. The room seats at a resting place, or returns to where it was.
5. **The graph changes.** New doorways open, old ones close. Lamps light at vantages you can now reach.
6. **The Surveyor responds.** It replans on the new graph, and tells you with its count.
7. **Traverse.** Point and pinch at a lamp to hop to it.

## 3. Player perspective and body

- First person. The camera is the player's head and is never moved except by a faded hop (REQ-COMFORT-002).
- The player's hands are the courier's hands, drawn by the SDK's tracked-hand visual and restyled as worn leather gloves with a coat cuff. There is no second pair of hands and no body (REQ-INPUT-008).
- The player is seated. Every interactable at a vantage is inside a seated reach envelope (REQ-COMFORT-001).
- The player's room never moves. Only rooms seen across the void move (REQ-SEAM-008).

## 4. Controls

Everything is done with tracked hands. Controllers work as an optional fallback and are never required (REQ-INPUT-001, REQ-INPUT-005).

| Intent | Hands | Optional controller |
|---|---|---|
| Hop to a vantage | Point at a lit signal lamp, pinch | Point, trigger |
| Take a grip | Reach to the brass grip, pinch and hold | Reach, squeeze |
| Move a seam | Keep holding, move the hand along the rail | Same |
| Unlatch a two-hand seam | Hold the anchor grip with the other hand | Squeeze the other controller on it |
| Commit | Open the pinch | Release squeeze |
| Take or holster the letter | Pinch it from the strap; let go to return it | Squeeze, release |
| Open settings | Turn the envelope over; press a wax seal with a fingertip | Same, with the controller tip |
| Deliver | Hold the letter into pigeonhole 0 and let go | Same |
| Pause | Take the headset off, or open the system menu | Same |

Either hand can do anything (REQ-INPUT-009). One-handed mode replaces bracing with a latch pin that is pressed once (REQ-A11Y-001).

## 5. Seam manipulation

This is the only mechanic. The full interaction specification is `02-experience-design/hand-interaction-spec.md`; the rules are in `house-graph-rules.md`; the data model is in `04-engineering/domain-model.md`.

**What a seam is.** A constraint that lets one room move along one authored path, either a straight slide or a turn about an axis, between authored resting places called detents. Nothing else about a room can change (REQ-SEAM-001).

**Why constrained.** A free six-degree-of-freedom room would be unreadable at this scale, impossible to test, and would let the player build nonsense. One degree of freedom makes every state enumerable. The chapter has 288 seam configurations in total, and tests can visit all of them.

**Why it still feels enormous.** The grip moves 40 cm; the room moves metres. The room does not track the hand instantly: it accelerates, lags and settles, with sound and dust carrying the mass. The player's hand is never fought or pulled, because there are no haptics on hands and a visual tug would break the hand's ownership.

**Two grips, two boundaries.** Each seam joins a room that stays and a room that moves. The staying side carries an *anchor grip*, the moving side a *travel grip*. On light seams only the travel grip is needed. On latched seams the anchor grip must be held to release the latch, so the player braces against the house and pulls the other room toward them. This keeps one hand still, which is also the most reliable posture for hand tracking.

**Snapping.** Releasing near a detent seats the room there. Releasing anywhere else returns it to the last committed detent. There is no in-between state at rest (REQ-SEAM-003).

**Preview.** While holding, a line of warm light gathers round any pair of doorways that would connect at the nearest detent. If a path is blocked by another room, a faint ash-grey outline of the swept shape appears where it would collide and the grip stops (REQ-SEAM-004, REQ-SEAM-005).

**Commit.** The graph changes only when a released room has settled on a detent. While a room is in the player's hand the graph is unchanged, but doorways that depend on that seam are suspended: nobody, player or Surveyor, can start through them until the room is seated again (REQ-SEAM-006).

## 6. The house graph

Rooms are nodes. A pair of mated doorways is an edge. An edge exists only when five conditions hold: position, facing, matching profile, permitted module state, and puzzle rules (REQ-GRAPH-002). Each edge says whether the player may use it, whether the Surveyor may use it, and whether it is locked.

The graph is computed from seam detents by pure functions. It is never read from where meshes happen to be (REQ-GRAPH-005). The player's hops, the puzzles' goals and the Surveyor's routes all query it.

## 7. Puzzles

Four puzzles, each introducing one idea. Full analysis in `puzzle-design.md`.

| Sequence | Puzzle | The one idea | Seams |
|---|---|---|---|
| 1 | The first seam | Grip, slide, seat | `seam-hall` |
| 2 | The Missing Staircase | Brace and pull; resting is not connecting | `seam-landing` |
| 3 | The Wrong Door | Doors mate by shape and facing; the first working door is a dead end | `seam-rotunda` |
| 4 | The Swing Bridge | Cut its route; send it to a dead end; take the door away | `seam-bridge` |
| 5 | Room Zero | A path can be blocked by another room; make room for the room | `seam-lift`, `seam-arm` |

Hints are written on the envelope in ink that appears after the player has been idle at a puzzle, in three tiers (REQ-PUZZLE-006).

## 8. The Surveyor

Full specification in `enemy-surveyor.md`. In brief:

- It is a deterministic state machine. Its position is always a room, or a doorway between two rooms.
- **Rule one: it can only use open doorways.** The same ones you can see.
- **Rule two: it goes to the newest joint first, then to the letter.** A connection you have just made draws it. When it has measured every joint it can reach, it comes for the letter.
- It announces each plan with **the count**: one knock per doorway on its route.
- It does not run, teleport, or appear anywhere it has not walked to.
- If it reaches you, you are returned to the last postmark.

## 9. Level progression

One chapter in five sequences plus an ending, linear, with a difficulty curve of teach, practise, twist, pressure, synthesis.

| Sequence | New element | Pressure |
|---|---|---|
| The Arrival | Hop, grip, slide, seat | None |
| The Missing Staircase | Two hands, the void, half-way rest | None |
| The Wrong Door | Profiles, facing, rotation | None |
| First Surveyor Encounter | The Surveyor, the count | Time, soft |
| Room Zero | Blocking, order of operations | The house is closing: sound only until solved |
| Ending | Scale inversion | None |

## 10. Narrative

Full text in `narrative-bible.md`. The letter is addressed to Room 0 in the courier's own hand. The house takes Room Zero apart each night; the occupant wakes at the entrance with a letter they wrote to themselves so they could find the way back. The Surveyor is the house's caretaker, putting things back where they were last recorded. Tonight the courier arrives before the house closes. The card reads: *You are the return address.*

Told without dialogue: by the envelope, the rooms and the final image.

## 11. Failure and recovery

One failure, being reached by the Surveyor. Its presentation, the return to the last postmark, and the reason it fits the fiction are in `first-chapter.md` section 9. Failure costs at most the current sequence. There is no game-over screen and no death.

Puzzles cannot be failed. Any seam can be moved back.

## 12. Onboarding

No tutorial panels. The first ninety seconds teach three things in order, each by a single object placed alone in view: a lit lamp (hop), a pulsing brass grip (grab), a line of light round a doorway (it will connect). Detail in `02-experience-design/onboarding.md`.

## 13. Game states

Boot, Title, ChapterIntro, Exploration, PuzzleActive, SeamInteraction, ThreatEncounter, Checkpoint, Pause, FailureRecovery, ChapterComplete. The transition table is in `04-engineering/runtime-lifecycle.md` and the diagram in `architecture-diagrams.md`.

## 14. Design decisions that challenge the brief

The brief was followed where it was sound and changed where it was not. Each change is recorded so it can be reversed.

| Brief | Decision | Reason |
|---|---|---|
| Investigate teleportation using supported SDK interactions | Movement is a hop between authored vantages, implemented by our own small system; the SDK's locomotion feature is left off | The player must always be at a known graph node; free teleport needs walkable collision geometry on moving rooms; fewer systems running. ADR-007 |
| Valid translation and rotation axes, manipulation limits | Each seam has exactly one degree of freedom with detents | Enumerable, testable, readable. ADR-003 |
| Two-hand grabbing | Two-hand seams use two separate grips, an anchor and a traveller, each a one-hand grab, instead of one two-hand grabbable | The SDK reports only one holder for a two-hand grab; a still bracing hand tracks better; it gives a one-handed accessibility path. ADR-005 |
| BFS or A* | Uniform-cost search with a fixed tie-break | Room crossing times differ, so BFS is wrong; straight-line distance means nothing in an impossible house, so A* has no admissible heuristic. ADR-004 |
| Surveyor triggered when a route exists | The Surveyor is armed by reaching a specific vantage, then obeys topology | A purely topological wake would start the first encounter while the player is three hops from the tool they need |
| Hunting by sight or sound | The Surveyor is drawn by fresh joints and by the letter along open doorways | One verb for everything; no hidden cones or noise meters to guess at |
| Three doorways appear available | Three doors on a turning room, with a fourth blank face | The blank face is what makes the first working position a dead end |
| Connect the final three sections | Corridor end, lift and Room Zero, with a blocking relationship between lift and arm | Two independent sliders would be a chore, not a puzzle |
| A timer for "before the house closes" | No timer. The closing is sound and light until the last connection, then a real but generous pursuit | Timers punish first-time VR players and add nothing to a five-minute chapter |
