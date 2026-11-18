# Locomotion and comfort

## 1. Posture

The chapter is designed for a seated player on a chair that may or may not swivel, with about an arm's length of clear space in front. It also works standing still. It never asks the player to walk, lean more than 20 cm, turn more than 60 degrees to either side, or reach outside the envelope in `hand-interaction-spec.md` section 4.2 (REQ-COMFORT-001).

The session requests a floor-level reference space, so the player's real head height is used. Stations are built for seated eye heights from 1.05 m to 1.35 m and remain usable standing, where the grips are simply lower.

## 2. Movement: hops between vantages

The only way the player's viewpoint moves is a hop (REQ-COMFORT-002).

| Phase | Duration | What happens |
|---|---|---|
| Fade out | 0.20 s | A black sphere around the head goes from clear to opaque |
| Move | one frame, while fully black | The player rig is placed at the new vantage, facing its authored direction |
| Fade in | 0.25 s | The sphere clears |

- The world is never seen moving relative to the player.
- The fade is a sphere parented to the head, not a post-process, so it costs one draw call.
- Each vantage has an authored facing chosen so that its station and its next lamps are within 45 degrees of straight ahead.
- A hop cannot begin while a fade is in progress.

### Why not the SDK's locomotion

The SDK has slide, teleport and turn systems, and its teleport supports hand micro-gestures. We leave the locomotion feature off for the chapter. ADR-007 gives the full reasoning:

- The rules need the player to be in exactly one known room at all times. Free teleport makes the player's room a matter of collision queries on moving geometry.
- The SDK's locomotion needs walkable collision surfaces on every room, including ones that move, and the SDK notes warn that a missing surface drops the player through the world.
- Authored vantages let us guarantee reach, sight lines and framing, which the art direction depends on.
- One fewer runtime system, and no physics worker.

The implementation moves the SDK's player rig directly. **To verify in M0:** that setting the player rig's position and heading in an XR session behaves correctly with the locomotion feature disabled.

## 3. Turning

Most players will never need it: everything at a vantage is in front. For players in a fixed chair who want to look behind, snap turn is a setting on the envelope, off by default, with steps of 30 or 45 degrees (REQ-COMFORT-005).

When on, two small brass turn-markers appear at the left and right edges of the reach envelope; pressing one with a fingertip turns the rig that way with a 0.1 s fade. This is our own control, because the SDK's turn system belongs to the locomotion feature we have disabled. Smooth turning is not offered.

## 4. Rules that protect comfort

| Rule | Requirement |
|---|---|
| No smooth locomotion of any kind | REQ-COMFORT-002 |
| The camera is never moved, rotated, shaken or animated by the game, except by a hop or a snap turn | REQ-COMFORT-004 |
| The room the player is in never moves | REQ-SEAM-008 |
| The player's floor, the station and the nearest walls are always still, giving a fixed frame of reference while other rooms move | REQ-COMFORT-006 |
| A moving room never fills more than about half of the forward field of view, and its drawn speed is capped | REQ-COMFORT-006 |
| The Surveyor stays at least 1.5 m from the camera (2.5 m in reduced intensity) and never lunges | REQ-COMFORT-007 |
| No strobing, no full-field flashes. The brightest event is a doorway's ring of light | REQ-COMFORT-006 |
| The session can be interrupted at any moment without loss | REQ-COMFORT-008 |

### Moving rooms and vection

Large objects moving across the view can make a seated viewer feel that they are the one moving. The design limits this in four ways:

1. The player's own room, with its floor, walls and station, is always in view and always still.
2. Moving rooms are across a void and are seen against darkness, not against a moving background.
3. Drawn speed is capped: a room crossing 14 m takes at least 1.2 s and usually about 2 s, and rotary seams turn at no more than 60 degrees per second.
4. The player causes the motion with their own hand, which is the strongest known protection.

Whether this is enough is an empirical question for CF-03. If testers report unease, the first remedies are a slower cap and a darker, narrower view across the void, before any vignette.

### Height and the void

The player sits at the edge of drops many times in the chapter. To avoid triggering fear of heights more than the fiction needs:

- Every vantage has a floor extending at least 1 m in front of the seated position and a visible low rail or sill at the edge.
- The void is dark and without a visible bottom, which reads as depthless, not as a measurable fall.
- No vantage looks straight down.

## 5. Intensity

Standard and reduced, set on the envelope (REQ-A11Y-003).

| | Standard | Reduced |
|---|---|---|
| Surveyor pace | As authored | All movement times x 1.25 |
| Closest approach | 1.5 m | 2.5 m |
| Being caught | Ring lowers to frame you; dim to black | Dim to black begins as it enters your room; you never see it close |
| Sound when one doorway away | Low heartbeat-like tape pulse | Omitted |
| Ending | Ring at the round door, 1.5 m away | Ring at the lift's far side, 3 m away |

## 6. Session length and breaks

The chapter is about seven minutes. Postmarks are no more than about 100 s apart on the golden path, and the game saves at each. Removing the headset pauses everything, including the Surveyor (REQ-STATE-002).

## 7. Open comfort questions

- Whether hand-driven motion of rooms this large is comfortable for sensitive players (CF-03).
- Whether seated reach is right across body sizes without a calibration step (CF-01).
- Whether darkness at this level is readable on the headset's display without raising black levels until the mood is lost (HQ-09).
