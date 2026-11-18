# ECS design

How the application uses the IWSDK entity component system. SDK conventions quoted here were read from the generated starter's own guidance and declarations (`iwsdk-verification.md`).

## 1. Position

The ECS is used for what it is good at: binding data to scene objects, finding them by query, and ordering per-frame work. It is not where the rules live. The rules are a plain TypeScript object, because they must be testable with no world (`technical-architecture.md` section 10).

So: **components describe how things look and which domain thing they stand for; systems adapt input and draw state; the domain decides.**

## 2. SDK conventions we follow

| Convention | Source |
|---|---|
| Components are declared in a module free of systems, DOM and renderer imports, and exported through `src/components.ts` with `defineComponents()` so the editor can author them | Starter guidance |
| Systems are created with `createSystem(queries, config)`; lifecycle methods are `init`, `update(delta, time)`, `destroy` | Starter guidance, guide 07 |
| Systems are registered explicitly in `src/index.ts` with `world.registerSystem(System, { priority })`; lower runs earlier | Guide 07 |
| Systems do not keep arrays of entities; they use queries and `qualify` / `disqualify` subscriptions | Starter guidance |
| No allocation in `update`; scratch objects are created in `init` | Starter guidance |
| Every subscription's teardown is pushed to `cleanupFuncs` | Starter guidance |
| Vector fields are read and written through `getVectorView`; `setValue` throws on them | Starter guidance |
| Entities are created with `world.createTransformEntity`, never `scene.add` | Starter guidance |
| Three.js is imported from `@iwsdk/core` | Starter guidance |
| `signal.peek()` in `update`, not `.value` | Starter guidance |
| Transient tags `Hovered`, `Pressed`, `Grabbed` are read, never added or removed | Declarations |
| Entities with GPU resources are removed with `dispose()`, not `destroy()` | Starter guidance |

## 3. Our components

All are small. String fields hold domain IDs. Declared in `src/components/*.ts`.

| Component | Fields | On |
|---|---|---|
| `ModuleView` | `moduleId: String` | The root entity of each room |
| `SocketView` | `socketId: String` | A child at each doorway, holding the ring-of-light mesh |
| `GripView` | `gripId: String`, `seamId: String`, `role: Enum(travel, anchor)`, `rail: Enum(line, arc)`, `railLength: Float32`, `railRadius: Float32`, `railAngle: Float32` | Each grip; the entity's parent transform is the rail's frame |
| `LatchPinView` | `seamId: String` | One-handed latch pins |
| `VantageAnchor` | `vantageId: String` | An empty entity whose transform is the seated pose and facing |
| `BeaconView` | `vantageId: String` | Signal lamps |
| `SealView` | `sealId: String` | Wax seals |
| `TurnMarkerView` | `direction: Enum(left, right)` | Snap-turn markers |
| `SurveyorView` | none | The character root |
| `SurveyorPath` | `moduleId: String`, `fromSocket: String`, `toSocket: String` | Authored walk paths inside rooms |
| `LetterView`, `PigeonholeView`, `FadeView` | none | One each |
| `AudioEmitter` | `channel: Enum` | Entities that carry an SDK audio source the audio director controls |
| `VisibleFrom` | `vantages: String` (comma-separated IDs) | Room roots, for visibility sets |

SDK components used alongside: `Transform`, `Visibility`, `RayInteractable` (beacons), `PokeInteractable` (seals, pins, markers), `OneHandGrabbable` (grips, the letter), `AudioSource`, and the environment components on the level root.

A grip entity therefore carries `GripView` plus `OneHandGrabbable`; a beacon carries `BeaconView` plus `RayInteractable`.

## 4. Our systems

