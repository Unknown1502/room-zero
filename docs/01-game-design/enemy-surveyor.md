# The Surveyor

The design and behaviour of the chapter's antagonist. Appearance is in `03-art-and-audio/character-design.md`; algorithms and types are in `04-engineering/domain-model.md` section 7; timings are in `first-chapter.md` section 7.

## 1. What it is

The house's caretaker. It keeps the record of where every room is, and it puts things back where they were last recorded. It is not hungry, angry or cruel. It is thorough.

It stands about seven and a half metres tall when upright and usually is not: it stoops under door heads and folds itself along corridors. Its skin is old plaster over lath, covered in fine pencilled measurement marks. Its limbs are a third too long. Where a head would be it carries an open brass ring with a gap in it, like a surveyor's circle with a segment missing. It has no face.

It carries a steel tape, a plumb line and a pencil.

## 2. The two rules the player must learn

1. **It can only use open doorways.** Exactly the ones the house graph says are open, unlocked and wide enough for it.
2. **It goes to the newest joint first, then to the letter.** Any doorway connection made since it woke that it has not measured draws it. When there is none it can reach, it walks toward the letter.

Everything else in this document is detail in service of those two sentences.

## 3. How it tells you what it is doing

| Signal | Meaning | Visual twin for players who cannot hear it |
|---|---|---|
| **The count**: N knocks on a wall | It has a route with N doorways. Made when it forms a plan, and again, more quietly, each time it enters a room | N chalk strokes appear on the nearest wall lamp's bracket and fade over 6 s |
| Tape drawn out, long, with no knock | It has no route to anything | A slack loop of tape hangs from its hand |
| The ring turns and holds | The ring faces along its route to its target | Same |
| Plumb line lowered at a brink | The doorway it wanted has gone | Same |
| A hand on a door frame | It is passing through that doorway; the seam is held | Same; chalk dust falls from the seam's grip |
| Pencil scratch and tape rasp, in bursts | It is measuring a joint | It kneels at the doorway with the tape across the sill |
| Crouch with both hands on the walls | The room it is in is moving | Same |

The count is capped at five knocks.

## 4. Where it can be

Its position is always one of:

- **in a room**, with a timer counting its walk across it; or
- **in a doorway** between two rooms, for 1.5 s.

It moves by walking across the room it is in toward a doorway, for that room's crossing time, then passing through. It cannot be anywhere else, and it cannot change rooms without spending that time (REQ-ENEMY-005).

## 5. States

| State | It is | Leaves when |
|---|---|---|
| **Dormant** | In the Survey Office. Before it is armed it logs each joint the player makes with one distant knock and never moves | It is armed and has a target: to Listening |
| **Listening** | Still in the office. Measuring sounds for the wake delay (8 s) | Delay ends: to Replanning |
| **Replanning** | Standing still for 1.5 s, ring sweeping. Chooses a target and a route, then makes the count | Joint target: Investigating. Letter, two or more doorways: Approaching. Letter, one doorway or the same room: Hunting. No target, away from the office: Searching. No target, in the office: Dormant |
| **Investigating** | Walking to a fresh joint, then measuring it for 6 s. Measuring marks every fresh joint touching the room it is in | Measuring done, or the joint vanished: Replanning. Next doorway gone: Blocked |
| **Approaching** | Walking toward the letter at normal pace | One doorway left: Hunting. Next doorway gone: Blocked. A fresh joint appears that it can reach: Replanning |
| **Hunting** | As Approaching, at 1.3 times the pace | In the player's room for that room's reach time: the player is caught. Next doorway gone: Blocked. Route grows to two or more: Approaching |
| **Blocked** | At a brink. Lowers the plumb line for 4 s | Time up: Replanning |
| **Searching** | No target. Walks the rooms it can reach in a fixed order. If it can reach only the room it is in, it stands at the brink with its tape slack | A target appears: Replanning. 45 s without one and a route home exists: Retreating |
| **Retreating** | Walking back to the Survey Office | Arrives: Dormant. A target appears: Replanning |

It is armed once, when the player first reaches `v-cwest-end`, and stays armed. Joints made before it is armed are already known to it and are not fresh.

## 6. Choosing a target

Evaluated in Replanning, and re-checked every tick so that a change is noticed within one tick (REQ-ENEMY-003).

1. Among fresh joints, take the newest one whose *measuring room* it can reach. **It measures a joint from the side that stayed still.** The measuring room is fixed when the joint is made: it is the room of the two that was not the one being moved. If that room is one the Surveyor can never enter, which in this chapter means Room Zero, it is the other room. The measuring room does not change afterwards, wherever the Surveyor is.
2. Otherwise, if any route exists to the room the player is in, the target is the letter.
3. Otherwise there is no target.

Two joints opened by the same commit are ordered by edge ID.

