# Asset register

Every asset the chapter needs, with its budget and provenance. The tables below began as a production plan; the implementation snapshot below records what is actually present in the current build. No asset ships without an attributable source (REQ-ART-001, INS-04).

## Implementation snapshot — 2026-11-18

| Family | Implemented source | Current status |
|---|---|---|
| Architectural kit, doorway profiles, grips, lamps and room dressing | `src/world/kit.ts`, `src/world/build.ts` | Procedural meshes, shared materials and deterministic canvas textures generated at runtime. No external model or bitmap texture files are required by the chapter. |
| Surveyor | `src/world/surveyor-model.ts` | Procedural original mesh with code-driven idle, walk, measure, brace, plumb, search and ending poses. It is not a downloaded character asset. |
| Letter, seals, settings and ending cards | `src/app/game.ts`, `src/world/kit.ts` | Canvas textures generated from project text and system font stacks; no bundled font file is required. |
| Audio | `tools/make-audio.mjs`, `public/audio/*.wav` | 31 local WAV files generated and included in the build. They do not require a network request beyond the hosted app itself. Human listening validation remains open. |
| Third-party runtime | `package.json`, lockfile | IWSDK, Three.js (via `super-three`) and UIKit packages are runtime dependencies, not art assets. Their licence review remains a release gate. |

This establishes the technical source of the shipped art and audio in the repository. It does not establish title clearance, a third-party licence audit, headset legibility, physical Quest performance, or human visual/audio review; those remain release gates.

Sources allowed: made in-house; commissioned with rights assigned; or licensed under terms that permit commercial use and redistribution in a web build, with the licence text kept in the repository. Asset catalogues bundled with development tools are checked against this rule like any other source before use.

Budgets are per asset and roll up into `04-engineering/performance-budget.md`.

## Architecture kit

| ID | Asset | Triangles | Textures | Source |
|---|---|---|---|---|
| ENV-01 | Wall bay set (plain, dado, fanlight, glazed) | 300 to 1,500 each | Shared oak, plaster, wallpaper | In-house |
| ENV-02 | Doorway bays: arched, square, with seam and threshold plates | 2,000 each | Shared + brass | In-house |
| ENV-03 | Round port | 1,200 | Brass, iron | In-house |
| ENV-04 | Floors: tile, board | 2 to 200 per bay | Tile, oak | In-house |
| ENV-05 | Ceiling and cornice | 400 per bay | Plaster | In-house |
| ENV-06 | Stair flight with runner and rods | 6,000 | Oak, fabric, brass | In-house |
| ENV-07 | Outer shell panels | 200 each | Lath | In-house |
| ENV-08 | Rails, chains, counterweights, carriage, pivot drum, crane arm | 8,000 in total | Iron | In-house |
| ENV-09 | House-scale dressing set (radiator, stands, console table, frames, sorting frame, sacks) | 15,000 in total | 1 atlas, 2K | In-house or licensed |
| ENV-10 | Void rooms (distant) | 12 each, instanced | 1 small atlas | In-house |

## Courier-scale fittings

| ID | Asset | Triangles | Textures | Source |
|---|---|---|---|---|
| FIT-01 | Grip, anchor grip, latch, latch pin | 1,500 in total | Hand brass, 1K | In-house |
| FIT-02 | Rails: straight, arc, ratchet lever, rope haul | 2,500 in total | Hand brass | In-house |
| FIT-03 | Signal lamp and bracket | 800 | Hand brass + glass | In-house |
| FIT-04 | Turn-marker | 150 | Hand brass | In-house |
| FIT-05 | The envelope, the card, seals, postmark stamps | 300 | 1 atlas, 2K | In-house |
| FIT-06 | Glove and cuff material for the SDK hand | SDK mesh | 1K | In-house, if the SDK permits |

## Room Zero

