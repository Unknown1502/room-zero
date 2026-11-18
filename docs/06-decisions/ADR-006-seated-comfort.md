# ADR-006: Seated, stationary play with a fixed frame of reference

Status: accepted, 2026-11-16.

## Context

The game shows very large objects moving, heights, darkness and a pursuer. Each is a known source of discomfort in VR. The audience includes first-time and occasional VR users and competition judges who may play many entries in a row.

## Decision

1. The chapter is designed for a seated player and needs no physical movement beyond the arms and head.
2. The player's viewpoint changes only by a faded hop between authored vantages or an optional snap turn.
3. The room the player is in never moves. No station is inside the module its seam moves.
4. The game never animates, shakes or otherwise moves the camera.
5. Moving rooms are speed-capped, seen across a dark void, and caused by the player's own hand.
6. The Surveyor keeps a minimum distance and never lunges.
7. Everything interactable is within a defined seated reach envelope.

## Reasons

- Sensory conflict between seen and felt motion is the main cause of VR sickness. Removing all artificial self-motion removes most of it.
- A stationary surround that fills the near field gives the visual system a rest frame while distant things move.
- Motion that the viewer causes and predicts is far better tolerated than motion imposed on them.
- Seated play needs no cleared space, suits long judging sessions, and is more accessible.
- A reach envelope prevents fatigue and keeps hands where tracking is best.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Room-scale walking | Needs space; the house is far larger than any room; impossible-space redirection is a project in itself |
| Smooth locomotion with a vignette | Uncomfortable for a significant share of players; adds nothing to the mechanic |
| Riding inside moving rooms | Would be memorable and is the most direct route to nausea |
| Camera shake on impacts | Cheap drama at the cost of comfort; the brief forbids it |
| Standing play as the design target | Tiring; reach is harder to guarantee; no benefit |

## Consequences

- Level design is a sequence of composed views from fixed seats. This helps art direction and performance.
- The player cannot wander. Exploration is by looking and by hopping.
- The anchor rule constrains puzzle design: the player can never be the passenger.
- Height and darkness remain and must be checked with people.
- Comfort is verified only on a headset; the emulator can say nothing about it.

## Requirements

REQ-COMFORT-001 to REQ-COMFORT-008, REQ-SEAM-008, REQ-A11Y-003.
