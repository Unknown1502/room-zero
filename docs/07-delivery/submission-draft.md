# Room Zero submission draft — do not publish yet

This is local submission copy for a future, verified release. It is not a Devpost submission, a public listing, a hosting claim, or a claim of physical Quest testing.

## Listing fields

- **Project name:** ROOM ZERO: THE UNRETURNED LETTER
- **Track:** Gaming
- **Proposed tagline (113 characters):** A hands-first VR puzzle-horror where you rearrange an impossible house—and your pursuer follows the same doors.
- **Proposed division:** New Experience only if competition eligibility confirms that the project was conceived and built in the competition window.
- **Target platform:** Meta Quest 3 and Quest 3S through the Quest Browser / WebXR.

## Short description

ROOM ZERO is a seated, hands-first VR puzzle-horror chapter. You are a night courier carrying a letter to a room that no longer exists. Pulling brass architectural seams changes which oversized rooms connect. The Surveyor—the house's caretaker—uses that same doorway graph, so you escape it by changing the house rather than by running from it.

## Inspiration

We wanted hand tracking to operate at architectural scale rather than only as a replacement for menu clicks. In Room Zero, one physical verb—grabbing and moving a constrained seam—opens routes, solves puzzles and changes the pursuer's route. The house is deliberately fair: the Surveyor does not teleport or cheat through walls; it follows the same connections the player creates.

## How it works

The chapter is built around an authoritative HouseGraph of room modules and doorway sockets. A player moves one of six authored seams, which recomputes valid doorway connections. Seated players travel by aiming a hand ray at a reachable beacon and pinching. Two of the seams require a brace hand and a travel hand; invalid or incomplete placements return safely and provide visual/audio feedback.

The Surveyor's state machine plans routes only across the live HouseGraph. In the encounter, the player swings a bridge to create a new joint, draws the Surveyor into the Dead Letter Office, then removes the joint to seal it safely away. The final puzzle uses the same seam system to clear a lift, dock Room Zero, and deliver the letter.

## How it was built

- IWSDK 1.1.0, TypeScript, Three.js (through `@iwsdk/core`) and WebXR.
- A deterministic TypeScript domain model for seams, connectivity, puzzles, saves, recovery and the Surveyor.
- Procedural architecture, canvas textures and a procedural animated Surveyor authored in the repository; no downloaded model or texture is required by the chapter.
- 31 local procedural WAV assets for seams, the Surveyor, UI feedback and the ending.
- Accessibility controls for one-hand mode, reduced intensity and snap-turn settings.

## Testing disclosure

As of 2026-11-18, static verification passes: TypeScript, architecture rules, 78 unit tests and 5 model/content tests (all 288 house configurations enumerated). The IWER Quest 3-profile runtime matrix, RT-01 to RT-24, passes 24 of 24 in one full run on the current code, including one uninterrupted hands-only run of the whole chapter. Emulator performance and a draw-call reduction are measured (desktop emulator only). The fresh-profile playthrough counts are in `../05-quality/validation-findings.md`.

This is not enough to claim release readiness. Physical Quest testing, first-time-player testing, headset performance measurements and human audio review have **not** been done. Art is procedural placeholder. IWER is a browser-based XR emulator, not a headset. The gameplay video is real footage from the emulator and says so on screen.

## Planned next steps

Finish the runtime and repeatability evidence, test the release build on Quest hardware, conduct a first-time-player playtest and comfort round, record genuine gameplay, and then host the build over HTTPS for judges. The chapter can grow into additional delivery routes and new room configurations, but the current priority is completing and validating this first chapter.

## Submission assets still required

| Asset | Current status | Submission-safe action |
|---|---|---|
| Public HTTPS build URL | Not hosted | Host only after release validation and user authorization. |
| Gameplay video, under three minutes | Recorded and cut (2026-11-18): `artifacts/recordings/trailer-take4.mp4`, 170 s, from one real uninterrupted emulator run (raw: `take4.webm`, 413 s; cut list: `trailer-take4-cuts.json`). Silent; footage is the IWER desktop emulator and says so on screen. Not uploaded. | Review it, decide whether the graybox look and the missing sound are acceptable, and upload it yourself (no upload was made). Record on a Quest for a stronger submission. |
| Screenshots | Development/IWER captures exist, but include emulator overlays | Capture clean production screenshots; do not submit IWER-control screenshots. |
| Title and licence audit | Not complete | Verify title conflicts and runtime dependency licences before public release. |
| Final test evidence | Incomplete | Record RT-01, RT-15, three fresh profiles and physical Quest results before claiming final readiness. |

