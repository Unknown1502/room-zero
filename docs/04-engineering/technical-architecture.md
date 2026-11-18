# Technical architecture

Baseline 1.0. Diagrams are in `architecture-diagrams.md`. SDK facts are evidenced in `iwsdk-verification.md`.

## 1. Goals

1. The rules of the game can be run and tested with no headset, browser or renderer.
2. The house graph is the only authority on connectivity.
3. Everything the SDK already does well is left to the SDK.
4. SDK-specific code is confined to a thin band, so an SDK upgrade or a wrong assumption about it is cheap to absorb.
5. Hands-only play, 72 frames per second on Quest 3, no network.

## 2. System context

The player's hands and head are tracked by the headset. The Quest Browser exposes them through WebXR. IWSDK owns the XR session, the render loop, input sources and the entity component system. Our application sits on IWSDK: adapters turn input into commands, the gameplay domain applies them, and presentation systems draw and sound the result through Three.js and the SDK's audio. The only external services are a static web host and the browser's local storage.

## 3. Layers

| Layer | Contents | May depend on | Must not depend on |
|---|---|---|---|
| A. Platform and XR runtime | IWSDK world, XR session, renderer, player rig, input sources, audio runtime, asset loading | Browser, SDK | Anything of ours |
| B. Input adapters | Hand and pointer adapters; lifecycle adapter; storage adapter | A; command types from C | Domain internals; presentation |
| C. Gameplay domain | `domain/**`, `content/**` | Nothing outside itself | Three.js, IWSDK, DOM, browser APIs, B, D, E, F |
| D. Application systems | Game Director, command queue, hop coordinator, event dispatch | A, B, C | E's internals |
| E. Presentation | View and audio systems, scene, assets | A; the view and events of C through D | Writing to C; deciding rules |
| F. Persistence | Save codec, validation, migration | C's pure domain/content modules | A to E. Storage is injected |

### Dependency rules, enforced

| Rule | Enforced by |
|---|---|
| `src/domain/**` and `src/content/**` depend only on those pure rule and content modules | INS-01, an import-graph check in the test run |
| `src/persistence/**` may depend on domain and content code, but not runtime or browser APIs | INS-01 |
| IWSDK imports stay in the runtime integration paths: `app`, `systems`, `world`, `components`, the component/asset manifests, and the entry point | INS-01 |
| Nothing imports `three` directly | INS-03 |
| No `requestAnimationFrame`, `setAnimationLoop`, `setInterval` or `setTimeout` driving simulation | INS-02 |
| Runtime systems adapt input and present application state; rule decisions stay in `domain/**` | INS-01 plus review |

## 4. Layer A: platform

Provided by IWSDK and configured by `iwsdk.config.json`, the project's declarative authority, passed whole to `World.create()` through the `virtual:iwsdk-project` module.

| Concern | Setting |
|---|---|
| XR mode | `vr`; reference space `local-floor`; hand tracking requested as optional |
| Features on | `grabbing` (with pinch-to-grab), `spatialUI` only if the two cards use UIKitML |
| Features off | `locomotion`, `physics`, `sceneUnderstanding`, `environmentRaycast`, `camera` (REQ-PLAT-008) |
| Scene | `public/scenes/chapter-one.iwsdk.scene.json` |
| Assets and components | `src/assets.ts`, `src/components.ts` |
| Emulator | `metaQuest3` |

We do not create a renderer, a camera, an animation loop or an XR session. We call `world.launchXR()` from the page's button and subscribe to `world.visibilityState` (REQ-PLAT-006).

## 5. Layer B: input adapters

Adapters read SDK state and emit domain commands. They contain no rules.

| Adapter | Reads | Emits |
|---|---|---|
| Hand input | `Grabbed` on grip entities (appearing and disappearing); `GrabSystem.getHolderHand`; world positions of `player.gripSpaces.left/right`; rail geometry from `GripView` | `GripTake`, `GripDrag`, `GripRelease` with reason |
| Pointer input | `Pressed` on beacon, seal, latch-pin and turn-marker entities | hop requests to the Hop Coordinator; `SealPress`; `LatchPinPress`; snap turn to the rig |
| Letter input | `Grabbed` on the letter; distance to the pigeonhole | `LetterTake`, `LetterRelease` |
| Lifecycle | `world.visibilityState`; session start and end | `SetVisibility` |
| Storage | `localStorage` behind an interface | Loads at boot; writes on `SaveRequested` |

