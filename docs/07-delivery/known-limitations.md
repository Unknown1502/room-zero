# Known limitations

Current evidence and limits for this graybox build, captured 2026-11-18.

## Release status

**Not fully release-ready.** The chapter is complete and playable end to end in the emulator, and every automated and emulator check run so far passes. These release criteria are **not met**, because they need a headset or a person:

- No physical Quest or Quest 3S run has happened: tracking quality, comfort, headset legibility, audio as heard, thermals and device frame rate are unknown. The official 60 FPS minimum on Quest hardware is unmeasured.
- No human has played the game (PT-01 to PT-05 and CF-01 to CF-07 are not run): first-time-player understanding, puzzle difficulty and Surveyor fairness are untested.
- The art is **procedural placeholder** (graybox plus flat generated textures), not production art; milestone M6 was not delivered. The audio is 31 **generated** sounds that **no one has listened to**; their quality is unverified.
- The three fresh-profile full-chapter completions, the save/continue cycles and the three XR exit and re-entry cycles that the final brief asks for have not all been recorded as repeated runs (see `verification-status.md`).

## Current build evidence

- **Update (later on 2026-11-18, supersedes the older bullets below where they differ):** `npm run check` passes with 78 unit tests and 5 model checks; the IWER runner **records all 24 rows, RT-01 to RT-24, as Pass in one full run on the current code**, including RT-15 (the whole chapter, hands only). Details, the defects the runs found, and the emulator quirk are in `../05-quality/runtime-test-results.md` and `../05-quality/validation-findings.md`. Performance and bundle figures are in `../05-quality/performance-report.md`.

- **Graybox chapter is implemented.** The workspace contains the complete chapter flow, accessibility controls, snap turns, recovery UI and a production build. Final art and hosting are not part of this milestone.
- **Automated evidence:** `npm.cmd run check` passed on 2026-11-18 (73 unit tests, 5 model checks and import-rule checks); `npm.cmd run build` passed. The targeted `npm run test:runtime` IWER gate had previously passed twice. Evidence is in `artifacts/m5-live-audit.json`.
- **Manual IWER evidence is stronger but still incomplete.** One full chapter was completed with tracked-hand interactions, including Room Zero letter delivery and the ending. A separate clean-profile run manually reached the Surveyor encounter after completing the first three puzzles. It also exercised wrong answers, two-hand manipulation, tracking loss, restart, save/continue and XR re-entry. See `verification-status.md` for the exact boundary of those checks.
- **Runtime coverage (earlier capture, now superseded; the full 24-row result is in the update above).** The earlier IWER capture recorded 22 passing rows (RT-02 to RT-14 and RT-16 to RT-24); RT-01 and RT-15 were unrecorded then. The targeted M5 gate covers hand-source availability, envelope settings, restart, both snap-turn angles, the reference chapter ending, and error recovery. The automated IWER runner and the one manual run do not replace the required three fresh-profile completions or physical testing.
- **No physical Quest or participant round was run.** Tracking quality, comfort, headset legibility/audio, frame rate, PT-01 to PT-05, and CF-01 to CF-07 remain unverified.
- **IWER is observed, headset behavior is not.** SDK input and application wiring were exercised with IWSDK 1.1.0 and the IWER Quest 3 profile.
- **The production bundle still has an optimization warning.** The start-up script is 2.4 MB (676 KB gzip), and Vite warns above its 500 KB chunk threshold. It is almost all the SDK and three.js; the game's own code is about 124 KB, and no safe reduction was found (`../05-quality/performance-report.md`). Quest startup and memory impact have not been measured.
- **The official guides trail the package.** They describe 0.5.3. Where this package cites a guide and not a declaration, it says so.
- **Not every official page was read.** The environment and lighting guide and the individual example sources were not opened. Their subject matter is covered here from installed declarations and generator-shipped guidance.
- **All numbers are starting values.** Reach envelopes, snap windows, Surveyor timings, speed caps and budgets were chosen by reasoning. None has been tuned with a person or measured on a device.
- **Performance budgets for draw calls, triangles and memory are ours**, not Meta's. Meta's guide supplies frame budgets and method only.
- **The golden-path duration is arithmetic** on authored timings and assumed interaction times.
- **Competitive research was brief.** A handful of searches plus recollection. It supports "we did not find", not "does not exist".
- **The title is not cleared.**
- **Team size and availability of a headset are unknown** to the authors of this package, so there is no schedule and risk R-14 has no likelihood.

