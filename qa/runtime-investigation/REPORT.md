# Runtime fault-injection investigation and clean gameplay verification

Date: 2026-11-18. Evidence level: **IWER emulator (Playwright-managed Chromium, desktop GPU)** and **automated**. Not Quest, not human.

**Answer in one paragraph.** Every error in the logs was put there on purpose by a test, or is the browser cancelling requests when the test harness reloaded the page. None came from normal play: a separate session with nothing injected, played with hands from the title to the stair head, logged no errors (A1, A2). The injection code lives only in `tools/`; there is none in `src/`, and none in the production bundle (D1, D2). Each injection is removed after its test, and a second injection leaves nothing behind (C5). The investigation did find **one real, minor defect in the failure path**: a loop that was running when the game failed (a seam grinding) kept playing under the error card. It is fixed and verified (C2).

## 1. Each log line and where it came from

| Log line | Origin | Expected? |
|---|---|---|
| `NotAllowedError: refused for RT-23` and `[XR] Failed to start XR session` | RT-23(b), `tools/rt/run-rt.mjs`: replaces `navigator.xr`'s `requestSession` with a rejecting one, presses Enter VR, then restores the saved original | Yes, deliberate |
| `RT-24 injected failure` | RT-24(a): makes `g.session.tick` throw | Yes |
| `QA injected failure` | `tools/qa/capture-states.mjs`, the error-card screenshot of the visual QA | Yes |
| `verify injected failure` (and `... 2`) | `tools/qa/fault-injection-verify.mjs` (this investigation) | Yes |
| `at g.session.tick (eval at evaluate ...)` | The stack of a function defined by a test through the page's `evaluate`; the frames `Game.step` and `GameDirectorSystem.update` show where the game's own boundary caught it | Yes: this is the failure policy working |
| `Room Zero stopped: ... state <hash>` | `Game.fail()` (`src/app/game.ts`), one line per failure. The hash is of the game state including the tick count, so every failure in a different moment has a different identifier | Yes |
| The same lines repeated, with different state identifiers | The managed browser keeps its console log across page reloads, and these tests have each been run many times in this session (full matrices, repeat passes, QA captures, this script). Repetition is history, not one failure repeating: C1 and C5 show a single failure logs exactly once | Yes |
| `GET ...: net::ERR_ABORTED` (`/src/...`, `__iwsdk_preview_reload=...`) and Vite page reloads | The browser cancelling outstanding module requests when the harness reloads the page (`stablePage`, RT-01, RT-16, RT-18, RT-19) or a source edit made Vite reload. Not an application error. RT-19 had counted these as errors and failed on them; its filter now ignores exactly these cancellations and the injected messages, and any other error still fails it | Yes (a harness fault, fixed) |
| Dev server "starts using hardware GPU" | The managed Chromium reports the desktop GPU (ANGLE, Intel Iris Xe) in `artifacts/perf-baseline.json`; not a software renderer | Informational |

## 2. Test implementation inspected

| Item | Where | Finding |
|---|---|---|
| RT-23 | `tools/rt/run-rt.mjs` (`test('RT-23'`) | (a) the production build is built and served from a sub-path in a separate Chromium with no emulator; (b) the refusal is injected in the page and restored by assignment of the saved original |
| RT-24 | same, `test('RT-24'` | (a) the tick hook, (b) one background asset blocked, (c) the production bundle answered with 404 and then restored |
| Other injections | `tools/qa/capture-states.mjs`, `tools/qa/fault-injection-verify.mjs` | same technique, each with a restore |
| Hooks in the game | `src/` | **None.** The only development hook is `window.__rz`, and only under `import.meta.env.DEV` (`src/index.ts`) |
| Cleanup | tests | RT-23 restored the request function; RT-24 and the QA scripts restored the tick by assigning the saved method back. **That left an own property on the session shadowing the prototype method** (same function, no behaviour change, but not "removed"). All three now `delete` the hook |

## 3. Verification results (`tools/qa/fault-injection-verify.mjs`, `after`: 14 of 14; `before`: 12 of 14, with the defect found)

