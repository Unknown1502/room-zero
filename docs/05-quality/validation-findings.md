# Validation findings: what the runtime tests found

Everything here is **IWER-verified** or **automated**. Nothing was played by a person and nothing ran on a Quest. See `runtime-test-results.md` for the RT-01 to RT-24 matrix itself and `performance-report.md` for the measurements.

## 1. Defects found by running the game, and fixed

| # | Found by | Defect | Root cause | Fix | Regression coverage |
|---|---|---|---|---|---|
| D1 | RT-16 | Comfort settings were lost after a reload | Loading a save overwrote the stored settings with the ones inside the save record | Stored settings win; settings are not progress (`persistence/save.ts`, `domain/session.ts`) | `tests/unit/save.test.ts` |
| D2 | RT-03 | A player with no hand tracking and no controllers saw nothing and no explanation | No message existed | After 5 s in a session with no tracked hand, a head-locked "NO HANDS FOUND" card appears | RT-03 |
| D3 | RT-10 | Lamps silently ignored a pinch when the other (resting) hand was near a rail | The "pinch near a grip means grab, not hop" rule counted a hand that was not pinching | Only a pinching hand on a grip, or a hand holding one, claims the pinch (`pinchClaimedByGrip`) | `tests/unit/navigation.test.ts` |
| D4 | RT-14 | The Surveyor figure flew in from the world origin the first time it was shown | Position was interpolated from an unset start | Snap on first show | RT-14 |
| D5 | RT-17 | Controllers could not take a grip | Only the pinch path existed | Squeeze counts as the pinch on controllers; the trigger stays the ray select | RT-17 |
| D6 | RT-18 | "Continue" started a fresh chapter | Test setup had discarded the checkpoint saves; the game now writes them on every checkpoint step | Setup order; game unchanged apart from a draw/placement order fix at three sites | RT-18 |
| D7 | RT-21, RT-22 | A seam handle and the east-bridge rail were outside the seated reach envelope | Authored positions | Vantage `v-zero` moved; east-bridge rail shortened to 0.25 m | RT-21, RT-22 and the model test of the reach envelope |
| D8 | RT-23 | Pressing Enter VR with a refused session left the page stuck | The rejection was not handled | The rejection is caught, a message is shown and Enter VR is re-enabled | RT-23(b) |
| D9 | RT-24(c) | A failure to load the game script showed nothing | A module-script load error has no other reporter | An inline `error` handler on the script tag says so and offers "Try again" | RT-24(c), production build, 404 on the bundle |
| D10 | RT-15 | **Taking the letter in Room Zero switched the "hands" setting to one hand** (and could change turn or intensity) | The four settings seals sit on the letter's face, the same face the player reaches for to take it, and answered to any fingertip within 3.5 cm at any time | Turn, intensity and hands answer only while the letter is offered at the chest (title, chapter opening, pause) and no hand is pinching or holding; restart needs quiet hands and its 2 s dwell (`settingSealLive`) | `tests/unit/navigation.test.ts`, RT-13, RT-16, RT-15 asserts the settings are unchanged at the end |

Defects found later, by visual QA and the fault-injection investigation (details: `qa/visual-audit/report.md`, `qa/runtime-investigation/REPORT.md`):

| # | Found by | Defect | Fix |
|---|---|---|---|
| D11 | Browser Plugin and IWER screenshots | The headset-only letter and seals showed through the title text on the flat web page | Shown only while an XR session exists |
| D12 | IWER screenshots | The closing title was laid flat (a leftover `rotation.x`), unreadable | Upright, facing the seat, dark ink |
| D13 | IWER screenshots | The chapter's last line was on a 0.2 m card with small type | 0.34 x 0.20 m card, larger darker type |
| D14 | IWER screenshots | The RETRY seal covered the third line of the error card | Text moved above the seal |
| D15 | IWER screenshots | Z-fighting between the lift's port wall and Room Zero's wall at the dock | The port wall 1 cm inside the lift |
| D16 | Fault-injection verification | A loop that was running when the game failed (a seam grinding) kept playing under the error card, because the failure path returns before loops are updated | `fail()` silences every loop but the ambient tone; verified 14 of 14 (`tools/qa/fault-injection-verify.mjs`) |
| UX1 | Screenshot review of the first 90 s in the headset | No in-world hint for the first three actions (the page text is gone once in VR) | Four short, near-field, one-state prompts (touch a seal; point at the lamp; pinch the grip; brace and pull), placed in front of the head when they first show. **An unvalidated UX improvement: no person has used it** |

Deviations from the written specification that remain, all deliberate and listed in `04-engineering/iwsdk-verification.md` section 5a: seals are on the letter's face, not its back; restart after an error returns to the chapter opening, not the title; the hop-suppression rule counts only a pinching hand.

## 2. Findings that are about the test method, not the game