This is why swinging the bridge to the Dead Letter Office draws the Surveyor *into* the office: the bridge moved, the office stayed still, so the office is where it stands to measure. An earlier draft of this rule said "the far side of the joint", which is ambiguous once it has walked through; a model of the encounter showed it pacing back and forth across the new doorway for ever. The rule above is the corrected one.

A change of target or of the next doorway sends it to Replanning, which costs it 1.5 s. A change that only lengthens or shortens the route beyond the next doorway does not; it keeps walking. This stops a player stalling it by hopping back and forth.

## 7. Choosing a route

Uniform-cost search over the edges it may use, where the cost of a step is the crossing time of the room being left plus the threshold time. Ties are broken by the lower edge ID, so the same situation always gives the same route (REQ-ENEMY-012).

Breadth-first search was rejected because rooms take different times to cross, so the fewest doorways is not always the quickest way. A* was rejected because it needs an estimate of remaining distance that never overestimates, and in a house whose rooms can be reconnected anywhere, straight-line distance is not such an estimate. With at most eleven rooms, uniform-cost search runs in microseconds.

## 8. When the house changes under it

| Change | What it does |
|---|---|
| The doorway it is walking toward closes, or is locked | It finishes its walk to the brink, enters Blocked, measures the gap, replans |
| A doorway elsewhere on its route closes | It re-routes silently if the next doorway is unchanged; otherwise Replanning |
| A new joint opens that it can reach | Replanning; the joint becomes its target |
| The seam of the room it is in is taken in hand | It crouches and braces. Its timer pauses, for at most 10 s |
| The seam of the doorway ahead is taken in hand | The doorway is suspended. It waits at it |
| It is in a doorway | Nothing can change. Every seam that doorway depends on is held until it is through |
| The room it is in is moved | It rides with it, then replans from where it now is |

It never crosses a doorway that is not open, and a doorway never closes on it (REQ-ENEMY-002, REQ-SEAM-009).

## 9. Being caught

The player is caught when the Surveyor has been in the player's room for that room's reach time. This holds whatever its target is: if its route to a joint passes through the player's room, it will reach the player on the way.

The player can always answer by hopping to another room through an open doorway, or by having cut the route earlier. Presentation is in `first-chapter.md` section 9. It keeps at least 1.5 m from the camera, or 2.5 m in reduced intensity (REQ-COMFORT-007).

## 10. Fairness contract

These are promises to the player, and each is a tested requirement.

| Promise | Requirement | Test |
|---|---|---|
| It never appears in a room it did not walk into | REQ-ENEMY-005, REQ-ENEMY-006 | UT-SURV-06, MC-04 |
| It only starts from the Survey Office, and only after the player reaches the corridor | REQ-ENEMY-006 | UT-SURV-13 |
| It uses only doorways that are open to it | REQ-ENEMY-002 | UT-SURV-03 |
| It always announces a new plan | REQ-ENEMY-007 | UT-SURV-11, RT-14 |
| Its state can be told apart by sound within half a second | REQ-AUDIO-002 | RT-20, HQ-08 |
| The same situation always produces the same behaviour | REQ-ENEMY-001, REQ-GRAPH-008 | UT-SURV-10, UT-GRAPH-05 |
| From the start of the encounter there is always a way not to be caught | REQ-PUZZLE-003 | MC-03 |
| Being caught costs at most one sequence | REQ-STATE-003 | UT-STATE-03 |
| It never reaches into Room Zero | REQ-ENEMY-002 | UT-SURV-03 |

## 11. Known exploits and what we do about them

| Exploit | Effect | Decision |
|---|---|---|
| Hop back and forth to force replanning | None. Replanning triggers only when its next doorway or target changes | Closed by rule |
| Hold a seam part-moved to suspend a doorway forever | The Surveyor waits. The player is stuck holding a grip and cannot hop without letting go | Harmless stall. Accepted |
| Hold the seam of the room it is in to freeze it | Its brace lasts at most 10 s, then it walks on | Closed by rule |
| Toggle a far seam to keep making fresh joints | It keeps going to measure them, if it can reach them | This is the intended misdirection. In chapter one no far seam is reachable by it during the encounter except through the player |
| Stand in a room it cannot enter | Only Room Zero qualifies, and that is the ending | Intended |
| Wait for it to retreat, then walk past | It wakes when a route to the letter exists again | Closed by rule |

## 12. What it is not

No learning, no randomness, no perception cones, no noise meter, no network service, no language model. It is a pure function of the house graph, the player's room, its own state and elapsed ticks (REQ-ENEMY-010).

## 13. Tunables

All in data: crossing and reach times per room, threshold time, wake delay, measuring time, block time, replan time, retreat timeout, brace limit, hunting pace, count cap. Reduced intensity is a second set of the same values (REQ-ENEMY-011).