| ID | Check | Before the fix | After |
|---|---|---|---|
| A0 | A fresh page has no injection state | PASS | PASS |
| A1 | **Clean session, nothing injected**, hands only, from the title: begin, first room, letter, first hop, first seam, next hop to the stair head (92.7 s before, 76.6 s after) | PASS | PASS |
| A2 | The clean session logged no console errors | PASS | PASS |
| B1 | RT-23: refusal handled (message shown, Enter VR usable again, no session left, game not failed) | PASS | PASS |
| B2 | After the injection is removed a session starts | PASS | PASS |
| C0 | Precondition: the grinding loop runs when the failure is injected (a seam being dragged) | PASS | PASS |
| C1 | RT-24: failure logged exactly once, ticking stops, error card shown | PASS | PASS |
| C2 | The failure policy releases the loops that were running | **FAIL**: `grind 0.108` still playing under the error card | PASS: only the ambient tone remains |
| C3 | Recovery: failure cleared, card hidden, hook removed, chapter back at its opening, ticking again | PASS | PASS |
| C4 | Ambient tone playing after recovery | PASS | PASS |
| C5 | A second injection logs once and leaves nothing behind | PASS | PASS |
| C6 | No console errors other than the injected ones | PASS | PASS |
| D1 | No injection strings, test hooks or emulator globals in the production bundle | PASS | PASS |
| D2 | Production page ignores failure and debug flags in the URL and storage; no hooks; loads without errors | PASS | PASS |

The first `before` run is kept as `before-first-run-results.json`: it failed C3 and C5 only because the check treated the restored own property as a leftover, and its leak test was invalid (the game rewrites the loops every frame, so a loop set by hand disappeared before the failure). Both were corrected and the run repeated; the table is the corrected pair. Production check on the final build: `qa/runtime-investigation/prod-check.json`, both checks PASS.

## 4. The defect, its cause and the fix

`Game.fail()` stops the game loop's presentation: `view()` returns early while `failed` is set, so nothing updates the audio loops. A loop that was on when the failure came (a seam grinding, the hum of a preview, the closing drone) kept its last volume until a restart. Fix (`src/app/game.ts`, in `fail()`): silence every loop but the quiet ambient tone; `view()` raises the others again after a restart. Effect measured as loop levels, **not listened to**.

## 5. Other results

| Item | Status |
|---|---|
| RT-23 (refused session; production build, sub-path, no emulator code) | PASS (final full matrix) |
| RT-24 (a) error card and fingertip retry, (b) background asset blocked, (c) game script 404 and retry | PASS |
| Full RT-01 to RT-24 on the final build | **24 of 24 pass** (`runtime-test-results.md`) |
| RT-14 | Failed once in an earlier full run: a screenshot in the middle of the Surveyor's 6 s measuring ritual let it start back across the bridge, which freezes the seam by the rules. The screenshot moved after the swing; 24 of 24 since |
| RT-19 | Failed twice on the cancelled-request noise above; fixed in the test; passes |
| Unit and model tests | 78 and 5 pass; type check and layer rules pass |

## 6. Screenshots

`qa/runtime-investigation/before/` and `after/`: the clean session (title, arrival, foyer door, stair joined, stair head), the refused-session page, and the error card. The leak is an audio-level defect, so **the before and after pictures of these states look the same**; the evidence for the fix is the numeric check C2, not a picture. Sheet: `sheet-after.png`.

## 7. Source files modified

`src/app/game.ts` (`fail()` silences loops); test and QA tools only otherwise: `tools/rt/run-rt.mjs` (hook removal by `delete`, RT-19 filter, RT-14 order), `tools/rt/chapter.mjs` (`stopAfter: 'stair'`), `tools/qa/capture-states.mjs`; new: `tools/qa/fault-injection-verify.mjs`, `tools/qa/prod-check.mjs`. No test was weakened: the RT-19 filter ignores only the injected messages and cancelled requests, and RT-14 only changed where its screenshot is taken.

## 8. What this does not show

Nothing here was run on a Quest or by a person. The audio fix is checked by loop volume, not by listening. The managed browser keeps one log across reloads, so a log read at any moment mixes every earlier run: read errors from an in-page recorder started at the beginning of a test, as RT-15 and the scripts above do.
