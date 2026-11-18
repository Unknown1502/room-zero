# Interaction test matrix

Runtime tests under IWER, driven by the SDK command-line tool. They check that the application wiring is right: SDK input reaches the domain, and the domain reaches the screen and speakers.

## How they run

- The managed dev server is started headless. The emulator device is the Quest 3 profile.
- Hands are driven with the tool's `xr` actions: `set-input-mode` to hands, `run-sequence` for reach, pinch, carry and release, `set-select-value` for holding a pinch, `set-connected` to remove a hand, `enter` and `exit` for the session.
- Determinism where needed comes from the tool's `ecs pause` and `ecs step`, which advance frames with a fixed time step.
- Assertions read a development-only `DebugState` component that mirrors the domain view: seam phases and detents, open edges, player vantage, Surveyor room and state, game state. Tests assert on that, and on entity transforms from `ecs query`, in preference to screenshots.
- A screenshot is saved for each test as a record, not as the assertion.

The command names above were read from the tool's help output. Their behaviour with our scene is itself tested at M0 (assumption A10 in `iwsdk-verification.md`).

**These tests cannot show** that real hands track well, that reach is comfortable, or that the frame rate is adequate on a headset. Each row says what its headset counterpart is.

## Matrix

The matrix is not yet complete. The recorded 2026-11-17 IWER capture passed RT-02 through RT-14 and RT-16 through RT-24 (22 of 24 rows); RT-01 and RT-15 have no result in that capture. A targeted M5 gate has run twice under an active IWER Quest 3 emulation. It checks both hand input sources, fingertip settings, the two-second restart and settings retention, 30/45 degree snap turns with a fixed head position, the reference chapter route and ending, and error-card retry. A separate manual tracked-hand run completed the chapter through the real scene, including Room Zero letter delivery.

The RT runner drives IWER hand devices with authored reach, pinch, carry, release and ray-select sequences. That is useful functional automation, but it is not a human completion and is never counted as one of the required fresh-profile manual playthroughs. Setup that jumps to a checkpoint is listed as a precondition; the action under test is not set up that way. The reference route drives the real `GameSession` with its canonical test driver; the error card uses an injected development failure. These checks do not replace RT-01, RT-15, three fresh-profile completions, or physical-hand comfort testing. Current evidence boundaries are recorded in `../07-delivery/verification-status.md` and `runtime-test-results.md`.

Live evidence: [`m5-live-audit.json`](../../artifacts/m5-live-audit.json), produced by `npm run test:runtime`; the error-card visual is [`m5-error-card.png`](../../artifacts/m5-error-card.png).

