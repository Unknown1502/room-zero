# ADR-008: Rules live in a pure TypeScript domain advanced by a fixed step

Status: accepted, 2026-11-16.

## Context

IWSDK is an entity component system on Three.js with its own render loop. The obvious way to write a game on it is to put state in components and logic in systems. The brief requires that the gameplay domain be unit-testable without a WebXR session, that authoritative decisions not be made in rendering callbacks, and that there be an explicit orchestration boundary with a defined update order.

## Decision

1. All game rules and state live in plain TypeScript under `src/domain`, with authored data under `src/content`. These import nothing from Three.js, IWSDK or the browser.
2. One object, `GameSession`, is the only way in: `apply(command)`, `tick()`, `drainEvents()`, and a read-only `view`.
3. One ECS system, the Game Director, is the only caller of `apply` and `tick`. It runs at a fixed place in the frame, after input adapters and before presentation.
4. The domain advances in fixed steps of 50 ms from an accumulator, at most five per frame.
5. Presentation systems receive events and the view. They are never given the session.

## Reasons

- **Testability.** Hundreds of rule tests and an exhaustive state-space exploration run in Node in seconds, with no emulator.
- **Determinism.** A fixed step and ordered collections make behaviour independent of frame rate, which varies between a desktop and a headset and under load.
- **Containment of SDK risk.** The SDK is young and its documentation trails its releases. Confining it to adapters and views means a wrong assumption or an upgrade touches a thin layer.
- **A single writer.** With one caller there is no question about the order in which rules run within a frame.
- **Reproducible bugs.** A starting state and a command list replay any rules bug exactly.

## Why 50 ms

The fastest rule-relevant duration is the 1.5 s threshold crossing; the tightest input timing is the 0.25 s loss grace, which is handled in the adapter on frame time, not on ticks. Twenty ticks per second resolves every authored duration to within one tick and costs almost nothing. Hand-following motion is not tick-bound: drag commands are applied every frame and presentation interpolates.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Game state as ECS components, logic in systems | Cannot be tested without a world; order within a tick is spread across system priorities; relational state such as a graph fits components poorly |
| Variable time step | Behaviour depends on frame rate; replay is inexact |
| Domain driven by its own timer | A second loop competing with the SDK's; forbidden by the brief |
| Rules in presentation callbacks, such as animation-finished | The failure this decision exists to prevent |
| A general-purpose state library | A dependency for what one object does |

## Consequences

- Some data exists twice: socket poses in content for rules, and in the scene for drawing. A startup check keeps them aligned.
- Presentation must interpolate, since rules change at 20 Hz and frames arrive at 72 Hz.
- The domain times things that might seem like animation, such as the settle after a release, so that commit does not wait on presentation.
- Developers used to ECS-first design must resist putting a flag in a component "just for now". An import-graph check enforces the boundary.

## Requirements

REQ-INPUT-007, REQ-STATE-004, REQ-STATE-005, REQ-GRAPH-008, REQ-PLAT-006, REQ-ENEMY-010.
