# Documentation index

Baseline 1.0, 2026-11-16. Status of every document: **Specified**.

## How the documents relate

- The **PRD** (`00-product/product-brief.md`) says what the product is and what it is not.
- The **GDD** (`01-game-design/game-design-document.md`) says how it plays. `first-chapter.md` is the beat-by-beat specification of the vertical slice and is the single source for chapter content: rooms, seams, vantages, checkpoints, timings.
- The **SRS** (`04-engineering/software-requirements.md`) is the single source for requirement IDs. Other documents cite IDs and never define new ones.
- The **technical architecture** (`04-engineering/technical-architecture.md`) says how the requirements are met. `domain-model.md` and `data-contracts.md` are its detailed contracts.
- The **traceability matrix** (`05-quality/traceability-matrix.md`) maps every requirement to tests. Test IDs are defined in `05-quality/test-strategy.md`, `interaction-test-matrix.md`, `performance-test-plan.md` and `comfort-test-plan.md`.

When two documents disagree, the order of authority is: SRS for requirements, `first-chapter.md` for chapter content, `domain-model.md` for rules and data, then everything else.

## Canonical vocabulary

| Term | Meaning |
|---|---|
| Module | One movable or fixed section of the house. A node in the house graph |
| Socket | A doorway on a module that can mate with another socket |
| Profile | The shape of a socket's opening: arched, square or round |
| Seam | A one-degree-of-freedom constraint that moves one module along an authored path |
| Detent | An authored resting position on a seam's path |
| Grip | A courier-sized brass handle. A *travel grip* moves a seam; a *brace grip* unlatches it |
| Station | A set of grips at one vantage that operates one seam |
| Vantage | An authored place where the player sits. The player is always at exactly one |
| Beacon | The signal lamp that marks a vantage the player can hop to |
| Hop | A faded move from one vantage to another |
| Commit | The moment a released seam settles on a detent and the graph is recomputed |
| Fresh seam | A connection created by a commit that the Surveyor has not yet measured |
| The count | The knocks the Surveyor makes when it plans a route: one per doorway it must pass |
| Postmark | A checkpoint. It appears as a stamp on the envelope |

## Contents

### 00-product
- `vision.md` — the promise, pillars and anti-goals
- `product-brief.md` — PRD
- `differentiators.md` — what is and is not distinctive, with honest limits
- `competitive-research.md` — neighbouring titles and what we take from each

### 01-game-design
- `game-design-document.md` — GDD
- `gameplay-loop.md` — the loops at three time scales
- `first-chapter.md` — complete vertical slice specification
- `puzzle-design.md` — puzzle grammar and the four puzzles
- `house-graph-rules.md` — designer-facing rules of the graph
- `enemy-surveyor.md` — the Surveyor's behaviour and fairness contract
- `narrative-bible.md` — story, themes, the reveal
- `character-bible.md` — the courier, the Surveyor, the house

### 02-experience-design
- `ux-flow.md` — from URL to ending
- `hand-interaction-spec.md` — grips, rails, snapping, hand loss
- `locomotion-comfort.md` — vantages, hops, comfort rules
- `accessibility.md`
- `onboarding.md`
- `interaction-feedback.md` — the feedback table

### 03-art-and-audio
- `art-direction-bible.md`, `environment-design.md`, `character-design.md`, `materials-and-lighting.md`, `animation-style.md`, `audio-direction.md`, `asset-register.md`

### 04-engineering
- `software-requirements.md` — SRS
- `technical-architecture.md`
- `architecture-diagrams.md` — all Mermaid diagrams in one place
- `system-components.md`, `ecs-design.md`, `domain-model.md`, `data-contracts.md`, `save-schema.md`, `runtime-lifecycle.md`, `performance-budget.md`, `build-architecture.md`
- `iwsdk-verification.md` — what was checked against the SDK, and how

### 05-quality
- `test-strategy.md`, `acceptance-criteria.md`, `interaction-test-matrix.md`, `performance-test-plan.md`, `comfort-test-plan.md`, `risk-register.md`, `traceability-matrix.md`
- Results (written after the code existed): `runtime-test-results.md` (RT-01 to RT-24, IWER), `validation-findings.md` (defects found and fixed, emulator quirks, repeat runs), `performance-report.md` (IWER desktop measurements and bundle analysis; not Quest)

### 06-decisions
- ADR-001 to ADR-008

### 07-delivery
- `implementation-roadmap.md`, `milestones.md`, `definition-of-done.md`, `known-limitations.md`, `verification-status.md`, `judging-readiness-audit.md`, `submission-draft.md`, `unresolved-questions.md`, `documentation-gate-audit.md`
