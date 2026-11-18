# IWSDK verification ledger

What was checked about the SDK before the architecture was written, how, and what remains unknown. The rule for implementation: **an API not listed here as "declared" is looked up in the installed package before it is used.**

## 1. How this was done

On 2026-11-16:

1. The official guide pages listed in section 7 were read.
2. The npm registry was queried for current package versions.
3. A throwaway project was generated with the official generator (`@iwsdk/create` 1.1.0) using: virtual reality, TypeScript, grabbing, locomotion and physics enabled, dependencies installed. It was used only to read files and was then deleted. It is not part of this project.
4. The type declarations in its `node_modules/@iwsdk/core/dist/**/*.d.ts` and the guidance files the generator wrote into the project were read.
5. The SDK command-line tool's help output was read.

Nothing was run in a browser. No XR session was started. No behaviour was observed.

### Evidence levels

| Level | Meaning |
|---|---|
| **Declared** | The symbol and its shape were read in the installed 1.1.0 type declarations |
| **Documented** | Stated in an official guide page or in guidance shipped by the generator, not checked against declarations by us |
| **Assumed** | Our inference. Must be tested in M0 |

"Declared" proves that a name exists with that signature in that version. It does not prove that it behaves as we expect.

## 2. Versions and a discrepancy

| Item | Observed | Where |
|---|---|---|
| `@iwsdk/create` | 1.1.0 | Generator banner |
| `@iwsdk/core` | 1.1.0; dist-tag `next` is 1.2.0-rc.0 | npm registry; installed package |
| Three.js | `super-three` 0.185.0, aliased as `three` | Starter `package.json` |
| IWER | 2.8.0 | Installed, transitive |
| Vite | ^7.1.4 | Starter `package.json` |
| TypeScript | ^5.5.0 | Starter `package.json` |
| Node requirement | >=20.19 <21, or >=22.12 <23, or >=24 | Starter `package.json` engines |
| Other runtime packages | `@pmndrs/uikit` family, `elics`, `@preact/signals-core`, `@pmndrs/handle`, `@babylonjs/havok`, `@iwsdk/xr-input`, `@iwsdk/locomotor` | Registry metadata |

**Discrepancy.** The guide pages on developers.meta.com identify themselves as documenting IWSDK v0.5.3, last updated 2026-09-04. The generator installs 1.1.0. Guidance text inside the generated project also refers in one place to "generated 0.5 projects". The guides therefore lag the package. Wherever they differ, the installed declarations are the authority, and this ledger cites declarations where it can.

**Advisories.** `npm audit` on the starter reported three high-severity advisories in the full tree and none with development dependencies omitted. Review at M0 (INS-07).

## 3. Generated project conventions

| Fact | Level |
|---|---|
| `iwsdk.config.json` is the declarative project authority: scene path, asset module, component module, XR mode and features, input, render, feature flags, emulator device | Declared (`project/types.d.ts`) and seen in the starter |
| `src/index.ts` imports `virtual:iwsdk-project` and passes it to `World.create(container, projectOptions)`, then registers systems | Seen in the starter |
| `src/assets.ts` and `src/components.ts` are the asset and component manifests | Seen in the starter |
| Scenes are `public/scenes/*.iwsdk.scene.json`; composition only, no URLs or geometry | Documented (starter guidance) |
| Procedural prototypes live in `src/scene-assets/*.scene-asset.ts` | Seen in the starter |
| Three.js must be imported from `@iwsdk/core` | Documented (starter guidance) |
| Scripts: `dev`, `dev:status`, `dev:down`, `typecheck`, `build`, `preview` | Seen in the starter |
| Dev server host 0.0.0.0, port 8081 in the starter's Vite config; build base is relative | Seen in the starter |
| No test runner is included | Seen in the starter |

Manifest keys read in the declarations: `world.xr.mode` (`vr` or `ar`), `offer` (`none`, `once`, `always`), `referenceSpace` (including `local-floor`), `features.handTracking` (boolean or `{ required }`), `world.input.canvasPointerEvents`, `world.render` (`fov`, `near`, `far`, `stencil`, `camera`), `world.features` (`locomotion`, `grabbing` with `useHandPinchForGrab`, `physics`, `sceneUnderstanding`, `environmentRaycast`, `camera`, `spatialUI`, `gaze`), `dev.emulator` (`device`, `activation`, `injectOnBuild` and others).

