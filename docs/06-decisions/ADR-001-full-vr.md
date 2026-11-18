# ADR-001: Fully immersive VR, not mixed reality

Status: accepted, 2026-11-16.

## Context

IWSDK supports virtual reality, mixed reality with passthrough, and desktop 3D. The game's premise is being small inside an enormous building.

## Decision

The chapter runs in a WebXR `immersive-vr` session with a fully virtual environment. Passthrough, scene understanding, environment raycasts and camera access are disabled.

## Reasons

- The fantasy depends on scale. A six-metre door cannot exist in a living room seen through passthrough.
- Lighting, darkness and fog are the art direction. Passthrough removes control of all three.
- Mixed reality adds plane and mesh detection, room setup and per-room variability, none of which serves the mechanic.
- A seated VR experience has no dependency on the player's physical room beyond a chair.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Mixed reality, the house as a tabletop model | A different game: the player would be a giant, which inverts the premise |
| Desktop 3D with VR as an option | The mechanic is hands on brass. A mouse version is a later port at best |
| Both VR and MR modes | Doubles the test surface for no gain in the slice |

## Consequences

- The player cannot see their surroundings. Seated play and the absence of any required movement keep that safe.
- A browser preview without a headset exists only through the emulator, for development.
- SDK features for AR stay off, reducing runtime cost (REQ-PLAT-008).

## Requirements

REQ-PLAT-002, REQ-PLAT-008.
