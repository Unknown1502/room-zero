# Runtime test results (RT-01 to RT-24)

**Environment:** IWER desktop emulator, Quest 3 profile, IWSDK 1.1.0, headless Chromium. Captured 2026-11-18T16:06:57.721Z.

**Evidence level of every result below: IWER-verified.** Hands are driven through IWER's hand devices (reach, pinch, carry, release, ray select). They are not human hands and not a Quest: tracking quality, comfort, legibility on the headset display, audio as heard, and device performance are untested here. Setup that jumps to a checkpoint is done in the page and is listed as a precondition; the action under test is never set up that way.

Reproduce: start the dev server (`npm run dev:runtime` is not enough; use `npx iwsdk dev up --headless --allow-browser-automation`), then `node tools/rt/run-rt.mjs` (all) or with test IDs. Results are merged by ID into `artifacts/rt-matrix.json`; screenshots are in `evidence/rt/`.

| Result | Count |
|---|---|
| Pass | 24 |
| Fail | 0 |
| Blocked | 0 |
| Not run | 0 |

## Summary

| ID | Test | Result | Evidence |
|---|---|---|---|
| RT-01 | Enter XR | Pass | [RT-01-title-in-xr.png](../../evidence/rt/RT-01-title-in-xr.png) |
| RT-02 | Exit and re-enter | Pass | [RT-02-resumed.png](../../evidence/rt/RT-02-resumed.png) |
| RT-03 | Hands available | Pass | [RT-03-hands-present.png](../../evidence/rt/RT-03-hands-present.png) [RT-03-hands-disconnected.png](../../evidence/rt/RT-03-hands-disconnected.png) |
| RT-04 | One-hand grab | Pass | [RT-04-right-hand-grip.png](../../evidence/rt/RT-04-right-hand-grip.png) |
| RT-05 | Two-hand grab | Pass | [RT-05-two-hand-hold.png](../../evidence/rt/RT-05-two-hand-hold.png) |
| RT-06 | Seam movement | Pass | [RT-06-held-at-end.png](../../evidence/rt/RT-06-held-at-end.png) |
| RT-07 | Snap acceptance | Pass | [RT-07-connected.png](../../evidence/rt/RT-07-connected.png) |
| RT-08 | Snap rejection | Pass | [RT-08-halfway-rest.png](../../evidence/rt/RT-08-halfway-rest.png) |
| RT-09 | Blocked path | Pass | [RT-09-blocked.png](../../evidence/rt/RT-09-blocked.png) |
| RT-10 | Hop | Pass | [RT-10-after-hop.png](../../evidence/rt/RT-10-after-hop.png) |
| RT-11 | Hand loss during a move | Pass | [RT-11-after-loss.png](../../evidence/rt/RT-11-after-loss.png) |
| RT-12 | Pause and resume | Pass | [RT-12-resumed.png](../../evidence/rt/RT-12-resumed.png) |
| RT-13 | Restart | Pass | [RT-13-restarted.png](../../evidence/rt/RT-13-restarted.png) |
| RT-14 | Surveyor follows the graph | Pass | [RT-14-office-sealed.png](../../evidence/rt/RT-14-office-sealed.png) |
| RT-15 | Full chapter | Pass | [RT-15-final.png](../../evidence/rt/RT-15-final.png) |
| RT-16 | Envelope seals | Pass | [RT-16-settings-changed.png](../../evidence/rt/RT-16-settings-changed.png) |
| RT-17 | Controllers | Pass | [RT-17-controller-hop.png](../../evidence/rt/RT-17-controller-hop.png) |
| RT-18 | Save and reload | Pass | [RT-18-continued.png](../../evidence/rt/RT-18-continued.png) |
| RT-19 | Corrupt save | Pass |  |
| RT-20 | Audio state | Pass |  |
| RT-21 | The letter | Pass | [RT-21-delivered.png](../../evidence/rt/RT-21-delivered.png) |
| RT-22 | Lamps and scene join | Pass |  |
| RT-23 | Unsupported platform, refused session and production build | Pass | [RT-23-refused.png](../../evidence/rt/RT-23-refused.png) [RT-23-unsupported.png](../../evidence/rt/RT-23-unsupported.png) |
| RT-24 | Error boundary and asset failure | Pass | [RT-24-error-card.png](../../evidence/rt/RT-24-error-card.png) [RT-24-critical-asset.png](../../evidence/rt/RT-24-critical-asset.png) |

## Detail

