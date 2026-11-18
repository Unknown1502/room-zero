# Graphics and play-feel pass

Date: 2026-11-18. Evidence: IWER emulator screenshots (before and after, same states), numeric checks, the RT matrix. **Not Quest, not human.** These are art-direction and feedback improvements checked by picture and by number; no one has judged them on a headset.

## What changed

| # | Change | Where | Why | Evidence |
|---|---|---|---|---|
| G1 | **Each room has its own wall colour** on the shared wallpaper texture: warm ivory in the foyer and west corridor and dead-letter office, cool grey on the stair, sage on the landing, cold blue in the east corridor and the den | `src/world/kit.ts` (`tinted`), `src/world/build.ts` | Rooms were one flat kit; the player could not tell where they were, and nothing separated the lived-in side of the house from the Surveyor's side | `before/` and `after/` (`cmp-*.png`), check V9 |
| G2 | **Foyer radiators** are cast iron with brass caps and bands, not two black slabs | `src/world/build.ts` | They read as black monoliths in every foyer screenshot | `cmp-10-vantage-01-v-foyer-start.png` |
| G3 | **The Surveyor's ring glows** (its own material; the shared brass is untouched) | `src/world/surveyor-model.ts` | From the far end of a corridor the figure was a dim shape; the ring is what a player should notice first | `cmp-10-vantage-08-v-ceast-west.png`, check V10 |
| G4 | **A seam that joins something makes the newly reachable lamp pulse** for about 2.5 s (not after an ordinary hop), and the doorway glow is held at full for about a second before it fades | `src/app/game.ts` | The cause-and-effect of the main mechanic: "I moved this, and a new way on lit up" | check V8: pulse 2.4 after the seam, 0 after a hop |
| G5 | (earlier in this session) readable closing title and last-line card, no overlap on the error card, no z-fighting in the lift, in-world prompts for the first actions | see `qa/visual-audit` and `qa/experience-polish` | | |

## Before and after

`before/` and `after/` hold eight states each (foyer start, foyer door, stair head, landing east, west end of the corridor, east corridor west and end, the opened seam). `cmp-*.png` put them side by side; `sheet-compare.png` is four of them. One after-shot (`v-ceast-end`) came out completely black in the first run (a frame taken mid-fade); a re-shoot is clean and is kept as `after2/`, not reproduced since.

## Honest limits

- The tints are subtle by design (multiplied onto the existing texture). A headset display will show them differently from this desktop capture; **not tested**.
- No lighting rig change was made: still one warm light at the seat, a hemisphere light and a moon directional light. A real lighting pass (per-room practicals, light spill through doorways) is not done.
- Materials are still flat procedural textures; no new geometry beyond the radiator bands.
- The Surveyor's shape and animation are unchanged.
- Performance after these changes: see the section below.

## Performance after the pass (IWER desktop emulator, dev server; not Quest)

| Scenario | Draw calls before, after | Frame p50, p95 after (ms) | fps after |
|---|---|---|---|
| Title | 230, 232 | 16.6, 17.2 | 59.9 |
| Foyer, idle | 226, 228 | 16.7, 17.6 | 60.0 |
| Seam manipulation | 154, 156 | 16.6, 17.5 | 60.1 |
| Room transitions | 350, 352 | 16.6, 17.7 | 59.9 |
| Surveyor encounter | 378, 378 | 16.6, 17.4 | 60.0 |
| Final sequence | 178, 178 | 16.6, 17.5 | 60.1 |

The tints and the radiator bands cost two draw calls at most. **A first run of this measurement showed 30 fps and doubled CPU times with the same draw calls and triangles.** The cause was load, not the change: a Playwright MCP browser tab on the production page was still open and rendering the 3D preview beside the emulator. With that tab closed the run above gave 60 fps. Both runs are in `artifacts/perf-graphics.json` history (the second overwrote the first file; the first run's numbers are in this paragraph). The JavaScript heap reported 2.1 GB at the end of a long-lived browser session (1.2 GB in the first baseline); this was **not investigated** and is not a Quest figure, but a flat-heap soak test on a headset is still open.