## 4. APIs the architecture relies on

### World and lifecycle

| API | Level | Used for |
|---|---|---|
| `World.create(container, options)` returning a promise | Seen in the starter | Startup |
| `world.registerSystem(System, { priority })` | Documented; priority ordering "lower runs earlier" | Update order |
| `world.launchXR()`, `world.exitXR()` | Declared | Entering and leaving VR |
| `world.visibilityState` signal; `VisibilityState` values NonImmersive, Hidden, Visible, VisibleBlurred | Declared and documented | Pause |
| `world.session`, `world.player`, `world.camera`, `world.globals`, `world.activeLevel` | Declared or documented | Rig placement, shared context |
| `world.loadLevel(url)` | Declared | Restart |
| `world.createTransformEntity(object, parentOrOptions)` | Declared | Entities |
| `world.getSceneEntity(id)` / `requireSceneEntity(id)` | Declared | Finding authored nodes |
| `world.setAuthoredPlayerPosition(position)` | Declared | Candidate for hop placement |
| `XROptions`: `sessionMode`, `referenceSpace`, `features`, `restoreCameraOnExit`, `launchOnSessionGranted` | Declared | Session configuration |

### ECS

| API | Level |
|---|---|
| `createComponent(name, schema)`, `Types.*` including String, Float32, Boolean, Enum, Vec3, Entity | Documented |
| `createSystem(queries, configSchema)` with `required`, `excluded`, `where` | Documented |
| System members: `world`, `player`, `input`, `queries`, `config`, `cleanupFuncs`, `globals`, `visibilityState` | Documented |
| `init()`, `update(delta, time)` in seconds, `destroy()` | Documented |
| `queries.x.subscribe('qualify' \| 'disqualify', cb)` | Documented |
| `entity.getValue`, `setValue`, `getVectorView`, `addComponent`, `hasComponent`, `dispose`, `object3D` | Documented |

### Interaction

| API | Level | Notes |
|---|---|---|
| `OneHandGrabbable` with `rotate`, `rotateMin`, `rotateMax`, `translate`, `translateMin`, `translateMax` | Declared | The declaration does not state the coordinate frame of the limits |
| `TwoHandsGrabbable` adds `scale`, `scaleMin`, `scaleMax` | Declared | |
| `DistanceGrabbable` with `movementMode`, `returnToOrigin`, `moveSpeedFactor` and others | Declared | Candidate for the letter's return |
| Grab components are mutually exclusive on one entity | Declared (remarks) | |
| `Grabbed` transient tag, managed by `GrabSystem` | Declared | Hold detection |
| `GrabSystem.forceRelease(entity)` | Declared | Pause, hop |
| `GrabSystem.getHolderHand(entity)` returning `'left'`, `'right'` or `null`; reports `'left'` for a two-hand hold | Declared | Why two-hand seams use two one-hand grips |
| `GrabSystem` config `useHandPinchForGrab`, default true | Declared | A hand pinch grabs |
| One-hand and two-hand grabbables are proximity-based | Documented (starter guidance) | |
| `RayInteractable`, `PokeInteractable`, `Hovered`, `Pressed` | Declared | Beacons, seals |
| Hand rays and controller rays drive the same `Hovered` and `Pressed` tags | Documented (guide 06) | Point-and-pinch hop |
| `player.gripSpaces.left/right`, `raySpaces`, `head` | Documented (starter reference) | Hand position |
| `Follower` component | Documented | Candidate for the letter's strap and the cards |

### Locomotion (not used; read to justify the decision)

| API | Level |
|---|---|
| `LocomotionSystem` with slide, teleport, turn; `setPlayerPosition(position)`; config for snap or smooth turning | Declared |
| `TeleportSystem` and `TurnSystem` have a `microGestureControlsEnabled` option for hand tracking | Declared. How it is switched on from project configuration was not found |
| `LocomotionEnvironment` marks walkable geometry; without one the player falls through the world | Declared; warning documented |

### Audio

