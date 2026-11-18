# Performance test plan

How the budgets in `04-engineering/performance-budget.md` are measured. Meta's WebXR performance workflow guide is the method reference.

## 1. Rules of evidence

1. A performance claim about the headset is made only from a measurement on the headset (REQ-PERF-011).
2. Every result records: headset model and system version, browser version, build identifier, content version, display rate, foveation level, and where in the chapter it was taken.
3. Emulator results are recorded in their own column. They are used to compare builds on the same machine and to gate scene counts. They are never quoted as device performance.
4. A result is the worst of three runs, not the best.

## 2. Tools

| Tool | For | Note |
|---|---|---|
| OVR Metrics Tool on the headset | Frame rate, frame time, stale frames, CPU and GPU utilisation as an in-headset overlay | Named in Meta's guide |
| Browser tracing through remote inspection of the Quest Browser from a desktop | Where time goes in application code; garbage collection events | Named in Meta's guide |
| RenderDoc for Meta devices | Single-frame capture: draw call list, order, overdraw | Named in Meta's guide |
| The renderer's own counters | Draw calls and triangles per frame | Read in a development overlay and in automated tests |
| In-app timers using the performance API | Our systems' update time and the domain tick time, as percentiles over a run | Development builds only |
| Meta's two diagnostic experiments | CPU or GPU bound: disable rendering and compare. Vertex or fragment bound: drop render scale very low and compare | From Meta's guide |

Availability and exact procedure of each tool on current headset software is to be confirmed when a headset is in hand.

## 3. Reference scenarios

Each test is run at these points, chosen as the heaviest:

| Scenario | Why |
|---|---|
| S1 `v-foyer-start`, idle | Largest room; baseline |
| S2 `v-stair-head`, landing in motion | Largest moving module across the void |
| S3 `v-landing-east`, Turning Room rotating | Rotation in view; most sockets visible |
| S4 `v-cwest-end`, Surveyor approaching, bridge swinging | Longest sight line; character; moving module; busiest audio |
| S5 `v-ceast-end`, lift and arm | Two stations; Room Zero close |
| S6 `v-zero`, ending | Densest courier-scale detail; Surveyor at its closest; void rooms moving |
| S7 The reference playthrough end to end | Hitches, garbage collection, memory growth |

## 4. Tests

Result columns are "not run" for both environments.

| ID | Measures | Method | Pass | Requirement |
|---|---|---|---|---|
| PF-01 | Frame time distribution | Headset overlay and a trace during S1 to S6, 60 s each, and S7 | 95% of frames within 13.7 ms; 99% within 16.6 ms; no 5 s window averaging over 16.6 ms | REQ-PERF-001, REQ-PERF-002 |
| PF-02 | Draw calls and triangles | Renderer counters at every vantage, with every seam at every detent that changes visibility. Automated under IWER; spot-checked on the headset | 120 draw calls and 300,000 triangles or fewer everywhere | REQ-PERF-003, REQ-PERF-004 |
| PF-03 | Texture and total memory | Sum of loaded texture sizes from the asset manifest and renderer; heap from a trace | 256 MB GPU textures or less; heap steady | REQ-PERF-005 |
| PF-04 | Application logic time | In-app timers round each of our systems and round `tick`, percentiles over S7 | Systems together 2.0 ms or less at the 95th percentile; one tick 0.3 ms or less | REQ-PERF-006 |
| PF-05 | Allocation and garbage collection | Trace during S4 and S7; allocation sampling under IWER to find sources | No collection pause over 4 ms; no steady allocation from our systems' updates | REQ-PERF-007 |
| PF-06 | Hitches | Longest frame after ChapterIntro across S7, three runs; note the cause of each frame over 20 ms | None over 30 ms | REQ-PERF-008 |
| PF-07 | Interaction latency | Under IWER with ECS stepping: frames from a hand transform change to the grip's drawn change. On the headset: high-frame-rate video of hand and grip as a sanity check | Next frame | REQ-PERF-009 |
| PF-08 | Load | Size of the production build by category; critical size; time to an enabled Enter VR button on the headset on a measured connection | 60 MB total; 25 MB critical; 10 s at 50 Mbit/s | REQ-PERF-005, REQ-PERF-010 |
| PF-09 | Soak and restart | Ten restarts in one session, then 30 minutes idle at S4 with the Surveyor patrolling; heap before and after | Heap growth 5 MB or less; frame time unchanged | REQ-REL-002 |

## 5. When

| Milestone | What is measured |
|---|---|
| M0 | PF-01 and PF-07 on the one-seam scene, if a headset is available. This gives the cost of the SDK's baseline before we add anything |
| M3 | PF-02 automated in the test run and gated from here on. PF-04 timers in place |
| M5 | PF-01, PF-04, PF-05 on graybox for S1 to S7. Graybox is cheaper than final art, so a miss here is serious |
| M6 | All tests as art arrives, per room |
| M7 | All tests, three runs each, on the release build. Results entered in the evidence table |

## 6. If a test fails

1. Find out whether the frame is CPU or GPU bound with Meta's first experiment.
2. If GPU bound, find out whether it is vertex or fragment bound with the second.
3. CPU bound: look at our systems' timers first, then draw-call count.
4. Fragment bound: transparency and overdraw, then foveation, then resolution.
5. Vertex bound: triangle count in view, the Surveyor's mesh, visibility sets.
6. Apply the degradation ladder in `performance-budget.md` section 8, one step at a time, re-measuring after each.

## 7. Without a headset

PF-02 and PF-07's emulator half, PF-03's size sums, PF-04 and PF-05 under IWER, and PF-08's size checks can all run. They catch regressions. They do not support any statement about Quest performance, and the evidence table's Quest column stays empty (risk R-14).