| ID | Asset | Triangles | Textures | Source |
|---|---|---|---|---|
| RZ-01 | Shell with round door and window | 3,000 | Atlas A, 2K | In-house |
| RZ-02 | Bed, desk with pigeonholes, chair, stove and kettle, coat and hook, rug, lamp | 18,000 in total | Atlas A | In-house or licensed |
| RZ-03 | Stack of envelopes (variants by postmark) | 600 | FIT-05 atlas | In-house |

## Character

| ID | Asset | Budget | Source |
|---|---|---|---|
| CH-01 | Surveyor mesh, near | 12,000 triangles, about 40 bones | In-house or commissioned |
| CH-02 | Surveyor mesh, far (beyond 25 m) | 3,000 triangles | Derived from CH-01 |
| CH-03 | Surveyor textures | 1 set, 2K | In-house or commissioned |
| CH-04 | Animation clips, 12 (minimum 7) | See `animation-style.md` | In-house or commissioned |
| CH-05 | Tape, plumb line and bob, pencil | 600 triangles | In-house |

## Materials and lighting

| ID | Asset | Size | Source |
|---|---|---|---|
| MAT-01 | Tiling sets: oak, plaster, wallpaper, tile, fabric, lath | 1K each, 6 sets | In-house, or licensed scans retouched |
| MAT-02 | Shared sets: tarnished brass, iron, paper | 1K each | In-house |
| MAT-03 | Lightmaps, one per lit room | 1024 or 512; under 12 MB in total | Baked in-house |
| MAT-04 | Environment lighting | The SDK's gradient components; no file | n/a |
| MAT-05 | Dust sprite, light-shaft card, blob shadow, ring-of-light mask | 1 small atlas | In-house |

## Audio

| ID | Group | Files | Source |
|---|---|---|---|
| AUD-01 | Surveyor: knock (4 variants), tape (rasp, long draw, pulse), pencil, plumb (pay-out, tick), steps (6), strain, measure bursts (3) | 20 | Recorded in-house |
| AUD-02 | Seams: grind layers (3), thud (3), groan (2), block, clank, latch rattle, latch clack, ratchet, chain | 14 | Recorded in-house or licensed |
| AUD-03 | Fittings: brass ring, lamp pop, lamp hiss, tick | 4 | Recorded in-house |
| AUD-04 | Letter: paper (3), stamp, pen scratch, wax tick, wax crack | 7 | Recorded in-house |
| AUD-05 | Player: glove creak (2), cloth and footfall (2) | 4 | Recorded in-house |
| AUD-06 | World: room tone (2), void air, letterbox flap, lock turning, house-closing bed | 6 | Recorded in-house or licensed |
| AUD-07 | Music: body bed, Room Zero chord, title phrase | 3 | Composed in-house |

About 58 files; target under 6 MB.

## Fonts and marks

| ID | Asset | Source |
|---|---|---|
| TXT-01 | The courier's handwriting | Written by hand for the project and scanned into the envelope texture. No font file ships |
| TXT-02 | The second hand (ROOM 1) | As above, by a different writer |
| TXT-03 | Postmark lettering | Drawn for the project |
| TXT-04 | Web page type | System fonts only |

Handwriting is baked into textures so that no font licence is needed in the build. Hint lines are pre-written as textures for the same reason, one per line.

## Third-party runtime components

Not art, but recorded here for licence completeness. To be completed from the lockfile at M0.

| Component | Licence to confirm |
|---|---|
| `@iwsdk/core` and its packages | MIT, per the headers in the generated starter |
| Three.js (as `super-three`) | To confirm from the package |
| Other transitive runtime dependencies | To list and confirm at M0 (INS-07) |

## Totals against budget

| | Planned | Budget |
|---|---|---|
| Unique triangles authored | About 75,000 plus kit | n/a; visible triangles are budgeted per vantage |
| Texture sets | About 14, mostly 1K, four at 2K | 256 MB GPU memory |
| Lightmaps | Under 12 MB compressed | Included above |
| Audio | Under 6 MB | Included in download |
| Total download | Estimate 35 to 45 MB | 60 MB |

These are planning figures. They become measurements at M6 (PF-02, PF-03, PF-08).
