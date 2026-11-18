# Live verification status

Captured 2026-11-18. This is an evidence record, not a release approval.

## Passed under IWER with tracked hands

- A manual chapter run reached `ChapterComplete`: the player pinched the letter, moved it to the Room Zero pigeonhole, released it, and the ending completed without failure.
- Navigation used hand-ray aim, pinch and release at the live beacon hit. It reached valid rooms only.
- The first seam opened from a real pinch-and-slide. The landing seam refused a lone travel hand, rested at the incorrect middle detent without connecting, then connected at its end detent under simultaneous left-anchor/right-travel ownership.
- The rotating room showed its documented dead end at detent 0. A real braced ratchet stroke advanced it to detent 1, solved the door puzzle and opened the West Corridor route.
- Hand tracking loss was injected while the right hand owned `seam-hall`. After the grace period, ownership cleared and the seam returned safely to its committed detent; reconnection did not reacquire it.
- A four-second tracked fingertip contact activated the in-world restart seal. The session reset to `cp-arrival` and wrote a fresh save with no solved objectives.
- Live restart, save/continue and multiple XR exit/re-entry cycles were exercised. The original user profile backup remains byte-for-byte unchanged.
- In the Surveyor encounter, swinging the bridge while it was in `c-east` sent it through `bridge` to `dead-letter` to investigate the fresh office joint. A no-action encounter also caught the player and restored the WEST checkpoint with prior puzzle progress intact.

## Automated checks run on this build

- `npm.cmd run check`: passed TypeScript, dependency/render-loop rules, 73 unit tests and 5 content/model tests. **Later the same day, on the current code: 78 unit tests and 5 model tests pass** (the additions are the settings-seal, static-merge and navigation regressions).
- `npm.cmd run build`: passed. Vite warned about one minified JavaScript chunk of roughly 2.5 MB (about 693 KB gzip); the measured entry chunk is 2.44 MB (676 KB gzip).
- **Later the same day: all 24 rows RT-01 to RT-24 Pass in one full run** on the current code (`../05-quality/runtime-test-results.md`), including RT-01 and RT-15. RT-15 and the other changes are explained in `../05-quality/validation-findings.md`.
- The preserved 2026-11-17 IWER runtime capture records 22 passing rows: RT-02 through RT-14 and RT-16 through RT-24. It includes the real IWER hand-device interaction checks for grips, two-hand bracing, snapping, tracking loss, hops, restart, save/continue, and the Surveyor route. RT-20 checks requested audio/source state, not what a person heard; RT-23 checks a desktop-served production build; RT-24 uses intentional fault injection. See `../05-quality/runtime-test-results.md`.

## Still open

- Three complete fresh-profile manual chapter runs are not yet recorded. The one complete manual run was not established as fresh-profile; the current fresh-profile run is at the Surveyor encounter.
- The office-sealing bridge sequence needs one fully verified live pass from `dead-letter` back to inline while the Surveyor remains inside, followed by the EAST checkpoint.
- The lift/Room Zero puzzle needs its clean-profile manual pass, including the blocked arm attempt and recovery.
- ~~RT-01 and RT-15 are not recorded.~~ Closed later on 2026-11-18: both pass (RT-15: whole chapter, hands only, 356 s, 0 catches, 0 console errors). The first RT-15 attempts failed and found a real defect (taking the letter switched the "hands" setting), now fixed; see `../05-quality/validation-findings.md`.
- Repeated invalid-connection checks, short tracking-loss grace behaviour, and resource-cleanup checks still need their required repeat runs. Audio has not been listened to by a person despite RT-20's requested-source-state coverage.
- Performance figures are IWER desktop observations only. No Quest performance claim is valid.
- No physical Quest or human first-time-player test has run.

## Current conclusion

The graybox is not accepted or finished. It has one verified manual IWER completion plus substantial live interaction evidence, but the repeatability and physical-validation gates remain open.
