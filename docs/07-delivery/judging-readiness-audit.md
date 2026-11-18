# Judging-readiness audit (internal)

Against the four equally weighted criteria of the 2026 rubric: Innovation and Creativity, Experience Design, Technical Implementation, Polish and Presentation (25 percent each). **These are internal readiness ratings out of 10 from the evidence in this repository. They are not predictions of the official scores.** Evidence levels: automated and IWER (desktop emulator) only. Human-tested and Quest-tested are empty.

| Criterion | Internal readiness | Why, in one line |
|---|---|---|
| Innovation and Creativity | **7 / 10** | The central mechanic is distinctive and demonstrated end to end; its novelty against existing work is argued, not proven |
| Experience Design | **4 / 10** | The flow works for a script; nobody has played it, and the first five minutes are untested |
| Technical Implementation | **7 / 10** | Strong automated and emulator evidence; nothing measured on a headset |
| Polish and Presentation | **3 / 10** | Placeholder procedural art, unlistened generated audio, a silent trailer from real emulator footage |

**Update after the visual QA and experience-polish passes (internal, evidence-based, not a prediction):** Experience Design **5 / 10** (was 4): four contextual prompts for the first actions (screenshots `qa/experience-polish/after/`), the closing title and last-line card made legible. Still no person has played it, so this is an unvalidated improvement. Polish and Presentation **4 / 10** (was 3): seven visible defects fixed with before/after screenshots (`qa/visual-audit/`). Still graybox art, unauditioned audio, an unchanged Surveyor. Innovation 7 and Technical 7 are unchanged. The 7+ stretch targets for Experience Design and Polish are **not** met and are not claimed.

## 1. Innovation and Creativity: 7 / 10

**Evidence.** The player moves an architectural seam; the doorway graph (`HouseGraph`) is recomputed; the Surveyor plans only over that same graph. In the encounter the chapter shows exactly the required chain, in order, in the hands-only run (RT-15, `artifacts/rt15-timeline.json`) and in RT-14: the player holds the bridge lever; the Surveyor walks the East Corridor; the player swings the bridge to the Dead Letter Office; the Surveyor turns to the new joint and enters the office; the player swings the bridge back; the office is sealed and the Surveyor has no route. 288 configurations are enumerated and every invariant is checked (`tests/model`).

**Why it suits spatial VR.** The seams are physical objects at arm's length, so rearranging the house is an act of the hands, not a menu; the enemy's route is the house you are holding. This is an argument from the design, not something a player was asked about.

**Comparable work (a brief search, "we did not find", not "does not exist").** Studio Chyr's *Hotel Infinity* (Quest, 2025) and its earlier *Manifold Garden* use impossible architecture and doors that open onto impossible spaces; reviews describe no enemy, and the studio said it had no plans for controller-free hand tracking ([UploadVR](https://uploadvr.com/hotel-infinity-started-as-manifold-garden-in-vr), [Meta](https://www.meta.com/blog/hotel-infinity-launch/)). *The Room VR: A Dark Matter* is hand-manipulated puzzle boxes ([UploadVR](https://uploadvr.com/the-room-vr-review/)). What we did not find is a game where the player's own reconnection of rooms is also the pursuer's route map. Being horror-themed is not claimed as novelty.

**Weakest point.** One encounter and one scripted arrival; the Surveyor's two rules can be learned once and then controlled completely. The "288 puzzles" framing is not claimed: the chapter is one fixed puzzle sequence with a few alternative orders.

**Changes made, tests run.** None to the mechanic. RT-14, RT-15, RT-21, RT-22; the model checks.

**Unverified.** Whether a player finds the pursuer-follows-the-doors idea readable without being told.

## 2. Experience Design: 4 / 10