| System | Priority | Queries | Reads | Writes |
|---|---|---|---|---|
| `HandInputSystem` | 0 | grips: `GripView`; held: `GripView` + `Grabbed`; letter | Grip-space positions; `GrabSystem.getHolderHand` | Command queue |
| `PointerInputSystem` | 1 | `BeaconView` + `Pressed`; `SealView` + `Pressed`; `LatchPinView` + `Pressed`; `TurnMarkerView` + `Pressed` | View | Command queue; hop requests; rig heading |
| `LifecycleSystem` | 2 | none | `visibilityState` | Command queue |
| `GameDirectorSystem` | 10 | none | Command queue | Domain; event buffer; view |
| `HopSystem` | 11 | `VantageAnchor`; `FadeView` | View, hop requests | Player rig pose; command queue; fade target |
| `PersistenceSystem` | 12 | none | Events | Storage |
| `ModuleViewSystem` | 20 | `ModuleView` | View | Module transforms |
| `GripViewSystem` | 21 | `GripView`; `LatchPinView` | View, events | Grip transforms and materials |
| `SocketFeedbackSystem` | 22 | `SocketView` | Events | Ring and outline visibility and intensity |
| `SurveyorViewSystem` | 23 | `SurveyorView`; `SurveyorPath` | View, events | Character transform, animation, chalk marks |
| `LampViewSystem` | 24 | `BeaconView` | Events | Lamp emissive, `RayInteractable` presence |
| `EnvelopeViewSystem` | 25 | `LetterView`; `SealView` | View, events | Letter transform, textures |
| `FadeSystem` | 26 | `FadeView` | Fade target | Sphere opacity |
| `AudioDirectorSystem` | 30 | `AudioEmitter` | Events, view | SDK audio requests and levels |
| `AmbienceSystem` | 31 | ambience tags | View | Particles, flicker |
| `VisibilitySetSystem` | 32 | `VisibleFrom` | View | `Visibility` |

Notes:

- `HandInputSystem` reacts to a grip gaining `Grabbed` by subscribing to `qualify` on its `held` query, and to losing it with `disqualify`. Between the two it reads the holding hand's position each frame.
- `LampViewSystem` removes `RayInteractable` from unlit beacons so they cannot be selected. **To verify in M0:** that adding and removing an interactable at run time is supported and cheap; otherwise the pointer adapter ignores unlit beacons.
- Systems that need to find one entity by domain ID iterate their query. The largest query is about sixty entities. No lookup tables of entities are kept.

## 5. Reaching the domain

The session is created in `src/index.ts` after `World.create()` resolves and before systems are registered. Three things are stored on `world.globals` behind a typed accessor:

| Global | Type | Given to |
|---|---|---|
| `commands` | A queue with `push(command)` | Adapters, Hop system |
| `events` | A per-frame read-only list with `on(type, handler)` | Presentation systems |
| `view` | `SessionView`, read-only | Everything |

Only `GameDirectorSystem` holds the `GameSession`. Presentation cannot call `apply` or `tick` because it never has the object.

## 6. Scene authoring

- Rooms, sockets, grips, beacons and anchors are authored in the scene document `public/scenes/chapter-one.iwsdk.scene.json`, which holds composition and component data only. Geometry and materials come from the asset manifest by ID.
- Graybox geometry is written as procedural prototypes under `src/scene-assets/`, the starter's convention, and replaced by glTF kit parts in M6 without changing the scene's structure.
- The level root carries the SDK's environment components for the void background and dim image-based light.
- The player's start pose is authored in the scene; later poses come from `VantageAnchor` entities.

## 7. Startup join check

After the scene loads and before the title is shown, a check walks the content and the scene and fails loudly, with a list, if any of these are false:

- every module, socket, grip, vantage and seal in the content has exactly one entity;
- every such entity names a content ID that exists;
- every station's grips lie inside the reach envelope of its vantage anchor;
- no two beacons' ray targets overlap as seen from any vantage where both can be lit.

In development this is an error screen. In production it is the error card.

## 8. Lifetime and cleanup

- All chapter entities belong to the level and are removed when the level is unloaded.
- The fade sphere, the letter and the error card are persistent entities.
- Every system pushes its subscriptions to `cleanupFuncs`. Restart re-creates the session and reloads the level; it does not re-create the world.
- REQ-REL-002 is tested by ten restarts with heap measurement.

## 9. What is deliberately not ECS

Seam state, the graph, the Surveyor's state, objectives, checkpoints, flags and settings. They would be awkward as components, since they are relational and need ordering guarantees inside one tick, and they would become untestable without a world.