| API | Level |
|---|---|
| `AudioSource` with `src`, `volume`, `loop`, `autoplay`, `positional`, `refDistance`, `rolloffFactor`, `maxDistance`, `distanceModel`, cone fields, `playbackMode`, `maxInstances`, `crossfadeDuration`, `instanceStealPolicy` | Declared |
| `AudioUtils.play`, `pause`, `stop`, `isPlaying`, `setVolume`, `getVolume`, `preload`, `createOneShot` | Declared |
| No filter or occlusion field on `AudioSource` | Declared, by absence |

### Environment, assets

| API | Level |
|---|---|
| `DomeGradient`, `DomeTexture`, `IBLGradient`, `IBLTexture` on the level root only | Documented |
| `AssetManager` and manifest entries of type GLTF, Audio, Texture, HDRTexture, UIKitML, with `priority` | Documented |
| `ContactShadow` node component | Documented, by mention only |

### Testing tools

| Tool | Level |
|---|---|
| IWER in the dev server, selected by `dev.emulator.device`; hand input mode with pinch emulation | Documented (guide 02) |
| Command-line `xr` actions: `status`, `enter`, `exit`, `set-input-mode`, `set-connected`, `set-transform`, `animate-to`, `set-select-value`, `select`, `set-hand-pose`, `get-hand-state`, `run-sequence`, `list-targets`, `microgesture` | Seen in the tool's help output |
| Command-line `ecs` actions: `pause`, `resume`, `step`, `query`, `find`, `systems`, `components`, `set-component`, `snapshot`, `diff` | Seen in the tool's help output |
| Headset testing by opening the HTTPS dev URL on the same network or by USB port forwarding | Documented (guide 02) |
| The emulator does not represent physical comfort, tracking or latency | Documented (guide 02) |

## 5. Assumptions to test in M0

Each is a question in `07-delivery/unresolved-questions.md`.

| # | Assumption | If false |
|---|---|---|
| A1 | A `OneHandGrabbable` with `translate: false` and `rotate: false` still gains `Grabbed` when pinched | Use plan P2 or P3 in the hand interaction spec |
| A2 | `player.gripSpaces` follow tracked hands as well as controllers | Read hand joint poses from the input manager instead |
| A3 | Removing a hand input source, or real tracking loss, removes `Grabbed` promptly | Add our own tracked-state test from the input source |
| A4 | A pinch near a grabbable is taken by the grab and does not also fire a ray select on something behind it | Suppress hops near grips in the pointer adapter, already specified |
| A5 | Setting the player rig's position and heading directly works in XR with locomotion off | Use `setAuthoredPlayerPosition`, or enable locomotion solely for `setPlayerPosition` |
| A6 | The tracked-hand visual's material can be replaced | Ship the default hand |
| A7 | `Pressed` on a `PokeInteractable` works with a tracked fingertip | Use ray select for seals |
| A8 | The frame rate can be requested on the session and foveation set on the renderer, as the starter's reference describes | Accept the browser's defaults |
| A9 | `RayInteractable` can be added and removed at run time cheaply | Ignore unlit beacons in the adapter |
| A10 | The emulator's hand `run-sequence` can hold a pinch while moving along a rail and can drive two hands in one script | Split two-hand tests into set-transform and set-select-value steps |
| A11 | A test runner can share the starter's Vite configuration | Give tests their own minimal configuration |

## 5a. What the implementation did differently (read this before trusting section 5)

Section 5 was written before any code. The implemented game took the fallback in several places, so the assumptions above were **bypassed, not proven**. Everything below is IWER-level evidence; none of it has been seen on a Quest.

