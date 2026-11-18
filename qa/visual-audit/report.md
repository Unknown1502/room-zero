# Room Zero: visual QA, Playwright automation and root-cause fix sprint

Date: 2026-11-18. Evidence levels: **Playwright** (headless Chromium, `playwright-core`), **Browser Plugin** (the connected Playwright MCP browser), **IWER** (the emulator session in the Playwright-managed browser), **automated** (unit and model tests). **Not done:** physical Quest testing, human usability testing. Nothing here is a Quest or human result.

## 1. How it was done

| Step | Tool | What was actually possible |
|---|---|---|
| Repo state | shell | `room-zero` is not a git repository (no `.git` here or above), so there is no HEAD, branch or index to record and no user change to protect by Git; existing files were edited in place and listed below. BREACH was not opened. |
| Playwright setup | shell | `playwright-core` 1.65.1 and `playwright` are already installed (IWSDK tooling); no `@playwright/test`, no config, no tests existed. **Nothing was installed**; the new tests use `playwright-core` directly (`tools/qa/playwright-smoke.mjs`). |
| Playwright, web page and production build | `tools/qa/playwright-smoke.mjs` | Three viewports (1440x900, 1280x720, 390x844): loads, status text, console and page errors, failed and 4xx requests, horizontal scroll, key elements inside the viewport, settings stored and persisted across reload. Screenshots in `playwright/`. |
| Playwright, in VR states | `tools/qa/capture-states.mjs` through the IWSDK CLI | The emulator session lives in a Playwright-managed Chromium; each state is reached through the game's own checkpoint replay and rig placement (recorded beside every shot in `before.json` and `after.json`), the head turned forward so the shot shows what a seated player faces. 30 states per phase. |
| Browser Plugin | Playwright MCP tools (`browser_navigate`, `browser_take_screenshot`, `browser_resize`, `browser_console_messages`) | **Blocked for the dev server:** `https://localhost:8081` is rejected with `ERR_CERT_AUTHORITY_INVALID` (self-signed certificate); the certificate was not bypassed. **Done instead:** the production `dist/` served on loopback HTTP only (`tools/serve-dist.mjs`, 127.0.0.1, no tunnel, no deploy), which the plugin opened. This is the flat page; the plugin has no XR session, so in-VR states were **not** inspected through it. The plugin writes its snapshots and console logs to `.playwright-mcp` in the parent folder of the project (outside `room-zero`); its first screenshot also landed there and was moved into the project. |
| Visual audit | image review | Every shot was reviewed, in contact sheets (`sheet-*.png`, `tools/qa/sheet.mjs`) and full size where something looked wrong. |
| Fix and verify | code, `tools/qa/regression-checks.mjs` | Root cause traced in code before each change; numeric regression checks written that fail on the old behaviour; fresh after-fix screenshots. |

## 2. Confirmed issues