| Finding | Evidence | Treatment |
|---|---|---|
| The first ray press by a hand that has just run a scripted `run-sequence` (a seam move) never reaches the game. The identical second press works. | `artifacts/hop-trial.json`; instrumented diagnostics showed that the game received **no press event at all** (not a refusal), the near-grip rule was never asked, and the grip was 0.37 m away (the rule's radius is 0.2 m). A hover of 0 ms: 11/18 first-attempt hops moved the player; 400 ms: 18/18. After a seam: the first press failed in every variant tried (rest pose first, select value reset on both hands, 4 s settle, 1.5 s hover, re-aim after hover, a flush select, pose reset), and a press from the **other** hand worked at once. | Emulator quirk. The harness retries at once and records each loss as an observed interaction failure; the final-act hops use the other hand. It is **not** shown to be an SDK or game fault, and it was not reproduced on a headset (none was available). |
| Ray aims are expressed in the rig's own space, and the rig moves with each hop. | The finale failed 52 presses in a row with an aim computed at the wrong vantage. | The aim is computed at the vantage where it is used. |
| Each emulator command costs about 1.4 s. The Surveyor needs about 9 s from the dock to the player's vantage in the east corridor and about 17 s to the lift. | The finale was lost nine times in one run to the Surveyor, which is the game working as designed (the player returns to the last postmark). | The finale loop spends one page call and one press per step. Catches are counted and reported. |
| The browser console log is read through a size-limited call, and keeps injected errors from RT-23 and RT-24. | RT-15 failed on errors it had not caused. | An in-page recorder of `console.error` and window errors starts when the test starts. |
| Routing the dev page's requests did not intercept module-script requests. | RT-24(c) first attempt. | The critical-asset case runs against the production build in a separate Chromium with the bundle answering 404, then restored. |

## 3. Hands-only full chapter (RT-15)

Last run: completed in 356 s of wall clock with IWER hands, no controller. Checkpoints ENTRANCE, STAIR, LANDING, WEST, EAST, LAST POST in order; ChapterComplete; five of five objectives; caught 0 times; no console errors; settings unchanged at the end. Observed interaction failures that were retried: two hops lost their first press after a seam move (the quirk above) and one finale press had no effect. Timeline: `artifacts/rt15-timeline.json`.

Earlier runs of the same test failed for the reasons in sections 1 and 2 and are not hidden: the first (before D10 was fixed) completed the chapter but failed on a console-error check that read old errors and on the setting that had changed; several later runs failed in the finale for harness reasons.

## 3a. Repeat runs and denominators (IWER, hands only)

All counts are emulator counts, on the current code, after the fixes in section 1.

| What | Result |
|---|---|
| Full chapter, fresh profile (site storage cleared, page reloaded, no save, no settings), hands only | **3 of 3 completed** (360 s, 335.8 s, 432.1 s). Each: five of five objectives, postmarks ENTRANCE to LAST POST in order, ChapterComplete, caught 0 times, 0 console errors, settings unchanged. Retried interactions: 5, 5 and 7 (emulator quirk, section 2). `artifacts/playthroughs.json` |
| Full chapter, all runs on the current code since the harness fixes | RT-15 twice (once alone, once in the full matrix), the three fresh-profile runs, and the recorded run for the video: **6 of 6 completed** |
| Full chapter with the recorder and the head-reset option of the recording script | The final latched seam (lowering the lift) did not take its grip in **4 of 5** attempts (the fifth completed and is the raw recording). The same step passed in every run without those options and was never reproduced outside recording. Cause not found; the recording script was changed to avoid the head reset, and an encounter segment was recorded in a separate run to the sealed office. Listed here because it is a failure, not hidden |
| RT-02 exit and re-entry; RT-05 two-hand grab; RT-07 valid connection (snap); RT-08 invalid connection (rejection); RT-09 blocked path; RT-11 hand loss during a move; RT-12 pause and resume; RT-13 restart; RT-14 Surveyor follows the graph; RT-18 save and continue; RT-24 error boundary and failed assets | **3 of 3 each** (three full passes of this set) |
| RT-06 seam movement | **2 of 3.** Pass 1 failed: "drawn speed 0.98 /s exceeds the cap 0.83 /s". The test sampled the drawn position on a 16 ms timer, which jitters against the game's frames; the game caps each frame's step, so the measurement was wrong, not the cap. The test now samples once per frame; passes 2 and 3 passed. Not shown on a headset |
| RT-19 corrupt save | **1 of 3.** Passes 1 and 2 failed because the test counted the errors that RT-23 and RT-24 inject on purpose and the browser keeps across reloads; the test now ignores exactly those two messages. Pass 3 passed. The game's behaviour (corrupt slots rejected, other slot used, notice shown) passed its other assertions in all three |

Each pass of the repeat set also exercised hold and release, tracking loss and restart. **Not run as repeated, separate trials:** rapid repeated manipulation as its own fault injection, "audio unavailable", "hand model missing", and three distinct Surveyor obstruction scenarios beyond RT-14 and the encounter inside the full runs. The 24-row matrix itself passed 24 of 24 in one full run on the post-merge code.

## 3b. The video

`artifacts/recordings/take4.webm` (413 s, raw, one uninterrupted real run) and `take7.webm` (a real run from the title to the sealed office, with the emulated head turned down the corridor so the Surveyor is in view; the Surveyor never appears in `take4`, where the head looks at the lectern). `trailer-take4.mp4` (168 s) is cut from those two, with captions and cards only: no retiming, no generated footage; the cut list with source times is `trailer-take4-cuts.json`. It has no sound and says on screen that it is emulator footage with scripted hands. Tools: `tools/rt/record.mjs`, `tools/make-trailer.mjs`.

## 4. What this does not show

No human played the game, so first-five-minutes understanding, puzzle difficulty, comfort and the clarity of any feedback are **untested** (PT-01 to PT-05 and CF-01 to CF-07 are not run). No Quest was used, so hand-tracking quality, headset legibility, audio as heard and device frame rate are **untested**. The emulator drives hands that never tremble, never tire and never occlude each other, so "seam manipulation succeeded n out of n times" below is a statement about the emulator.
