# ADR-007: Movement by authored vantage hops; the SDK locomotion feature stays off

Status: accepted, 2026-11-16. To be revisited if assumption A5 fails in M0.

## Context

The brief asks us to investigate comfortable hand-operated teleportation using supported SDK interactions. The SDK provides a locomotion feature with slide, teleport and turn systems. Its teleport draws an arc and a landing marker, validates the surface, and has an option for hand micro-gesture control. It requires walkable geometry marked with a locomotion-environment component, with a kinematic type for moving platforms, and its own guidance warns that enabling it without such geometry drops the player through the world.

## Decision

The player moves only between authored vantages. A vantage the player can currently reach shows a lit signal lamp. Pointing at the lamp and pinching fades the view, places the player rig at the vantage, and fades back. This is implemented by a small system of ours using the SDK's ray interactable and pressed tag. The SDK's locomotion feature is disabled.

## Reasons

- **The rules need a known room.** The Surveyor's catch rule, the anchor rule for seams and hop legality all depend on which module the player is in. With vantages that is a field. With free teleport it is a collision query against geometry that moves.
- **Moving rooms.** Free teleport would need walkable collision on every room, updated as rooms move, and an answer to what happens when the player's landing spot is on a room in motion.
- **Guaranteed reach and framing.** A station must be inside the seated reach envelope and the goal must be in view. Authored seats guarantee both.
- **Fewer moving parts.** No locomotion engine, no worker, no collision geometry, one less feature to validate on hardware.
- **Readable affordance.** A lit lamp is a diegetic "you can go here" that also reports the state of the house graph.
- **The SDK is still used** for what matters: the hand ray, hit testing and the pressed state.

## Alternatives considered

| Alternative | Why not |
|---|---|
| SDK teleport, free, with walkable geometry | Reasons above |
| SDK teleport restricted to small pads at vantages | Still needs the locomotion feature and collision; the arc gesture is harder for novices than point-and-pinch; gains only the built-in arc visual |
| SDK locomotion enabled only to call its position setter | A whole feature for one call. Kept as the fallback if moving the rig directly proves wrong |
| Gaze dwell on lamps | Slower; accidental activation; not needed on Quest |
| Automatic movement when a route opens | Takes control from the player; uncomfortable |

## Consequences

- Movement is coarse: eleven seats. The chapter is composed for that.
- Snap turn, if wanted, is our own control, because the SDK's turn system belongs to the feature we disabled.
- We own the fade and the rig placement and must verify both on hardware.
- A pinch near a grip must not also trigger a hop. Handled by placement rules and suppression, and tested.
- If a later chapter wants free movement inside a large room, this decision is reopened for that room only.

## Requirements

REQ-COMFORT-002, REQ-COMFORT-003, REQ-COMFORT-005, REQ-INPUT-003, REQ-UX-004, REQ-PLAT-008.
