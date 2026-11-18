# Runtime lifecycle

What happens, in order, from page load to teardown, and the game-state transition table.

## 1. Startup

| Step | What happens | Failure |
|---|---|---|
| 1 | The page loads. A feature check asks whether `immersive-vr` is supported | Not supported: the page explains (REQ-ERR-001). Stop |
| 2 | `World.create(container, projectOptions)` is called with the options from `virtual:iwsdk-project`. The SDK creates the renderer, player rig and systems, loads critical assets and the scene | A critical asset fails: message and retry (REQ-REL-004) |
| 3 | The storage adapter reads the save. The persistence layer validates it and returns a save or `'new'` with a notice flag | Never fails; see `save-schema.md` |
| 4 | The session is created from content, the save and settings. Globals are set. Our systems are registered in priority order | Content validation error in development: error screen |
| 5 | The startup join check runs (`ecs-design.md` section 7) | Error card |
| 6 | Game state: Boot to Title. The Enter VR button is enabled | |
| 7 | The player presses Enter VR. In that gesture: `world.launchXR()`, and the audio context is resumed | Refused: message and retry (REQ-ERR-002) |
| 8 | The session becomes visible. If no hand input source is present, the hands card is shown | |
| 9 | Title: the envelope. A seal press sends `Begin` | |
| 10 | ChapterIntro: behind the fade, each material is drawn once to compile shaders and upload textures. The player rig is placed at the start or checkpoint vantage. Fade in | |

## 2. A frame

The SDK drives the frame. Within its update, systems run by priority (`technical-architecture.md` section 7):

1. **SDK systems** update input sources, pointer state, grabs.
2. **Adapters** (0 to 2) read that state and queue commands.
3. **Game Director** (10) applies commands, runs zero to five fixed ticks, drains events, refreshes the view.
4. **Hop and persistence** (11, 12) act on events and requests.
5. **Presentation** (20 to 32) reads the view and events and updates transforms, materials, animation, audio.
6. The SDK renders.

Consequences:

- An input seen this frame affects the rules this frame and is drawn this frame.
- At 72 frames per second and a 50 ms tick, most frames run no tick or one. Motion is smooth because presentation interpolates toward the view; rule changes are at tick boundaries.
- If a frame is late, up to five ticks run to catch up. Beyond 250 ms the surplus is dropped, so a long stall does not cause a burst of simulation.

## 3. Game states and transitions

States: Boot, Title, ChapterIntro, Exploration, PuzzleActive, SeamInteraction, ThreatEncounter, Checkpoint, Pause, FailureRecovery, ChapterComplete (REQ-STATE-001). "Playing" below means Exploration, PuzzleActive, SeamInteraction or ThreatEncounter.

| From | Event or condition | To | Effects |
|---|---|---|---|
| Boot | Assets loaded, save examined, join check passed | Title | Enable Enter VR |
| Title | `Begin('new')` | ChapterIntro | Reset to `cp-arrival` |
| Title | `Begin('continue')` with a valid save | ChapterIntro | Load the save |
| ChapterIntro | Warm-up and fade-in done | Exploration | |
| Exploration | Player is at a station whose objective is unsolved | PuzzleActive | Hint timer runs |
| PuzzleActive | Objective solved, or player hops away | Exploration | |
| Exploration, PuzzleActive, ThreatEncounter | A seam leaves rest | SeamInteraction | Remember origin |
| SeamInteraction | All seams at rest | The remembered origin, re-evaluated | Commit effects have already run |
| Exploration, PuzzleActive | The Surveyor leaves Dormant and has a route to the player | ThreatEncounter | Hints suspended while it is within one edge |
| ThreatEncounter | The Surveyor is Dormant, or has had no route to the player for 4 s | Exploration | |
| Playing | A checkpoint trigger first holds | Checkpoint | `CheckpointReached`, `SaveRequested` |
| Checkpoint | Same tick | The state it came from | Checkpoint is a pass-through state so that saving happens at a defined point |
| Playing | `SetVisibility(false)` | Pause | Force-release grips with return; stop ticking; duck audio |
| Pause | `SetVisibility(true)` | The state it left | Resume ticking and audio |
| Pause | Session ended | Title | The last checkpoint is the resume point |
| ThreatEncounter, SeamInteraction | `PlayerCaught` | FailureRecovery | Stop ticking the Surveyor; presentation plays the capture |
| FailureRecovery | Capture presentation finished (a fixed number of ticks) | ChapterIntro | Load the canonical snapshot of the last checkpoint; increment catches |
| Playing | Letter delivered | Playing (ending steps run) | `EndingStep` 1 to 7 on fixed tick counts, step 4 gated on the Surveyor measuring at the lift, with a 40 s fallback |
| Playing | Ending step 7 done | ChapterComplete | `SaveRequested` with `complete` |
| ChapterComplete | `AckEnding('again')` | ChapterIntro | Reset to `cp-arrival` |
| ChapterComplete | `AckEnding('leave')` | Title | `world.exitXR()` |
| Playing | `Restart` | ChapterIntro | Reset to `cp-arrival`, keep settings |
| Any | Uncaught error | Error state | Stop ticking; error card; restart returns to Title |

Any other pairing of state and event is ignored and logged in development.

Catch is suppressed in Pause, FailureRecovery, ChapterIntro and ChapterComplete because the Surveyor does not tick in them (REQ-ENEMY-009).

## 4. Pause and resume

The SDK's visibility state has four values: not immersive, hidden, visible and visible-blurred. The game plays only when it is `Visible`. Blurred, which occurs when the system menu is open, is treated as paused: hand input may be unavailable to the page then.

On pause the hand adapter sends `GripRelease('forced')` for every held grip, and the domain resolves those as returns, never snaps. A pause therefore cannot commit a move (REQ-STATE-002).

On resume nothing is recomputed: the domain was simply not ticked.

## 5. Session end and re-entry

When the XR session ends, by the system menu or by removing the headset for a long time, the SDK restores the page view. The game goes Pause to Title. The domain object is kept. Pressing Enter VR again returns to Title in VR with "continue" available, which loads the last checkpoint.

We resume from the checkpoint and not from the exact state because the player has lost their bearings and the Surveyor may have been close (REQ-REL-001).

## 6. Restart

`Restart` and "begin again" create a new `GameSession` from content at `cp-arrival`, keep settings, reload the level through the SDK, and re-run the join check. The world, renderer and XR session are not re-created.

## 7. Teardown

Leaving the page: the SDK destroys the world. Each of our systems' `destroy` and `cleanupFuncs` release subscriptions. No timers of ours exist to clear, since nothing uses them (REQ-PLAT-006).

## 8. Errors

| Error | Caught where | Response |
|---|---|---|
| Exception inside a command or tick | Game Director | Stop ticking; error card; log the state hash and the last 50 commands for reproduction |
| Exception in a presentation system | That system's update wrapper | Log once; skip that system for the frame; after three consecutive failures treat as above |
| Asset missing at run time | Asset access | Background asset: placeholder and a log. Critical: cannot happen after Boot |
| Storage unavailable | Storage adapter | Continue without saving |
| Hand tracking lost entirely mid-session | Hand adapter | Releases as specified; the hands card appears after 5 s without any hand |

## 9. Reproducing a bug

Because the domain is deterministic, a bug in the rules is reproduced from three things: the starting save, the list of commands with the tick each was applied on, and the build's content version. Development builds can record and export these. This is the main debugging tool for the Surveyor.