## Of this build

- **Graybox visuals.** Eleven rooms from one procedural kit: shaped walls, brass frames, props, flat generated textures, one dim practical light per room. No baked lighting between rooms, no bloom or colour grading. The Surveyor is a procedural figure with a short set of procedural motions, not authored animation.
- **Draw calls.** After a static merge (`src/world/merge.ts`) the foyer view is about 230 draw calls and the busiest measured view about 380, down from 806 and 1064 (desktop emulator; roughly doubled in stereo on a headset). Not shown to be acceptable on a Quest.
- **Settings seals sit on the letter's face**, not its back, and answer only while the letter is offered at the chest (title, chapter opening, pause) and no hand is pinching. The web page before entering VR has the same settings. Restart after an error goes to the chapter opening, not the title.
- **Replay value is small.** The graph has 288 configurations, but the chapter is a fixed sequence of six seams with one intended order: one puzzle chapter with a few alternative sequences, not 288 puzzles.
- **The Surveyor race at the end is tight for a slow player.** The Surveyor reaches the player's vantage in the east corridor about 9 s after the last dock and the lift about 17 s after; a catch returns the player to the last postmark. Under emulator latency (about 1.4 s per command) the race was lost several times in some runs and won with no catch in another. A person's timing is unknown.
- **Controllers** are supported (squeeze to grab, trigger to point); the game is designed and tested for hands.

## Of the emulator evidence

- The emulator drives hands that never tremble, tire or occlude. "n of n" results are statements about the emulator.
- **Emulator quirk:** the first ray press by a hand that has just run a scripted seam sequence is lost (the game receives no press at all); the identical second press works. Not shown to be a game or SDK fault and not tested on a headset. The harness retries and records every loss.
- IWER's pinch resets when a hand reconnects, and its default-shaped hand does not register a pinch on a far ray; the tests work around both and say so.
- Frame time, heap and GPU figures are for a laptop running the development server and say nothing about a Quest.

## Of the design

- **Eleven seats, not free movement.** The player hops between authored vantages and cannot walk or teleport freely.
- **One degree of freedom per seam.** Rooms slide or turn along one path between fixed resting places. The player cannot place a room anywhere else.
- **A small state space.** 288 configurations. Experienced puzzle players will find the chapter easy.
- **A fully predictable enemy.** Once its two rules are understood, the Surveyor can be controlled completely. It will not surprise a player twice.
- **One encounter.** The chapter demonstrates the enemy mechanic once, plus a scripted arrival at the end.
- **Short.** Five to seven minutes when known.
- **The player's room never moves.** The most spectacular possibility, riding a room, is excluded for comfort.
- **No haptics.** Tracked hands cannot feel the grips.
- **Seated reach limits level design.** Everything interactive sits in a box in front of the chair.

## Of the planned build

- **Lighting is baked.** Rooms do not light each other when they move. The Surveyor casts a blob shadow, not a true one.
- **No post-processing.** No bloom, depth of field or colour grading beyond tone mapping.
- **Sound does not model walls.** Loudness follows the number of open doorways between source and listener; direction is true; muffling may be approximate or absent.
- **The Surveyor's animation is modest.** Twelve clips, or seven if capacity is short, with procedural aiming. No facial performance because it has no face.
- **The courier's hands are the SDK's hand visual**, restyled only if the SDK permits.
- **Rooms never entered have no interior.**
- **Quest 3 and 3S are the targets.** Quest 2 is best effort and may run at reduced quality or not acceptably.
- **English only.**
- **Local save only.** Clearing site data erases progress. There is no cross-device continuity.
- **A browser experience.** It needs a network connection to load, shows the browser's entry flow, and is not installable in the slice.
- **Accessibility is partial.** Blind players, and players without use of either hand, cannot play. See `02-experience-design/accessibility.md`.

## Of verification

- **The emulator cannot validate** tracking quality, comfort, legibility on the headset display, audio localisation on headset speakers, or device performance.
- **Model checks prove properties of the rules**, not that people will find the solutions.
- **Small playtests** find gross problems and cannot characterise rare ones.
- **Photosensitivity** is designed for and not formally assessed.

## What would change these

A headset in hand changes most of the second list from "unknown" to "measured". More production capacity would lift the animation, lighting and room-interior limits. A second chapter would be the place to add continuous seams, more than one enemy rule, or a room the player rides, each of which needs its own comfort and softlock work.