The hand-to-rail projection, the 0.25 s loss grace and the leave-rail test live in the hand adapter. They are pure functions of positions and time and are unit-tested without the SDK by feeding recorded samples.

If the M0 spike shows that plan P1 in `hand-interaction-spec.md` does not work, only this adapter changes.

## 6. Layer C: gameplay domain

Specified in `domain-model.md`. One aggregate, `GameSession`, with `apply`, `tick`, `drainEvents`, `view`, `snapshot` and `hash`. Fixed 50 ms step. Deterministic.

## 7. Layer D: application systems

### The Game Director

One ECS system at priority 10 that is the only writer to the domain. Each frame:

1. Take all commands queued by adapters since the last frame, in order, and `apply` each. Refusals become `GripRefused` and similar events through the domain; nothing else happens.
2. Add the frame's delta to an accumulator, capped at 250 ms. While the accumulator holds at least 50 ms, call `tick()` and subtract 50 ms, at most 5 times.
3. `drainEvents()` once into a per-frame event buffer.
4. Publish the buffer to subscribers and expose the refreshed `view`.

Nothing else calls `apply` or `tick`. This is the explicit orchestration boundary the rules depend on: no rule is decided in a rendering callback (REQ-STATE-004, REQ-STATE-005).

### Hop Coordinator

Sequences a hop: check the view that the hop is possible; force-release grips; start the fade; when black, send `Hop` and place the player rig at the vantage anchor's pose; fade in. If the domain refuses the `Hop`, fade in where the player was.

### Persistence system

Subscribes to `SaveRequested` and `SettingsChanged`; calls the persistence layer.

### Update order

| Priority | System | Layer |
|---|---|---|
| -5 to -1 | SDK: input, grab, UI and others | A |
| 0 | Hand input adapter | B |
| 1 | Pointer and letter input adapters | B |
| 2 | Lifecycle adapter | B |
| 10 | Game Director | D |
| 11 | Hop Coordinator | D |
| 12 | Persistence | D |
| 20 | Module view | E |
| 21 | Grip and rail view | E |
| 22 | Socket feedback: ring of light, blocked outline | E |
| 23 | Surveyor view | E |
| 24 | Lamp view | E |
| 25 | Envelope view | E |
| 26 | Fade | E |
| 30 | Audio director | E |
| 31 | Ambience: dust, lamp flicker | E |
| 90 | Debug overlay, development builds only | E |

The SDK's own guidance is that lower priorities run earlier and its built-in systems use negative values; our numbers follow its suggested bands of input, simulation, visual sync and low-priority work.

## 8. Layer E: presentation

- **Scene.** Authored as an IWSDK scene document. Each module is a subtree under one entity with `ModuleView`. Sockets, grips, beacons and vantage anchors are child entities carrying the matching components. Static geometry and prototypes are declared through the asset manifest, as the SDK requires.
- **Module view.** Reads each seam's `param` from the view and sets the module entity's transform along its path, through a damped follower with the speed cap. It is the only code that moves a module.
- **Surveyor view.** Places the character along an authored path within its room at `walkProgress`, selects clips from state, aims the ring at `towards`.
- **Feedback.** Subscribes to events and plays the entries of `interaction-feedback.md`.
- **Audio director.** Maps events to SDK audio sources; sets each source's level from `view.audioRouteEdges`.

Presentation reads; it never writes to the domain and never decides whether a connection exists (REQ-GRAPH-005). If a mesh and the graph ever disagree, the mesh is wrong.

## 9. Layer F: persistence

A pure codec with `encode`, `decode`, `validate` and `migrate`, and the recovery ladder of `save-schema.md`. It is given a storage interface with `get`, `set` and `remove`, implemented over `localStorage` in the platform layer and by a map in tests.

## 10. ECS integration

