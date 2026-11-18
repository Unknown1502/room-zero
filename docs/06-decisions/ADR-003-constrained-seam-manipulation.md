# ADR-003: Seams are one-degree-of-freedom constraints with authored detents

Status: accepted, 2026-11-16.

## Context

The brief asks for valid translation axes, rotation axes, limits, collision rejection, snap tolerances, previews and invalid-drop recovery, and forbids arbitrary unrestricted room movement. That leaves a range from "a room slides on one rail" to "a room moves freely within limits on several axes and snaps when near a socket".

## Decision

Each seam moves exactly one module along exactly one authored path, a line or an arc, with two or more authored resting positions. At rest a seam is always at a detent. While held it has one continuous parameter used for drawing and preview. Releasing near a detent seats it there; releasing elsewhere returns it to the last committed detent. The hand's position is projected onto a small rail by our own code and sent to the domain as that parameter; the SDK's grab components are used to detect the hold, not to move the room.

## Reasons

- **Readable.** A room many metres across, seen over a void, can only be understood if it moves in one obvious way.
- **Enumerable and testable.** Finite states make exhaustive validation and softlock checking possible.
- **Robust to imprecise hands.** Tracking noise moves one number, which is filtered and snapped. It cannot tilt a room.
- **No physics needed.** Constrained kinematic motion is a transform set each frame.
- **Clean failure.** There is no half-placed state at rest, so hand loss, pause and hop all have a defined outcome.
- **It still feels large.** Weight comes from gearing, lag, sound and dust, which are presentation choices independent of the degrees of freedom.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Free six-degree-of-freedom rooms with proximity snapping | Unreadable at scale; unbounded state; tolerance edge cases; uncomfortable to watch |
| Two or three degrees of freedom within limits | Most of the cost of free movement for little added play in a seven-minute chapter |
| Physically simulated rooms on joints | Needs the physics feature and tuning; non-deterministic; no benefit to the puzzle |
| Let the SDK's grab limits constrain a grip, and read the room position from it | The declarations do not specify the limits' coordinate frame, the mapping for rotation-only grabs, or any gearing. Kept as fallback P2 |
| Direct grab of the room | Rooms are far beyond reach |
| Buttons that play a room animation | Removes the hand from the mechanic |

## Consequences

- Every seam needs authored path, detents, a rail and collision boxes. Authoring cost is per seam and is small.
- Puzzles are about which detent and in what order, not about fine placement.
- Continuous seams, where any position along a path is valid, are excluded. If a later chapter wants one, the connection tolerance already exists to support it, but softlock checking would need a different method.
- The hand adapter carries the projection and loss logic and must be unit-tested with recorded samples.

## Requirements

REQ-SEAM-001 to REQ-SEAM-012, REQ-INPUT-006.