### RT-01 Enter XR: Pass

- **Preconditions:** Page loaded; no XR session
- **Input actions:** xr exit; page reload; xr enter
- **Expected:** Session active; game state Title; envelope present
- **Actual:** session active (visible), game Title, envelope visible=true
- **Evidence:** `evidence/rt/RT-01-title-in-xr.png`
- **Duration:** 17 s

### RT-02 Exit and re-enter: Pass

- **Preconditions:** Immersive; chapter at cp-stairhead (set in-page; the save is written by the game)
- **Input actions:** xr exit; xr enter; fingertip on the continue seal
- **Expected:** Title offers continue; state equals the checkpoint snapshot
- **Actual:** while out of VR: game Title; after re-entry: Title, continue seal visible; fingertip on continue resumed at cp-stairhead (v-stair-head); committed seams, vantage, postmarks and Surveyor equal the cp-stairhead snapshot; rig/station alignment error 0 m
- **Evidence:** `evidence/rt/RT-02-resumed.png`
- **Duration:** 43 s

### RT-03 Hands available: Pass

- **Preconditions:** Immersive; hand input mode
- **Input actions:** set-input-mode hand; then disconnect both hands and wait
- **Expected:** Two hand input sources; no hands card. With hands disconnected: hands card appears
- **Actual:** with hands: both sources present, card hidden; hands disconnected 6.5 s: sources false/false, card visible; reconnected: card cleared
- **Evidence:** `evidence/rt/RT-03-hands-present.png`, `evidence/rt/RT-03-hands-disconnected.png`
- **Duration:** 26 s

### RT-04 One-hand grab: Pass

- **Preconditions:** Immersive; chapter at v-foyer-door (precondition set in-page)
- **Input actions:** Right hand pinches the seam-hall travel grip, releases; left hand does the same
- **Expected:** Grip held by the pinching hand (domain phase held, holder hand correct). SDK Grabbed tag: not used by design (plan P3)
- **Actual:** right hand held it (phase held, holder right); left hand held it (phase held, holder left); both released to rest
- **Evidence:** `evidence/rt/RT-04-right-hand-grip.png`
- **Duration:** 34 s

### RT-05 Two-hand grab: Pass

- **Preconditions:** Immersive; chapter at v-stair-head, seam-hall at 1 (checkpoint cp-stairhead)
- **Input actions:** Right pinches travel grip alone; then left holds anchor, right takes travel; then roles swapped
- **Expected:** First: refused Latched. Then held. Works with roles swapped
- **Actual:** travel alone refused (Latched); anchor left + travel right: held; anchor right + travel left: held
- **Evidence:** `evidence/rt/RT-05-two-hand-hold.png`
- **Duration:** 47 s

### RT-06 Seam movement: Pass

- **Preconditions:** Immersive; at v-foyer-door (seam-hall)
- **Input actions:** Hold travel grip; move the hand along the rail in five steps, then beyond its end
- **Expected:** param follows in step and clamps at 1; module follows within the speed cap; grip stays on the rail
- **Actual:** param followed 0.2->0.202, 0.4->0.402, 0.6->0.602, 0.8->0.802, 1->1; beyond the end clamped at 1; grip on the rail (0.180, 0.950, -0.420); peak drawn speed 0.54/s <= cap 0.83/s (1791 frames sampled)
- **Evidence:** `evidence/rt/RT-06-held-at-end.png`
- **Duration:** 51 s

### RT-07 Snap acceptance: Pass

- **Preconditions:** Immersive; at v-foyer-door
- **Input actions:** Hold travel grip; move to within the snap window of detent 1; release
- **Expected:** Settles to the detent within 0.8 s; edge appears; lamp for the next vantage lit
- **Actual:** preview named foyer.north\|stair.foot (strength 1.00); snapped to detent 1; settle 50 ms (limit 800); edge foyer.north\|stair.foot open; v-stair-head lamp lit (r=1.27)
- **Evidence:** `evidence/rt/RT-07-connected.png`
- **Duration:** 35 s

### RT-08 Snap rejection: Pass

- **Preconditions:** Immersive; (a) at v-foyer-door, (b) at v-stair-head with seam-hall at 1
- **Input actions:** (a) mid-rail release of seam-hall. (b) brace, drag seam-landing to its half-way detent, release
- **Expected:** (a) returns; edges unchanged. (b) rests at the half-way detent; no edge
- **Actual:** (a) released mid-rail: return, committed 0, edges unchanged; (b) landing rests at detent 1 (half-way), no landing.west\|stair.head edge, v-landing-east not reachable
- **Evidence:** `evidence/rt/RT-08-halfway-rest.png`
- **Duration:** 49 s