Detail in `ecs-design.md`. In summary: components carry presentation data and a domain ID; systems are stateless adapters and views that find entities by query; the domain is a single object reached through a typed accessor over `world.globals`. Game rules are not expressed as ECS components, because they must run without an ECS world.

## 11. Runtime lifecycle

Detail in `runtime-lifecycle.md`: boot, load, title, session start, play, pause, session end, restart, teardown, and the error path.

## 12. Data flow of one seam move

1. SDK grab system sets `Grabbed` on a travel-grip entity.
2. Hand adapter sees it appear, asks which hand, queues `GripTake`.
3. Each frame it projects the hand onto the rail and queues `GripDrag(u)`.
4. Game Director applies them. The domain clamps, computes preview, queues `SeamPreview` or `SeamBlocked`.
5. Module view moves the room toward `param`. Socket feedback draws the ring of light. Audio plays the grind.
6. `Grabbed` disappears. Hand adapter queues `GripRelease('open')`.
7. The domain chooses snap or return and counts down the settle.
8. On the last settle tick the domain commits: recompute graph, diff, objectives, vantages, Surveyor flag. Events are queued in that order.
9. Presentation plays the thud and the ring; lamps light; the Surveyor, on its next tick, replans and emits its count.

The sequence diagram is in `architecture-diagrams.md`.

## 13. Performance architecture

Budgets are in `performance-budget.md`. Architectural measures:

- Baked lighting; no real-time shadows; no post-processing; one fade sphere.
- Each module is merged into a few draw calls by material. Repeated kit parts and void rooms are instanced.
- Rooms that cannot be seen from the current vantage are hidden by a per-vantage visibility list authored with the scene.
- No allocation in any system's update: scratch vectors are created in `init`; the event buffer and view are reused.
- The domain tick is tens of comparisons. Blocked-stretch computation is cached per configuration and can be precomputed for all 288 at load.
- Shaders and textures are warmed during ChapterIntro by rendering each material once behind the fade.

## 14. Security and privacy

| Concern | Position |
|---|---|
| Network | Static assets only. No requests after load, no analytics, no third-party scripts (REQ-SEC-001). A content security policy on the host restricts sources to the site itself |
| Personal data | None collected. Pose data is used in memory for the current frame and never stored or sent (REQ-SEC-002) |
| Saved data | Local, tiny, validated as untrusted input; contains nothing personal (REQ-SEC-003) |
| Permissions | The WebXR session and hand tracking, granted by the user in the browser. No camera, microphone or location |
| Supply chain | Runtime dependencies are those of the IWSDK starter. The starter's runtime tree reported no advisories under `npm audit --omit=dev` on 2026-11-16; its development tree reported three high-severity advisories, to be reviewed at M0 (REQ-SEC-004, INS-07) |
| Development tooling | The starter installs a headset command-line tool as a development dependency which, by its own notice, collects usage data. Whether to keep it is decided at M0 (Q-17). It is never part of the shipped build |
| Emulator in production | The SDK's emulator injection is configured for local development only and must be off in production builds (verified by RT-23) |

## 15. Technology choices

| Choice | Decision | Alternative considered |
|---|---|---|
| Engine | IWSDK on Three.js | Raw Three.js with WebXR: more control, but we would rebuild input, grab, audio pooling and tooling |
| Language | TypeScript, strict | JavaScript |
| Rules | Plain TypeScript domain | ECS components as game state: cannot be tested without a world |
| Simulation clock | Fixed 50 ms step | Variable step: non-deterministic |
| Physics | None | Havok through the SDK: unnecessary for constrained seams |
| Locomotion | Own vantage hop | SDK teleport: needs walkable geometry and gives an unknown player room |
| Routing | Uniform-cost search | BFS, A*: see ADR-004 |
| Unit tests | Vitest, proposed | The starter ships no test runner. To confirm against the starter's Vite version at M0 (Q-12) |
| Runtime tests | The SDK's command-line tool driving IWER | Hand-written Playwright scripts |
| State management | The domain object plus the SDK's signals for UI-facing values | A third-party store |
| Dependencies added by us | A test runner only | Anything else needs an ADR |
