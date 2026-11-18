# Puzzle design

IDs, detents and tables are in `first-chapter.md`. This document explains why each puzzle is built the way it is and how it is proven solvable.

## Grammar

Every puzzle is made from five things the player can see.

| Element | What the player sees | Rule it expresses |
|---|---|---|
| Profile | The shape of a doorway and of the brass threshold plate set in its sill: arched, square or round | Only like shapes mate |
| Facing | Which way a doorway points | Doorways must face each other |
| Detent | A notch on the rail, and a matching mark on the room's track across the void | Rooms rest only at notches |
| Block | An ash-grey outline where a moving room would hit another | One room can be in another's way |
| Latch | An anchor grip beside a travel grip | This seam needs bracing |

Three more govern the Surveyor: the count (knocks), the ring it turns toward its target, and its hand on a door frame when a seam is held.

Rules for authors:

1. One new idea per puzzle. Earlier ideas may recur.
2. The first obvious move teaches. It is never punished and is always reversible.
3. The goal is visible before the tools are touched.
4. No hidden state. Anything that affects the outcome can be seen from the station.
5. Solutions are three moves or fewer.
6. Shape distinguishes; colour never does alone (REQ-A11Y-005).

## Puzzle 0: the first seam (Sequence 1)

- **Idea.** Grip, slide, seat.
- **Setup.** One door, one grip, one rail, two detents. The staircase is visible, offset, through the door.
- **Why it cannot be misread.** Nothing else in the hall is brass at hand height. The rail is the same length as the gap is wide, scaled down.
- **Obvious move.** Slide. It is the solution.
- **State space.** 2.

## Puzzle 1: The Missing Staircase (Sequence 2)

- **Idea.** Brace and pull. Resting is not connecting.
- **Setup.** The stair ends in air. The landing is docked 14 m away. Two grips on the newel post.
- **Obvious move.** Pull the travel grip alone. It rattles against its latch. The anchor grip beside it pulses. The player braces.
- **Second lesson.** The rail has a notch half way. Releasing there leaves the landing short, unlit, with a visible gap. This is the only place in the chapter where a room rests without connecting anything, and it is here so the player learns to look for the ring of light before letting go.
- **Solution.** `seam-landing` to 2 with `seam-hall` at 1.
- **State space.** 3 (times 2 for the hall seam, which the player has no reason to revisit).

## Puzzle 2: The Wrong Door (Sequence 3)

- **Idea.** Profile and facing. The first door that works leads nowhere.
- **Setup.** A square room on a turntable between the landing (arched doorway) and the corridor (square doorway). Its four faces: arched, square, blank, arched.
- **Obvious move.** Walk in through the open arched door. Inside the player sees a blank wall where the corridor should be, a square door facing the void, and an arched door open on a drop. The room is telling them its own contents.
- **The reasoning the player needs.** "The corridor wants a square door. This room has one. I need the square door there and an arched door here."
- **Why exactly one answer.** See the configuration table in `first-chapter.md` section 4. Position 0 connects the landing only. Position 1 connects both. Position 2 presents a blank wall to the landing. Position 3 presents the square door to the arched landing doorway and is refused.
- **Feedback for wrong answers.** Position 2: the stroke completes and seats, and the player faces a wall; nothing lights. Position 3: both doorways show the dull refusal clank and a brief shake of the threshold plates, which do not interlock.
- **Cost of error.** One stroke per quarter turn. From any position the answer is at most three strokes away, and the lever works in both directions.
- **State space.** 4.

## Puzzle 3: The Swing Bridge (Sequence 4)

- **Idea.** The Surveyor can only use open doorways, and it goes to the newest joint.
- **Setup.** A straight corridor in three sections. The middle section pivots. Swung, its free end meets a dead-end office with a glazed wall.
- **Obvious move.** Swing the bridge to cut the Surveyor off. This is half the answer and it is immediately rewarded: the Surveyor stops where it is.
- **What the house then shows.** Swinging the bridge made a new joint at the office door. The Surveyor's ring turns to it, it knocks, and it goes to measure it. The player watches it enter a room with one door.
- **The second move.** Swing back while it is inside. The office is now sealed.
- **Timing.** From the moment the Surveyor has crossed into the office, the player has the measuring ritual (6 s), its replanning pause (1.5 s) and its walk back across the room (5 s): about twelve seconds at standard intensity. Taking the lever at any point in that time is enough, because a seam in the hand suspends the doorway. If missed, it patrols between the bridge and the office on a fixed cycle, so the window recurs about every fifteen seconds.
- **Recoverable mistakes.** Swinging back while it is on the bridge carries it round to the player's side. Not swinging at all lets it arrive. Both end at the WEST postmark with the encounter reset.
- **State space.** 2 seam positions, times the Surveyor's position and state. Verified by MC-03.

## Puzzle 4: Room Zero (Sequence 5)

- **Idea.** One room can block another's path. Order matters.
- **Setup.** The lift sits at corridor level, its square door mated to the corridor, its round port open on the void. Room Zero is out on its arm.
- **Obvious move.** Swing the arm in. It stops short. An ash outline shows the arm's path passing through the lift cage.
- **The reasoning the player needs.** "The lift is where the room needs to pass. Move the lift, bring the room, put the lift back."
- **Solution.** `seam-lift` to 0 or 2; `seam-arm` to 1; `seam-lift` to 1. Three moves.
- **Why the lift can return.** The arm's swept path crosses the cage's space; its docked pose sits just beyond it. The lift descends beside the docked room and its round port meets the round door.
- **State space.** 3 x 2 = 6, of which one is the goal and one (lift at 1, arm at 1) is reachable only by the correct order.

## Solvability and softlock proof

The chapter's rule state is small enough to enumerate: 2 x 3 x 4 x 2 x 3 x 2 = 288 seam configurations, 11 player vantages, the Surveyor's position (a room, or a doorway) and state, and a handful of flags. Test MC-01 explores every state reachable from the start by any sequence of legal player commands and Surveyor ticks, treats failure recovery as a transition, and asserts that the chapter-complete state is reachable from each one. MC-02 replays the golden path. MC-03 asserts that from the start of the encounter a strategy exists in which the player is never caught.

This is a property of the rules and the authored data, checked without a headset. It does not show that a human will find the solution; that is what playtests PT-02 and PT-04 are for.

## Hints

Written in ink on the back of the envelope after idle time at a station. Tier 1 names the goal, tier 2 names the idea, tier 3 names the move. Text is final only after playtesting.

| Puzzle | Tier 1 (40 s) | Tier 2 (80 s) | Tier 3 (120 s) |
|---|---|---|---|
| First seam | The stair is waiting. | Brass is for hands. | Take the grip. Slide it. |
| Staircase | The landing has wandered. | Hold on with one hand. Pull with the other. | Pull until the door lights. |
| Wrong Door | The corridor is square. | Count the doors as they turn. | A quarter turn. Arch to you, square to it. |
| Swing Bridge | It only uses doors. | It must measure every new joint. | Let it into the office. Then take the door away. |
| Room Zero | The room cannot pass. | Something is in its way. | Lift away. Room in. Lift back. |

Idle time is counted only while the player is at the station and the Surveyor is not within one doorway.
