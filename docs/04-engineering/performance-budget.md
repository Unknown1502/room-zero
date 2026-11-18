# Performance budget

Budgets for Quest 3 in the Quest Browser. Requirement IDs are in the SRS; measurement is in `05-quality/performance-test-plan.md`.

## 1. Where the numbers come from

| Kind | Numbers | Source |
|---|---|---|
| Frame budgets | 16.6 ms at 60 Hz, 13.7 ms at 72 Hz, 11.1 ms at 90 Hz | Meta's WebXR performance workflow guide |
| Logic guideline | Application logic taking more than 2 ms deserves optimisation | Same guide |
| Render scale | 0.8 to 0.9 framebuffer scale only as a last resort | Same guide |
| Draw calls, triangles, texture memory, download size | The figures below | **Project budgets chosen by us** as conservative starting points for a mobile GPU in a browser. Meta's guide gives no fixed limits. They are to be revised once M0 and M3 give real measurements |

Nothing in this document has been measured. Every figure is a budget, not a result.

## 2. Frame targets

| Target | Value | Requirement |
|---|---|---|
| Display rate requested | 72 Hz | REQ-PERF-001 |
| Frames within 13.7 ms | at least 95% | REQ-PERF-001 |
| Frames within 16.6 ms | at least 99% | REQ-PERF-001 |
| Release blocker | Any 5 s window averaging over 16.6 ms | REQ-PERF-002 |
| 90 Hz | Not a target. If the slice has headroom at M7 it can be tried | |

The SDK's notes show the frame rate being requested on the XR session and foveation set on the renderer when the session becomes visible. Both calls are to be confirmed at M0 (Q-10).

## 3. Frame time split at 72 Hz

| Slice | Budget |
|---|---|
| SDK systems: input, grab, transforms, audio | 2.0 ms |
| Our systems, all together | 2.0 ms at the 95th percentile (REQ-PERF-006) |
| of which: adapters | 0.2 ms |
| of which: Game Director and domain ticks | 0.4 ms (one tick 0.3 ms or less) |
| of which: presentation and audio director | 1.4 ms |
| Render submission on the CPU | 4.0 ms |
| Browser and compositor overhead | 2.0 ms |
| Headroom | 3.7 ms |
| **Total** | **13.7 ms** |

GPU time must fit the same 13.7 ms in parallel. With baked lighting and no post-processing the expected limit is fill rate from transparent surfaces and resolution, which is why transparency is rationed.

## 4. Scene budgets, per frame at any vantage

| Item | Budget | Requirement | How it is kept |
|---|---|---|---|
| Draw calls | 120, aiming for 80 | REQ-PERF-003 | Rooms merged by material; kit parts and void rooms instanced; per-vantage visibility sets |
| Triangles | 300,000, aiming for 200,000 | REQ-PERF-004 | House-scale surfaces are simple; detail is at courier scale; far Surveyor mesh |
| Skinned meshes | 1, plus the SDK's two hands | | |
| Dynamic lights | 2, unshadowed | | Baked lighting |
| Real-time shadow maps | 0 | | Blob or contact shadow |
| Transparent draw calls | 12 | | Lamp glass, partition, fanlights, dust, fade |
| Particles | 150 quads in view | | Dust only in lamp pools |
| Post-processing passes | 0 | | |
| Materials in view | 20 | | Shared library |

Indicative split of draw calls at the busiest vantage (`v-cwest-end` during the encounter): current room 12; adjacent rooms 20; far rooms 10; fittings 10; Surveyor 2; hands 4; letter 1; void rooms 1; effects and feedback 8; fade 1. About 70.

## 5. Memory and download

| Item | Budget | Requirement |
|---|---|---|
| GPU texture memory | 256 MB | REQ-PERF-005 |
| Lightmaps, compressed | 12 MB | |
| Geometry in memory | 30 MB | |
| JavaScript heap in steady state | 150 MB | |
| Heap growth over ten restarts | 5 MB | REQ-REL-002 |
| Total download | 60 MB | REQ-PERF-005 |
| Critical download before the title | 25 MB | REQ-PERF-005 |
| Time to an enabled Enter VR button | 10 s at 50 Mbit/s | REQ-PERF-010 |

Textures are GPU-compressed. A 2K texture with mipmaps is about 5.6 MB in a block-compressed format at 8 bits per pixel, against about 22 MB uncompressed, which is why uncompressed textures are not allowed to ship.

## 6. Hitches

| Cause | Guard | Requirement |
|---|---|---|
| Shader compilation on first use | Draw every material once behind the fade in ChapterIntro | REQ-PERF-008 |
| Texture upload on first use | Same; the SDK has a deferred upload facility to evaluate | REQ-PERF-008 |
| Garbage collection | No allocation in any system's update; reused event buffer and view; pooled audio | REQ-PERF-007 |
| Animation or audio decode | Decode during load | |
| Local storage write | Under 8 KB, at checkpoints only | |
| Blocked-stretch computation | Cached; precomputed for all configurations at load if a single computation exceeds 1 ms | REQ-PERF-006 |

No frame after ChapterIntro may exceed 30 ms for these reasons.

## 7. Interaction latency

| Path | Budget | Requirement |
|---|---|---|
| Hand moves to grip drawn at the new place | Next frame | REQ-PERF-009 |
| Hand moves to room visibly responding | Within 2 frames; the room's lag after that is deliberate | REQ-PERF-009 |
| Release to settle started | Next frame | |
| Commit to feedback | Same frame as the commit tick | |
| Pinch on a lamp to fade starting | Next frame | |

Tracking latency itself is the platform's and is not ours to budget.

## 8. Degradation ladder

If measurements miss the target, apply in this order and stop when the target is met. Each step is a recorded decision.

1. Tighten visibility sets; hide rooms that contribute little.
2. Reduce void rooms and dust.
3. Lower lightmap and texture resolution on house-scale surfaces.
4. Remove transparent surfaces: opaque lamp glass, a mullioned partition without glazing.
5. Use the far Surveyor mesh at all distances.
6. Raise foveation.
7. Reduce framebuffer scale to 0.9.
8. Target 60 Hz. This is the floor: sustained performance below it blocks release.

## 9. Evidence table

Every budget gets two columns of evidence, kept apart (REQ-PERF-011). The emulator column is useful for catching regressions between builds on the same machine. It says nothing about the headset.

| Budget | IWER on a desktop | Quest 3 |
|---|---|---|
| Frame time percentiles | Not measured | Not measured |
| Draw calls per vantage | Not measured | Not measured |
| Triangles per vantage | Not measured | Not measured |
| Texture memory | Not measured | Not measured |
| Our systems' update time | Not measured | Not measured |
| Domain tick time | Not measured | Not measured |
| Garbage collection pauses | Not measured | Not measured |
| Worst hitch after intro | Not measured | Not measured |
| Interaction latency | Not measured | Not measured |
| Load time and size | Not measured | Not measured |

Draw calls and triangles are properties of the scene and the vantage, so the emulator's figures for those two are expected to match the headset's and can be gated in automated tests. Everything involving time must come from hardware.
