# ADR-004: The Surveyor is a deterministic state machine routed by uniform-cost search

Status: accepted, 2026-11-16.

## Context

The antagonist must respect the house graph, react to changes, be learnable and fair, never teleport, and need no external service. The brief suggests BFS or A* and asks for the choice to be justified.

## Decision

1. The Surveyor is a finite state machine with nine states and a transition table held as data.
2. Its position is always a room or a doorway. It changes room only by spending that room's authored crossing time and then a fixed threshold time.
3. Its target is chosen by a fixed priority: the newest reachable fresh joint, then the letter, then nothing.
4. Its route is found by uniform-cost search over edges it may use, with step cost equal to the crossing time of the room being left plus the threshold time, and ties broken by the lower edge ID.
5. It advances only on the domain's fixed tick. It uses no randomness, no wall-clock time, no perception model and no network or machine-learning service.

## Why uniform-cost search

| Algorithm | Fit |
|---|---|
| **Breadth-first search** | Finds the route with the fewest doorways. Rooms take different times to cross, from 3 s to 10 s, so the fewest doorways is not always the quickest route. Correct only if all costs were equal |
| **A\*** | Needs a heuristic that never overestimates the remaining cost. The usual one is straight-line distance. In a house whose rooms can be reconnected anywhere, two rooms far apart in space can be one doorway apart, so straight-line distance can overestimate. With a zero heuristic A* is uniform-cost search. There is nothing for the heuristic to buy on a graph of eleven nodes |
| **Uniform-cost search** | Exactly right for non-negative, unequal costs with no usable heuristic. Deterministic with a fixed tie-break. Microseconds at this size |

The count the Surveyor knocks is simply the number of edges on the route this search returns. A plain breadth-first search is used in one other place, where doorway count alone is what matters: attenuating sound by the number of open doorways between a source and the player.

## Why a compulsion instead of senses

Vision cones and noise radii are hidden state the player has to guess. "It goes to the newest joint, then to the letter" is a rule the player can test with the same verb they use for everything else. It also makes misdirection a building action, which is the game's premise.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Behaviour tree | More machinery than nine states need; harder to enumerate for model checking |
| Utility scoring | Smooth trade-offs are the opposite of learnable rules |
| Scripted encounter | Breaks as soon as the player does something else; contradicts the premise |
| Randomised patrols | Unfair, untestable |
| A language model or cloud service | Unnecessary, non-deterministic, needs a network, a privacy cost; the brief rules it out |
| Navigation mesh pathing inside rooms | Room-level routing is what the rules need. In-room motion is animation along authored paths |

## Consequences

- Every behaviour can be reproduced from a starting state and a command list. That is the main debugging tool.
- The encounter can be model-checked for fairness and softlocks.
- The Surveyor will never surprise an attentive player. Tension must come from staging, sound and time, not from unpredictability.
- Players can learn to manipulate it completely. That is the intent. The chapter is short enough that mastery arrives at about the same time as the ending.
- Authored crossing and reach times per room are content that must be tuned with players.

## Requirements

REQ-ENEMY-001 to REQ-ENEMY-012, REQ-PUZZLE-003, REQ-GRAPH-008.