**Evidence.** Title to chapter: the page has a begin flow and four comfort settings; in VR the begin seal and the settings seals are on a letter; a "NO HANDS FOUND" card appears when no hand is tracked (RT-03); a failure returns the player to the last postmark with no penalty (RT-24, game section 9); restart and replay work (RT-13, RT-15). Seated comfort: hops fade to black in 0.2 s, no forced camera movement (the camera is never moved by the game), snap turn and reduced intensity exist, every interactive grip sits inside the seated reach envelope (model check, RT-21 and RT-22).

**Judge-experience test (what was and was not possible).** No judge or first-time player was available, so this was not run. The points where external explanation is most likely needed, from reading the flow, are: (1) what a brass grip is and that it can be pinched and slid (the page explains it before entering VR; inside VR only the letter's hint line helps); (2) that a lit lamp is a place you can look at and pinch to go to; (3) why the Surveyor matters before it appears; (4) that a second hand braces latched seams (the first latched seam shows its refusal feedback, but wording was never read by a person). These are risks to be tested, not findings.

**Weakest point.** Nothing in the repository shows that a new player understands the core interaction in the first five minutes. The scripted run knows the solution. Puzzle difficulty, Surveyor fairness and comfort are authored by reasoning only (PT-01 to PT-05, CF-01 to CF-07 are not run).

**Changes made.** Settings seals can no longer be triggered by reaching for the letter (found by RT-15); the "no hands" card; the error and restart paths.

**Unverified.** Everything about real people.

## 3. Technical Implementation: 7 / 10

**Evidence.** `npm run check` passes (type check, three layer-rule checks, 78 unit tests, 5 model checks including all 288 configurations). RT-01 to RT-24: 24 of 24 pass in one full run on the current code (`05-quality/runtime-test-results.md`). Covered: immersive start, hands-only play, hand-interaction ownership (one and two hands, brace and travel), constrained seams, valid and invalid connections, blocked paths, hand loss, hops, pause and resume, restart, save and corrupt-save recovery, XR exit and re-entry, controllers, audio state, error boundary and failed assets, the production build with no emulator. Three fresh-profile completions and the other repeat counts are in `05-quality/validation-findings.md` and `artifacts/playthroughs.json` if they ran; see that file for the denominators.

**Performance (emulator only).** In the desktop IWER emulator the game holds about 60 fps with a frame p95 of 17.5 to 18.7 ms; draw calls were reduced from 806 to 230 at the foyer and from 1064 to 350 in transitions by a static merge. The official minimum is 60 FPS on Quest hardware: **unmeasured**. A gaze system was not added: nothing in this game needs one.

**Weakest point.** No headset measurement at all; a 2.4 MB start-up script (almost all SDK); one emulator quirk (the first ray press after a scripted seam sequence is lost) that was worked around in the test harness and not explained.

**Unverified.** Frame time, memory and thermals on a Quest 3 or 3S; hand-tracking quality; behaviour of the SDK pointer under real hands.

## 4. Polish and Presentation: 3 / 10

**Evidence.** The rooms are shaped, textured and lit with a procedural kit (brass frames, wallpaper-like walls, timber floors, a pigeonhole wall in Room Zero) and are coherent. The Surveyor is a procedural figure. The audio is 31 generated sounds. A **3-minute-or-shorter trailer cut from one genuine uninterrupted emulator run exists** (`artifacts/recordings/trailer-take4.mp4`, 170 s, raw `take4.webm`); it has no sound and the footage is from the desktop emulator, which the video says on screen.

**Weakest point.** This is the graybox the brief says is not an acceptable final presentation. There is no production art, no authored character animation, no lit transitions between rooms, and the audio has never been listened to by a person. The emulated head leans while hands work, so some footage looks down at the lectern.

**Changes made.** Draw-call reduction (a performance change, not visual); no art changes were made in this pass. The M6 production-art milestone was not delivered.

**Unverified.** Audio quality; how the visuals read on a headset display.

## 5. What changes the ratings

A first-time-player session (Experience Design), a Quest run with frame-time capture (Technical), a listening pass and an art pass on the foyer, staircase, Wrong Door, encounter and Room Zero (Polish).
