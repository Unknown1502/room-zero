# Room Zero: final release report (2026-11-18)

Classes: VERIFIED (evidence in the repo) / IMPLEMENTED BUT NOT VERIFIED / NOT TESTED / BLOCKED / NOT APPLICABLE. Evidence is emulator and automated only; **no Quest, no human participant**.

## 1. Baseline (re-measured this session, not taken from the earlier report)

| Item | Class | Evidence |
|---|---|---|
| Type check, layer rules, 78 unit tests, 5 model checks | VERIFIED | `npm run check` |
| RT-01 to RT-24, 24 of 24, final build | VERIFIED | `docs/05-quality/runtime-test-results.md` (an earlier full run after the visual fixes failed RT-14 and RT-19; both were test-side faults, fixed, then 24 of 24) |
| Full hands-only chapter | VERIFIED | RT-15; 3 of 3 fresh-profile runs; `qa/runtime-investigation` clean session to the stair head |
| Production build | VERIFIED | `npm run build`; no injection strings, hooks or emulator code (`qa/runtime-investigation/prod-check.json`) |
| Draw calls 806 to 230 foyer, 1064 to 350 transitions; about 60 fps desktop emulator | VERIFIED (emulator only) | `docs/05-quality/performance-report.md` |

## 2. Changes this session

| Change | Class | Evidence |
|---|---|---|
| Seven visual defects fixed (web-page overlap, flat closing title, small last-line card, error-card overlap, lift z-fighting, label alignment, title contrast) | VERIFIED | `qa/visual-audit/report.md`, before and after screenshots, 6 of 6 numeric checks |
| First-action prompts (touch a seal, point at the lamp, pinch the grip, brace and pull) | IMPLEMENTED BUT NOT VERIFIED as a UX improvement (screenshots show them; no person used them) | `qa/experience-polish/after/`, `reports/sheet-prompts-after.png` |
| Failure path releases running loops | VERIFIED (loop levels, not listened to) | `qa/runtime-investigation/REPORT.md`, 14 of 14 |
| Settings seals can no longer fire when reaching for the letter | VERIFIED | earlier sprint; unit test, RT-15 |

## 3. Audio

31 files analysed technically (`qa/experience-polish/reports/audio-audit.md`): all 16-bit mono 22.05 kHz, none empty or clipped, one at -0.4 dBFS peak (`thud`), RMS spread 20.7 dB, all referenced by the game. **Auditioned by a person: NOT TESTED. Auditioned by the assistant: no (no playback capability).** No audio was changed: nothing in the analysis showed a defect.

## 4. Browser QA

| Tool | Class | Result |
|---|---|---|
| Playwright (`playwright-core`) | VERIFIED | 20 of 20 smoke checks, three viewports, before and after; no console errors, no failed requests |
| Browser Plugin (Playwright MCP) | VERIFIED for the production page over loopback HTTP; **BLOCKED** for the dev server (`ERR_CERT_AUTHORITY_INVALID`, certificate not bypassed); NOT APPLICABLE for in-VR states (no XR session in that browser) | `qa/visual-audit/browser-plugin/` |
| IWER | VERIFIED | 30 states per phase, RT matrix, repeat runs |

## 5. Not done (needs a decision, a person or a device)

| Item | Class |
|---|---|
| Art direction, lighting and material upgrade of the 11 rooms; Surveyor visual upgrade; title screen redesign | NOT DONE (only the defects above were fixed) |
| Trailer re-edit | NOT DONE this pass; the existing 168 s trailer (`artifacts/recordings/ROOM-ZERO-trailer.mp4`) predates the prompts and is unchanged |
| Public HTTPS hosting | NOT DONE, needs your approval and an account; `docs/07-delivery/hosting-guide.md` and `public/_headers` are ready |
| Devpost rules re-read and submission | NOT DONE; draft in `docs/07-delivery/submission-draft.md`; New Experience eligibility and title clearance are your decisions |
| Quest validation; first-time-player test | NOT TESTED; checklist and observation script in `docs/07-delivery/quest-and-human-test-kit.md` |

## 6. Internal scorecard (not a prediction)

Innovation 7, Experience Design 5 (was 4), Technical 7, Polish and Presentation 4 (was 3). The 7+ targets for Experience Design and Polish are not met.