### RT-09 Blocked path: Pass

- **Preconditions:** Immersive; at v-ceast-end (cp-east), lift at corridor level
- **Input actions:** Hold the arm lever and pull it to the end
- **Expected:** param stops at the block; SeamBlocked raised; release returns it
- **Actual:** pulled to the end: param stopped at 0.573 (by lift); SeamBlocked raised; release returned it to detent 0
- **Evidence:** `evidence/rt/RT-09-blocked.png`
- **Duration:** 35 s

### RT-10 Hop: Pass

- **Preconditions:** Immersive; chapter at v-foyer-start (cp-arrival)
- **Input actions:** Right hand ray at the lit lamp, pinch-select; then at v-foyer-door aim at the unlit stair-head lamp, pinch-select
- **Expected:** Fade; rig at the new vantage anchor; domain vantage updated. Unlit lamp: nothing
- **Actual:** lit lamp (ray length 9.94 m): faded to 1, back to 0; rig 0 m from the vantage anchor; vantage v-foyer-door. Unlit stair-head lamp: no hop, no fade
- **Evidence:** `evidence/rt/RT-10-after-hop.png`
- **Duration:** 48 s

### RT-11 Hand loss during a move: Pass

- **Preconditions:** Immersive; at v-foyer-door; right hand holding the seam-hall grip
- **Input actions:** Disconnect the holding hand 0.1 s and reconnect; then 1 s (mid-rail); then 1 s with the grip inside the snap window
- **Expected:** Short loss: hold continues. Long loss: released; returns unless within a snap window
- **Actual:** 0.1 s loss -> held at 0.502 (IWER resets the pinch on reconnect, so the test restores it, as a user's still-closed fingers would be); 1 s loss mid-rail -> return, committed 0, rest; 1 s loss inside the snap window -> snap, committed 1; never committed outside a snap window
- **Evidence:** `evidence/rt/RT-11-after-loss.png`
- **Duration:** 56 s

### RT-12 Pause and resume: Pass

- **Preconditions:** Immersive; cp-corridor, Surveyor approaching; right hand holding the seam-bridge grip
- **Input actions:** updateVisibilityState hidden; wait 3 s; visible
- **Expected:** Grip released; tick count unchanged while hidden; Surveyor in the same place
- **Actual:** hidden: game Pause, grip released (settling, committed 0); over 3 s hidden ticks 371->371, Surveyor walk 54->54 in c-east; visible again: ticks resumed (371->401), game ThreatEncounter
- **Evidence:** `evidence/rt/RT-12-resumed.png`
- **Duration:** 33 s

### RT-13 Restart: Pass

- **Preconditions:** Immersive; chapter at cp-landing with intensity reduced and snap turn 30
- **Input actions:** Right index fingertip held on the restart seal for 2.4 s
- **Expected:** State equals initial; settings kept
- **Actual:** held 2.4 s: back to cp-arrival at v-foyer-start, game Exploration; seams, postmarks, objectives, letter, tally all equal a fresh chapter; settings kept (reduced, snap 30)
- **Evidence:** `evidence/rt/RT-13-restarted.png`
- **Duration:** 30 s

### RT-14 Surveyor follows the graph: Pass

- **Preconditions:** Immersive; cp-corridor; right hand holding the seam-bridge lever (real-time, no ECS stepping)
- **Input actions:** A: swing the bridge while it is in the East Corridor, swing back when it is in the office. B: swing while it is on the bridge
- **Expected:** A: den, c-east, bridge, dead-letter; counts 3, 2, 2, 1; no-route signal; ends Searching in dead-letter. B: Blocked for the block time, then replans. Drawn body always in the reported room
- **Actual:** A: rooms c-east > bridge > dead-letter; counts 3,2,2,1; no-route signal; ends Searching in dead-letter; 352 body samples, 0 outside the reported room \| B: swung while it was on the bridge: Blocked for 4.3 s (limit 4 s), then Replanning, then reached dead-letter; 308 body samples, 0 outside
- **Evidence:** `evidence/rt/RT-14-office-sealed.png`
- **Duration:** 115 s

### RT-15 Full chapter: Pass

- **Preconditions:** Immersive; chapter at the title with default settings
- **Input actions:** The reference solution of first-chapter.md section 10 as one hands-only script: title seal, ray-pinch hops, grips and braces on all six seams, the encounter, the letter into pigeonhole 0
- **Expected:** Each checkpoint in order; ChapterComplete reached; no errors in the console
- **Actual:** Completed in 381 s wall clock with hands only (25 timeline marks, artifacts/rt15-timeline.json). Checkpoints ENTRANCE > STAIR > LANDING > WEST > EAST > LAST POST; ChapterComplete; 5 objectives; caught 0 time(s); no console errors. Observed interaction failures (retried): hop to v-stair-head: attempt 1 had no effect (__rz.session.vantage === 'v-stair-head' && __rz.fade < 0.05); hop to v-stair-head: needed 2 attempts; hop to v-landing-east: attempt 1 had no effect (__rz.session.vantage === 'v-landing-east' && __rz.fade < 0.05); hop to v-landing-east: needed 2 attempts; fast hop from v-lift: press had no effect
- **Note / documented deviation:** Three defects were found by this test and fixed: taking the letter switched the "hands" setting (settings seals answered to any fingertip; now only while the letter is offered and no hand pinches, with a unit test), and two harness faults (the console-error check read old injected errors; the finale ignored a catch). Emulator quirk, not a game fault (the game received no press at all): the first ray press by a hand that has just run a scripted seam sequence is lost, the identical second press works (hop-trial and diagnostics in artifacts/). The finale uses the left hand with pre-computed aims because the Surveyor reaches the player about 9 s after the dock and each emulator command costs about 1.4 s.
- **Evidence:** `evidence/rt/RT-15-final.png`
- **Duration:** 394 s

### RT-16 Envelope seals: Pass

- **Preconditions:** Immersive; chapter just begun, letter in view
- **Input actions:** Right index fingertip on each settings seal (turn, intensity, hands); then page reload
- **Expected:** Settings change in the domain and persist across reload
- **Actual:** turn 0->30, intensity standard->reduced, hands two->one; stored in localStorage ({"snapTurn":30,"intensity":"reduced","hands":"one","volume":1}); after reload the game read the same settings
- **Note / documented deviation:** Spec step "turn the letter over" is not applicable: the settings seals sit on the letter face in this build
- **Evidence:** `evidence/rt/RT-16-settings-changed.png`
- **Duration:** 55 s

### RT-17 Controllers: Pass

- **Preconditions:** Immersive; at v-foyer-door; input mode switched to controllers
- **Input actions:** Squeeze to grab the seam-hall grip, move, release; trigger-select a lit lamp
- **Expected:** Same outcomes as RT-04, RT-07, RT-10
- **Actual:** squeeze grabbed the grip (phase held, holder right); released inside the snap window: committed detent 1, edge foyer.north\|stair.foot open; trigger on the lit stair-head lamp hopped to v-stair-head
- **Evidence:** `evidence/rt/RT-17-controller-hop.png`
- **Duration:** 39 s

### RT-18 Save and reload: Pass

- **Preconditions:** Immersive; chapter at cp-landing (the game writes the save)
- **Input actions:** Reload the page; xr enter; fingertip on continue
- **Expected:** Seam detents, edges and vantage match the checkpoint
- **Actual:** reloaded: Title with continue and no notice; continue restored cp-landing at v-landing-east; 8 open edges and seam detents identical to before; rig/station alignment 0 m
- **Evidence:** `evidence/rt/RT-18-continued.png`
- **Duration:** 42 s

### RT-19 Corrupt save: Pass

- **Preconditions:** Page with controlled local storage (no XR needed)
- **Input actions:** Write (1) truncated JSON in the current slot, (2) a record whose edge list does not match its seams, (3) an unknown checkpoint; reload after each
- **Expected:** Other slot, then canonical snapshot, then new game; notice shown; no exception
- **Actual:** truncated JSON in the current slot, valid record in the other -> continue at cp-landing, notice "Earlier progress could not be restored as saved.", no console error; edge list that does not match the seams -> continue at cp-east, notice "Earlier progress could not be restored as saved.", no console error; unknown checkpoint and nothing usable in the other slot -> new game, notice "Earlier progress could not be restored as saved.", no console error
- **Evidence:** none (state-only test)
- **Duration:** 43 s

### RT-20 Audio state: Pass

- **Preconditions:** Immersive; cp-corridor; the encounter driven with game commands (the hands are not under test here)
- **Input actions:** Let the Surveyor wake and count; swing the bridge while it is on it (brace, Blocked); let it measure the office; swing back (no route); then hide and show the session
- **Expected:** The matching audio request within 0.5 s of each Surveyor state change; audio resumes after pause
- **Actual:** wakes (Listening) -> tape 0.00 s; wakes (Listening) -> pencil 0.00 s; count -> knock 0.28 s; bracing -> strain 0.00 s; Blocked -> plumb 0.00 s; measuring -> pencil 0.00 s; measuring -> tape 0.00 s; no route -> tape-long 0.00 s; after hide/show the room-tone loop was re-requested (loop 0.35; SDK source playing=true); Note: this checks the game's audio requests and the SDK source state, not what is heard
- **Evidence:** none (state-only test)
- **Duration:** 68 s

### RT-21 The letter: Pass

- **Preconditions:** Immersive; (a) at v-foyer-door, (b) cp-docked at v-zero, (c) at v-foyer-door
- **Input actions:** (a) take the letter and release it in mid-air. (b) take it to pigeonhole 0 and release. (c) carry it to the pigeonhole position while not in Room Zero and release
- **Expected:** (a) returns to the strap. (b) delivered, ending starts. (c) not delivered
- **Actual:** (a) mid-air release: letter strap, back at the strap (-0.3, 0.82, -0.3); (c) at the slot position outside Room Zero: not delivered, no ending; (b) in Room Zero: delivered, ending started (3 step events so far). Slot is 0.53 m from the seated reference point (seated reach limit is 0.55 m)
- **Evidence:** `evidence/rt/RT-21-delivered.png`
- **Duration:** 84 s

### RT-22 Lamps and scene join: Pass

- **Preconditions:** Dev page; no XR needed
- **Input actions:** For 20 spread seam configurations and every vantage compare lit lamps with the domain reachable set; check every content ID has its scene object; check every station grip against the seated reach envelope
- **Expected:** Identical sets; join check passes; all grips in the envelope
- **Actual:** 20 configurations x 11 vantages = 220 comparisons: lit lamps identical to the domain's reachable set; every module, socket, beacon, station, seal and setting seal present (7 stations); every grip end inside the seated reach envelope
- **Evidence:** none (state-only test)
- **Duration:** 2 s

### RT-23 Unsupported platform, refused session and production build: Pass

- **Preconditions:** (a) production build served from a sub-path in a separate headless Chromium with no emulator; (b) the emulator page with the session request made to fail
- **Input actions:** (a) open /room-zero/ ; (b) click Enter VR with requestSession rejecting, then with it restored
- **Expected:** (a) page explains that a headset browser is needed; no emulator code; no request to another origin. (b) message and a working retry
- **Actual:** (a) production build from /room-zero/: "This needs a VR headset browser. Open this address in the Meta Quest Browser."; Enter VR disabled; no emulator globals, dev hook or emulator code in the bundle (SDK-internal globals present: __IWSDK_LUCIDE_ICONS_TRIMMED__); 35 requests, none to another origin, 0 failed; (b) session request refused: "The headset did not start VR. Try again.", Enter VR re-enabled; after restoring it the retry started a session
- **Evidence:** `evidence/rt/RT-23-refused.png`, `evidence/rt/RT-23-unsupported.png`
- **Duration:** 87 s

### RT-24 Error boundary and asset failure: Pass

- **Preconditions:** Immersive; chapter running. Then fault injection through the browser context
- **Input actions:** (a) make a tick throw; touch the card's retry. (b) block one background asset (audio/knock.wav), reload, play. (c) block the game script (the critical asset), reload; unblock; Try again
- **Expected:** (a) ticking stops; error card; restart works. (b) play continues. (c) the page reports it and retry works
- **Actual:** (a) a tick threw: error card shown, ticks stopped (144); fingertip on retry restarted the chapter at its opening (Exploration), not the title; (b) audio/knock.wav blocked: the game booted and the chapter started (Exploration), no error card; (c) production build with the game bundle failing to load (404): page said "The house could not be prepared: a file did not load. Check your connection and try again." with Try again visible; with the bundle served again, Try again recovered ("This needs a VR headset browser. Open this address in the Meta Quest Browser.")
- **Note / documented deviation:** Restart after an error returns to the chapter opening, not to the title as the matrix text says
- **Evidence:** `evidence/rt/RT-24-error-card.png`, `evidence/rt/RT-24-critical-asset.png`
- **Duration:** 117 s
