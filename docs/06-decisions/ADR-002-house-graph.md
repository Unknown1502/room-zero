# ADR-002: A domain-owned house graph is the single authority on connectivity

Status: accepted, 2026-11-16.

## Context

The player rearranges rooms. Three things need to know which rooms are connected: the player's movement, the puzzles and the enemy. Connectivity could be inferred from where meshes are, held separately by each consumer, or held once.

## Decision

Connectivity is held once, as a graph in the gameplay domain. Nodes are room modules. Edges are mated socket pairs. The graph is a pure function of the seams' committed detents and the chapter's flags. Rendering, audio, movement, puzzles and the enemy all read it. Nothing else decides whether two rooms are connected.

## Reasons

- **One truth.** If the player can hop through a doorway, the Surveyor can walk through it, and the puzzle counts it, because all three read the same edge.
- **Testable without a renderer.** The graph, and everything built on it, runs in Node.
- **Deterministic.** Detent indices in, graph out. No dependence on animation timing or floating-point drift in transforms.
- **Enumerable.** Six seams give 288 configurations. Every one can be validated and explored.
- **Presentation can be wrong safely.** If a mesh is misplaced, the game still behaves correctly and the error is visible as a mismatch, not a rules bug.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Infer connections from Three.js world positions each frame | Couples rules to rendering and animation; non-deterministic at the tolerance boundary; untestable without a scene |
| A navigation mesh rebuilt when rooms move | Heavy at run time; the enemy needs room-level routing, not polygon-level; no SDK support found for dynamic navmeshes |
| Physics triggers at doorways | Requires the physics feature; fires on animation, not on rules; order of events is not controlled |
| Each system keeps its own connectivity | Three truths that will disagree |

## Consequences

- Socket poses must be authored in the domain's content as well as drawn in the scene. A startup check and content validation keep the two consistent.
- Rooms can rest only where the content defines detents. Free placement is impossible by construction; see ADR-003.
- The graph is recomputed on every commit. With twelve candidate pairs this costs nothing measurable.
- A debug view that draws the graph over the scene is needed early.

## Requirements

REQ-GRAPH-001 to REQ-GRAPH-008, REQ-ENEMY-002, REQ-PUZZLE-005, REQ-UX-004.
