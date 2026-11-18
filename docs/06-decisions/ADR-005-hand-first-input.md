# ADR-005: Hands first, three gestures, and two-hand seams built from two one-hand grips

Status: accepted, 2026-11-16. The grab-detection plan is provisional until the M0 spike.

## Context

The chapter must be playable with tracked hands and no controller. Tracked hands have no buttons and no haptics, lose tracking when occluded or out of view, and are fatiguing to hold up. The SDK offers one-hand, two-hand and distance grabbable components, ray and poke interactables, and forwards a hand pinch as a grab by default.

## Decision

1. **Hands are the primary input.** Controllers work through the SDK's default mapping and are never required.
2. **Three gestures only:** pinch-and-hold on a grip; point-and-pinch at a lamp; fingertip press on a seal.
3. **Two-hand seams use two grips**, an anchor grip and a travel grip, each an independent one-hand grabbable. The domain requires the anchor to be held before the travel grip will move.
4. **The SDK detects the hold; we compute the motion.** The hand adapter reads the `Grabbed` tag and the holder hand, projects the hand's position onto the grip's rail, and sends a parameter to the domain. Fallback plans are in the hand interaction specification.
5. **One-handed mode** replaces the anchor grip with a latch pin.

## Reasons

- Pinch is the gesture the platform's own interface teaches, and the SDK maps it to grab without extra work.
- A still bracing hand in front of the body is the most reliably tracked pose there is. The moving hand stays in view on a short rail.
- The SDK's two-hand grabbable is built for moving, rotating and scaling one object with both hands. Our two hands do different jobs. Its holder query also reports only the left hand for a two-hand hold, so per-hand state would have to be tracked by us anyway.
- Two separate grips give a natural one-handed alternative and a clear fiction: brace against the house, pull the room.
- Three gestures can be taught without text in ninety seconds.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Controllers primary, hands optional | Contradicts the brief and loses the main appeal |
| The SDK's `TwoHandsGrabbable` on one handle | Wrong model for brace-and-pull; single reported holder; scaling behaviour unwanted |
| Custom gestures such as fist, palm push or swipe | Recognition is unreliable, there is no SDK support, and they must be taught |
| Micro-gestures for movement | The SDK's teleport and turn systems have a micro-gesture option, but how it is enabled was not found, and it brings the locomotion feature with it. See ADR-007 |
| Gaze and pinch | Supported by the SDK for other devices; not needed on Quest and adds a mode |
| Voice | Not available in this stack; unsuitable for a quiet game |

## Consequences

- No haptics: every interaction needs paired visual and audio feedback, specified in the feedback table.
- Hand loss is normal and has defined outcomes that never commit an unintended move.
- Station layout is constrained to a seated reach envelope, which constrains level design.
- Five assumptions about the SDK's behaviour with hands must be tested before anything else is built (A1 to A4 and A7).
- If the M0 spike shows hand holds are unreliable on hardware, one-handed mode with a latch pin becomes the default and the anchor grip becomes optional.

## Requirements

REQ-INPUT-001 to REQ-INPUT-010, REQ-SEAM-007, REQ-A11Y-001, REQ-A11Y-002.