| ID | Test | Steps | Expected | Headset counterpart |
|---|---|---|---|---|
| RT-01 | Enter XR | Load page; `xr enter` | Session active; game state Title; envelope present | HQ-01 |
| RT-02 | Exit and re-enter | Reach `cp-stairhead`; `xr exit`; `xr enter`; continue | Title offers continue; state equals the checkpoint snapshot | HQ-07 |
| RT-03 | Hands available | Set input mode to hands | Two hand input sources; no hands card. With hands disconnected: hands card appears | HQ-01 |
| RT-04 | One-hand grab | At `v-foyer-door`, pinch the travel grip with the right hand; repeat with the left | `Grabbed` on the grip; domain seam phase `held`; holder hand correct | HQ-02 |
| RT-05 | Two-hand grab | At `v-stair-head`, pinch travel grip alone; then anchor with one hand and travel with the other; then swap hands | First: refused with `Latched`. Then: `held`. Works with roles swapped | HQ-03 |
| RT-06 | Seam movement | Hold the travel grip and move the hand along the rail in five steps, then beyond its end | Seam `param` follows in step and clamps at 1; module transform follows within the speed cap; grip stays on the rail | HQ-02 |
| RT-07 | Snap acceptance | Move to within the snap window of a detent; release | Seam settles to the detent within 0.8 s; edge appears in the open list; lamp for the next vantage is lit | HQ-06 |
| RT-08 | Snap rejection | Move to mid-rail; release. Also: landing seam released at its half-way detent | Returns to the committed detent; open edges unchanged. Half-way: rests, no edge | HQ-06 |
| RT-09 | Blocked path | At `v-ceast-end` with the lift at corridor level, pull the arm lever | `param` stops at the block; `SeamBlocked` raised; release returns it | HQ-06 |
| RT-10 | Hop | Point the hand ray at a lit lamp; pinch. Then at an unlit lamp | Fade; player rig at the new vantage anchor; domain vantage updated. Unlit: nothing | HQ-06 |
| RT-11 | Hand loss during a move | Hold mid-rail; disconnect that hand for 0.1 s and reconnect; then disconnect for 1 s | Short loss: hold continues. Long loss: released; returns unless within a snap window | HQ-05 |
| RT-12 | Pause and resume | During a hold with the Surveyor walking, make the session not visible; wait; make it visible | Grip released with return; tick count unchanged while hidden; Surveyor in the same place | HQ-07 |
| RT-13 | Restart | Press and hold the begin-again seal for 2 s mid-chapter | State equals initial; settings kept | HQ-06 |
| RT-14 | Surveyor follows the graph | Scripted encounter with ECS stepping: let it approach; swing the bridge; let it enter the office; swing back | Swinging while it is in `c-east`: its room sequence is `den`, `c-east`, `bridge`, `dead-letter`; counts 3 on waking, 2 on entering `c-east`, 2 after the swing, 1 on entering `bridge`; no-route signal after the seal; ends Searching in `dead-letter`. A variant swings while it is on the bridge and expects Blocked for the block time before it replans. In both, its drawn position is always inside the room the domain reports | HQ-06, HQ-08 |
| RT-15 | Full chapter | The reference solution from `first-chapter.md` section 10 as one script | Each checkpoint in order; ChapterComplete reached; no errors in the console | HQ-06 |
| RT-16 | Envelope seals | Turn the letter over; press each seal with a fingertip | Settings change in the domain and persist across reload | CF-07 |
| RT-17 | Controllers | Switch input mode to controllers; grab with squeeze, hop with trigger | Same outcomes as RT-04, RT-07, RT-10 | none required |
| RT-18 | Save and reload | Reach `cp-landing`; reload the page; continue | Seam detents, edges and vantage match the checkpoint | HQ-07 |
| RT-19 | Corrupt save | Write a malformed record, then one with a mismatched edge list, then an unknown checkpoint; load each | Other slot, then canonical snapshot, then new game; notice shown once; no exception | none required |
| RT-20 | Audio state | Step through Surveyor state changes | The matching audio source reports playing within 0.5 s of each change; resumes after pause | HQ-08 |
| RT-21 | The letter | Release the letter mid-air; then at the pigeonhole in Room Zero; then at the pigeonhole position without being in Room Zero | Returns to the strap; delivered and ending starts; not delivered | HQ-06 |
| RT-22 | Lamps and scene join | For twenty seam configurations, compare lit beacons with the domain's reachable set; run the startup join check; check every station's grips against the reach envelope of its anchor | Identical sets; join check passes; all grips in the envelope | HQ-04 |
| RT-23 | Unsupported platform, refused session and production build | Serve the production build from a subpath with the emulator disabled. Separately, under the emulator, make the session request fail | Page explains that a headset browser is needed; no emulator code injected; no request to another origin. On a refused session: message and a working retry | HQ-01 |
| RT-24 | Error boundary and asset failure | Development hook throws inside a tick. Separately, block one critical asset request, then one background asset request | Ticking stops; error card shown; restart returns to Title. Critical asset: the page reports it and retry works. Background asset: play continues | none required |

## Coverage of the brief's list

| Item in the brief | Tests |
|---|---|
| Enter and exit XR | RT-01, RT-02 |
| Hand availability | RT-03 |
| One-hand grab | RT-04 |
| Two-hand grab | RT-05 |
| Seam movement | RT-06 |
| Snap acceptance | RT-07 |
| Snap rejection | RT-08, RT-09 |
| Connection graph update | RT-07, RT-22 |
| Puzzle state | RT-15, and UT-PUZ-01 to UT-PUZ-06 |
| Surveyor navigation | RT-14 |
| Hand tracking loss | RT-11 |
| Pause and resume | RT-12 |
| Restart | RT-13 |
| Full chapter | RT-15 |

## The first test of all (M0)

Before any level exists: one fixed room, one moving room, one seam with two detents, one socket on each. RT-01, RT-03, RT-04, RT-06, RT-07 and RT-08 are written against that scene. If they cannot be made to pass under IWER, the hand interaction plan changes before anything else is built.