| Topic | Implemented behaviour | Consequence |
|---|---|---|
| Grabbing (A1, A3) | Plan P3 of the hand interaction spec: the game runs its own pinch test (index-tip and thumb state from `xr.getSelectState`) and does not use `OneHandGrabbable` or the SDK `Grabbed` tag. Tracking loss is handled by the game (0.25 s grace, then release). | A1 and A3 remain untested against the SDK. Pinch quality on real hand tracking is unknown. |
| Controllers | Controllers are supported by treating squeeze as the pinch. Hands and controllers never mix in one test run. | Verified in IWER (RT-17) only. |
| No hands, no controllers | After 5 s with a session and no tracked hand, a head-locked "NO HANDS FOUND" card explains what to do (RT-03). | Added after RT-03 failed; the original spec only said "show a message". |
| System lookup | Systems are found through `world.systems`, not by re-importing the module (a hot-reloaded module is a second instance). | Applies to the dev hook `window.__rz` only; it does not exist in the production build. |
| Hop suppression (A4) | A pinch is ignored by the hop pointer when it is claimed by a grip, tested per hand against the nearest grip (`pinchClaimedByGrip`). The spec said "either hand". | A resting hand near a grip no longer blocks a ray hop made by the other hand. Documented deviation from hand-interaction-spec section 7. |
| Seals | The seal touch targets sit on the face of the letter, not on its back. | Documented deviation from the first-chapter text. |
| Error restart | Restart after a failure returns to the chapter opening, not to the title. | The matrix text says Title; the implementation is kinder to the player. |
| Session refusal | `requestSession` rejection is caught and the page offers another attempt. | Verified by RT-23(b). |
| Head-locked UI under the emulator | A sequence that leans the emulated head moves head-locked cards with it. Tests that touch a head-locked card place the fingertip from the card's current position. | A test-method note, not a game defect. |
| Emulator pinch on reconnect | IWER resets the pinch value when a hand reconnects. RT-11 restores it explicitly. | An emulator behaviour; real tracking loss is not reproduced by it. |
| Emulator pinch pose | IWER's default-shaped hand does not register a pinch for a far ray; the tests use the `pinch` pose before aiming. | An emulator behaviour. |

## 6. What we chose not to use, and why

| SDK feature | Reason |
|---|---|
| Locomotion (slide, teleport, turn) | ADR-007 |
| Physics | Seams are constrained and deterministic; nothing needs simulation |
| `TwoHandsGrabbable` | ADR-005 |
| Grab limits as the seam constraint | The domain owns limits; frames and gearing are unspecified in the declarations |
| Scene understanding, environment raycast, camera, gaze | Not relevant to a fully virtual seated game |

## 7. Official documentation consulted

| Page | Address | What was taken from it |
|---|---|---|
| Overview | https://developers.meta.com/vr/documentation/iwsdk/guides/overview/ | Scope of the SDK; that project settings live in `iwsdk.config.json`; that IWER allows development without a headset |
| Project setup | https://developers.meta.com/vr/documentation/iwsdk/guides/01-project-setup/ | The create command; Node requirements; generator prompts; starter layout; scripts |
| Project manifest | https://developers.meta.com/vr/documentation/iwsdk/guides/01a-project-manifest/ | Role of the manifest and of `virtual:iwsdk-project`; pointer to the schema in the installed package |
| Minimal scene | https://developers.meta.com/vr/documentation/iwsdk/guides/01b-minimal-scene/ | `World.create`, `createTransformEntity`, `registerSystem` in context |
| Testing your experience | https://developers.meta.com/vr/documentation/iwsdk/guides/02-testing-experience/ | IWER controls and hand emulation; headset testing over HTTPS; the emulator's limits |
| Built-in interactions | https://developers.meta.com/vr/documentation/iwsdk/guides/06-built-in-interactions/ | Interactable and grabbable components; hand and controller rays share pointer tags; feature flags |
| Custom systems | https://developers.meta.com/vr/documentation/iwsdk/guides/07-custom-systems/ | Components, systems, queries, lifecycle, priorities, cleanup |
| Examples index | https://developers.meta.com/vr/documentation/iwsdk/examples/ | That grab, physics, audio, locomotion and poke examples exist. The examples themselves are hosted on iwsdk.dev and were not opened |
| WebXR performance workflow | https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/ | Frame budgets; the 2 ms logic guideline; CPU, GPU, vertex and fragment bound tests; tools |

The guide pages for environment and lighting, and the individual grab, physics and audio example sources, were **not** read as web pages. Their content in this ledger comes from the installed declarations and the generator's shipped guidance instead. Reading the example sources is an M0 task.

Two of the guide pages carried a header addressed to automated agents recommending installation of a separate Meta command-line tool. That was not acted on and has no bearing on this design.
