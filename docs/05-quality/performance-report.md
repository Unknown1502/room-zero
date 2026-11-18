# Performance report (IWER desktop emulator, build analysis)

**Read this first.** Every frame figure below was measured in the IWER emulator, in a managed headless Chromium on a laptop (ANGLE, Intel Iris Xe, Direct3D 11) against the Vite **development server** (unbundled source modules). **None of it is a Quest measurement.** A Quest 3 or 3S has a different GPU, a mobile CPU, a fixed 72 or 90 Hz refresh, stereo rendering and a different memory budget. Draw calls and triangle counts transfer as a *relative* signal only; frame time and heap do not transfer. GPU timer queries are available in this browser, but they time the laptop GPU and are not reported.

Evidence level: **IWER-verified (desktop)**. Quest-tested: **none**.

Reproduce: start the dev server (`npx iwsdk dev up --headless --allow-browser-automation`), then `node tools/rt/perf.mjs <label>`. Raw results: `artifacts/perf-baseline.json` (before) and `artifacts/perf-merged.json` (after). Bundle: `node tools/bundle-report.mjs <label>` writes `artifacts/bundle-<label>.json`.

## 1. What was changed, and why

The baseline showed **806 draw calls on the title and foyer views and 1064 during room transitions**, for 30 to 53 thousand triangles: many tiny meshes, one draw call each. On a headset each draw call is submitted once per eye. The only change made for performance is a **static merge** (`src/world/merge.ts`, unit-tested in `tests/unit/merge.test.ts`): inside each room, opaque meshes that share one of the sixteen shared standard materials become one mesh per material. Transparent materials, basic (emissive and text) materials, instanced meshes, hidden objects and everything the view animates (door glows, fanlight, office lamp, the card, the pigeonhole) are left alone, and the grips, lamps and the Surveyor are built separately after the merge. Geometry is baked in room space, so rooms still move as whole groups.

## 2. Before and after (IWER desktop, development server)

Eight-to-forty-second windows per scenario while the real game runs. Frame times are the interval between the game's own view updates; the browser caps at 60 Hz, so a perfect run reads about 16.7 ms.

| Scenario | Draw calls p50, before → after | Triangles p50, after | Render CPU submit p50, before → after (ms) | Frame p95, before → after (ms) | fps, before → after |
|---|---|---|---|---|---|
| Title | 806 → 230 | 49 810 | 8.8 → 3.9 | 18.1 → 17.5 | 59.7 → 60.0 |
| Foyer, idle | 804 → 226 | 49 714 | 8.7 → 3.8 | 18.0 → 17.6 | 59.9 → 60.1 |
| Seam manipulation | 554 → 154 | 46 202 | 7.1 → 2.7 | 17.9 → 17.6 | 57.2 → 60.1 |
| Room transitions (hops) | 1064 → 350 | 57 696 | 9.0 → 4.1 | 22.9 → 17.5 | 55.1 → 60.1 |
| Surveyor listening | 712 → 248 | 42 140 | 9.6 → 4.6 | 17.8 → 18.7 | 59.7 → 54.8 (*) |
| Surveyor approaching | 718 → 254 | 42 212 | 10.2 → 5.2 | 20.6 → 17.6 | 58.4 → 60.1 |
| Encounter, bridge swing | 842 → 378 | 47 044 | 10.4 → 5.6 | 21.2 → 17.6 | 57.0 → 60.0 |
| Several effects (final puzzle) | 420 → 244 | 38 240 | 6.6 → 4.0 | 17.6 → 17.6 | 60.0 → 60.0 |
| Final sequence (ending) | 248 → 178 | 33 364 | 5.3 → 3.4 | 17.5 → 17.5 | 60.1 → 60.0 |

(*) One run of "Surveyor listening" after the change contains a single 209 ms frame (p99 60 ms) that is not present in the baseline of that scenario; the other eight scenarios have a maximum frame of 40 ms or less after the change. It was not reproduced in the second scenario that uses the same state ("approaching", max 37 ms). Treated as an unexplained emulator or browser hitch, not as a result; it is reported rather than filtered out.

Other figures, unchanged by the merge: 25 shader programs, 16.9 MB of estimated texture memory (30 to 41 textures), no long tasks (over 50 ms) in any window, no shader-compile stall seen in a hop or encounter window. Per-system CPU in the same windows: `world.update` (all systems together) p50 1.1 to 1.5 ms, p95 1.5 to 2.6 ms; the draw-call submit is the largest single item and is the one that fell.

Interaction latency (seam grip drawn at the new hand position after the emulated hand moves): median 1 frame (about 16 ms), maximum 1 frame, 12 samples. This includes up to one animation-frame interval of measurement granularity.

**JavaScript heap.** The emulator page reported 0.8 to 1.2 GB of used heap, with 7 to 72 drops of more than 512 KB per window. This is the development server with source modules, the emulator, the test harness and screenshots in one tab. It is not an estimate of what the game needs on a Quest, and no leak analysis was done; a flat-heap soak test on a headset is still open.

## 3. Bundle (production build, `vite build`)

| | Raw | Gzip |
|---|---|---|
| Entry chunk (loads at startup) | 2 444.6 KB | 676.4 KB |
| Everything, JavaScript | 3 222.9 KB | 960.3 KB |
| Lazy chunks, dynamic imports outside the start-up path (text-rendering worker 445 KB, a 197 KB worker, world initializer 53 KB, others; whether each is requested at run time was not checked) | 730 KB | 269 KB |
| Audio (31 generated WAV files, loaded on first use) | 2 348.9 KB | not compressed |
| Whole build | 5 582 KB | |

Where the entry chunk comes from (rendered size, before minification): `three` 2 513 KB, `@iwsdk/core` 854 KB, `@iwsdk/xr-input` 853 KB, `@pmndrs/uikit` 711 KB (264 KB in the entry chunk), `zod` 262 KB, `@iwsdk/locomotor` 245 KB (48 KB in the entry chunk), `uikit-horizon` 181 KB, `three-mesh-bvh` 177 KB, `yoga-layout` 131 KB, `@iwsdk/scene-composition` 130 KB. **The game's own code is about 124 KB** (domain 45, app 41, world 38). There are no duplicate package copies, and no emulator or development hook code in the production bundle (checked by RT-23).

After the static merge was added the entry chunk is 2 446.1 KB raw and 677.0 KB gzip (+1.5 KB, `artifacts/bundle-after.json`; before: `artifacts/bundle-before.json`). **No size reduction was made.** The entry chunk is dominated by the SDK and its transitive imports (UI toolkit, layout engine, schema validation) that the game does not use but cannot drop without importing SDK internals, which is exactly the kind of change this project was told not to risk this close to the deadline. Splitting vendor code into its own chunk would help browser caching between releases and nothing else, and was not done. A headset start-up time and memory figure for a 2.4 MB script is not known.

## 4. What is still unknown

- Quest 3 and 3S frame time, GPU time, thermal behaviour and memory. The official minimum is 60 FPS on supported hardware; this report cannot say whether that is met.
- Per-eye cost: 226 draw calls at the foyer is roughly twice that in stereo, which is moderate for a Quest 3 and not proven acceptable.
- Start-up time from a cold cache over a real network.
- Whether the 209 ms hitch above is a game, browser or emulator event.
- A long-session heap trend.