| ID | Sev | Problem (before) | Root cause | Fix | Verification | Evidence | Tool | Status |
|---|---|---|---|---|---|---|---|---|
| V1 | P2 | On the web page, the small letter and the red BEGIN/CONTINUE seals from the headset title show through the page text ("The Unret▯ned Letter", "seven m▯nutes") | The in-world letter and the action seals were drawn whenever the game was on the title, including the flat desktop preview that has no XR session (`src/app/game.ts`, `viewLetter` and `viewBeaconsAndSeals`) | The letter and seals are visible only while `world.session` exists | `V1` check: hidden on the flat page, shown in the session; screenshots | before: `browser-plugin/prod-title-1280x720.png`, `before/01-startup-page.png`; after: `browser-plugin/prod-title-1280x720-after.png`, `after/01-startup-page.png`, `browser-plugin/prod-title-390x844-after.png` | Browser Plugin, IWER, Playwright | **Fixed** |
| V2 | P1 | The closing title "The Unreturned Letter" is a foreshortened, unreadable strip high on the wall | `titleCard.rotation.x = Math.PI / 2` laid the plane flat, facing down, after the rotation that made it face the seat (`src/world/build.ts`) | Removed the override: the card is upright and faces the seat | `V2`: world normal against the direction to the head gives 0.967, `|normal.y|` 0 | before: `before/43-chapter-complete.png`; after: `after/43-chapter-complete.png`, `compare-43-chapter-complete.png` | IWER | **Fixed** |
| V3 | P2 | The card that carries the chapter's last line ("You are the return address.") is about 0.2 m wide with small type, unreadable at the desk | Card size and type size (`src/world/build.ts`) | Card 0.34 x 0.20 m, type 66 px in near-black on light paper | `V3`: width 0.34, ink luminance 25, paper 229 | `before/42-ending-card.png` to `after/42-ending-card.png`, `compare-42-ending-card.png` | IWER | **Fixed** |
| V4 | P2 | On the error card the RETRY seal covers the end of "Touch the brass seal to restart." | Text rows 157 to 252 of the texture lie under the seal (`src/app/game.ts`) | The three lines moved up (baselines 56, 100, 138) | `V4`: 0 bright text pixels under the seal | `before/52-error-card.png` to `after/52-error-card.png`, `compare-52-error-card.png` | IWER | **Fixed** |
| V5 | P2 | Inside the parcel lift, with Room Zero docked, one wall shows a saw-tooth of black and gold spikes | Z-fighting: the lift's port wall and Room Zero's wall are coplanar at the dock (`src/world/build.ts`) | The port wall sits 1 cm inside the lift, so each viewer sees the wall of their own room | `V5` (geometry), after screenshot: the wall is clean | `before/10-vantage-10-v-lift.png` to `after/10-vantage-10-v-lift.png`, `compare-10-vantage-10-v-lift.png` | IWER | **Fixed** |
| V6 | P3 | "Volume" label sits lower than its slider and the other labels | Inline label with an inline-block slider (`index.html`) | `display: inline-flex; align-items: center` on labels | Screenshot | `browser-plugin/prod-title-1280x720.png` to `...-after.png` | Browser Plugin | **Fixed** |
| V7 | P3 | The closing title is cream on a tan wall: low contrast | Text colour (`src/world/build.ts`) | Near-black ink | Screenshot | `after/43-chapter-complete.png` (re-shot after this change) | IWER | **Fixed** |

Totals: 7 confirmed issues, 7 fixed, 0 partially fixed, 0 blocked. Playwright smoke found nothing (it checks structure, not what is drawn): 20 of 20 passed before and after.

## 3. Observations that are not defects, or not provable here

- The emulator's own overlay ("Remote Control Active", and in one shot its hand-inspector panel) appears in IWER screenshots; it is not part of the game. Clean game stills are in `artifacts/screenshots/`.
- The emulated head stands at 1.6 m, so Room Zero looks straight at a bare wall with the pigeonhole rack low in view; a seated player at 1.2 m will see it differently. Not changed.
- The Surveyor is small at the far end of the corridor (about 25 px in a 762 px view). That is distance, by design; the figure reads when closer (see `artifacts/screenshots/surveyor-encounter.png`).
- The letter's "ROOM 0" and the four settings seals are tiny at the default view. Legibility on a headset display is unknown; **not tested**.
- The pause state darkens the view with no text; on a headset the system menu is what pauses the game. Not changed.
- The radiator in the foyer reads as two black monoliths (iron material, no highlight). Art, P3, not changed.
- Console during the run: the only error is the one injected on purpose for the error-card shot. No failed or 4xx resources in either phase.

## 4. Counts

Screenshots: 30 IWER shots before and 30 after (`before/`, `after/`; shot 43 was re-shot once after V7), 6 Playwright page shots (`playwright/`, three viewports before and after), 3 Browser Plugin shots (`browser-plugin/`), plus derived contact sheets and 5 before/after comparisons.

## 5. Tests and builds run

`npm run check` (type check, three layer rules, 78 unit tests, 5 model checks): pass. `npm run build`: pass. `node tools/qa/playwright-smoke.mjs before|after`: 20 of 20 each. `node tools/qa/regression-checks.mjs`: 6 of 6. The full RT-01 to RT-24 matrix after the fixes: **24 of 24 pass** on the final build (an earlier full run after these fixes failed RT-14 and RT-19; both were test-side faults, explained in `../runtime-investigation/REPORT.md`, and the test fixes are the only changes).

## 6. Reproduce

```
npm run build
node tools/serve-dist.mjs 4173                         # loopback only
npx iwsdk dev up --headless --allow-browser-automation  # emulator session
node tools/qa/capture-states.mjs before|after           # 30 shots
node tools/qa/sheet.mjs after                           # contact sheets
node tools/qa/playwright-smoke.mjs after http://127.0.0.1:4173/
node tools/qa/regression-checks.mjs
```
