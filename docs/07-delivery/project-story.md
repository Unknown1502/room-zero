# ROOM ZERO: The Unreturned Letter

## Inspiration

A letter addressed to a room that no longer exists is a small, odd problem. We wanted to see if VR could make that problem feel physical without a controller, a locomotion stick, or a tutorial screen. The result is a puzzle chapter you play seated, with just your hands.

## What it does

You hold an ordinary letter. The room it is addressed to, Room Zero, is missing from the house. To deliver it, you reconnect the house yourself.

- **Move by pointing.** Point at a lit lamp and pinch to go there. You never walk or teleport blindly.
- **Rewire with seams.** The house is held together by seams. Pinch a brass grip and slide it, and rooms reconnect. Heavier seams need two hands: one braces, the other pulls.
- **Turn the room itself** to open the Wrong Door.
- **You are not alone.** The Surveyor walks the same doorways you open. It plans its route through the same house graph you are rewiring, so every seam you move changes where it can go.
- **Make room for Room Zero**, work the lift while the Surveyor closes in, and deliver the letter. The last card reads: *you are the return address.*

The chapter has 11 rooms and 6 seams, and takes about seven minutes. It is built for Meta Quest 3 and 3S.

## How we built it

- **Stack:** IWSDK 1.1.0, Three.js, TypeScript, WebXR.
- **Architecture:** a pure TypeScript domain layer (rules, content, save data) kept separate from input systems and presentation. The house graph is the single source of truth, and the Surveyor is a deterministic state machine on a fixed 50 ms tick. That makes the AI testable instead of a black box.
- **Procedural world:** rooms, props and the Surveyor are generated from a small kit of shared materials, then static meshes are merged per module to keep draw calls low.
- **Hands-only input:** pinch and point, with short in-room prompts that appear only when you first need them.

## Challenges

- **Testing without a headset in the loop.** We built a harness that drives the Meta IWER Quest 3 emulator through 24 runtime tests (RT-01 to RT-24). It caught real bugs, for example taking the letter could flip the "hands" setting because the settings seals answered to any fingertip. That is fixed and has a unit test.
- **Making a Surveyor you can read.** It needed to feel present and fair, not scripted, so everything it does follows the same graph the player changes.
- **Performance.** Static merging and shared materials keep the desktop emulator at about 60 fps in every scenario we measured.

## Accomplishments

- A complete, playable chapter from title to ending.
- A graph-driven AI that reacts to what the player rewires.
- 78 unit tests, 5 content-model tests, and 24/24 emulator runtime tests passing.

## What we learned

Hands-only seated play forces clarity. If a gesture needs explaining twice, the design is wrong, not the player.

## Honest status

Everything above was verified on a desktop browser and the IWER emulator. **It has not been tested on a physical Quest headset, and no human playtesters have tried it yet.** The demo video is real emulator gameplay with scripted hand input and a synthetic AI narration voice, and it says so on screen.

## What's next

Headset testing on Quest 3 and 3S, human playtests, a proper lighting pass, and more chapters.
