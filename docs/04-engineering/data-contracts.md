# Data contracts

The messages that cross layer boundaries. Types are in `domain-model.md`.

## 1. Commands: adapters to domain

Produced by input adapters and application systems, queued, and applied by the Game Director in arrival order at the start of each frame's simulation step. Every command returns `{ ok: true }` or `{ ok: false, reason }` and an illegal command changes nothing (REQ-ERR-003).

| Command | Fields | Sent when | Refusal reasons |
|---|---|---|---|
| `Begin` | `mode: 'new' \| 'continue'` | A title seal is pressed | `NoSave` |
| `Restart` | none | The begin-again seal is held 2 s | none |
| `GripTake` | `grip, hand` | A pinch closes within reach of a grip | `NotAtStation`, `Latched`, `HeldBySurveyor`, `Busy`, `PlayerInside`, `NotPlaying`, `HandBusy` |
| `GripDrag` | `grip, u` (0 to 1) | Each frame while a travel grip is held | `NotHeld` |
| `GripRelease` | `grip, reason: 'open' \| 'lost' \| 'leftRail' \| 'forced'` | Pinch opens; tracking lost past grace; hand left the rail; pause or hop | `NotHeld` |
| `LatchPinPress` | `seam` | One-handed mode: the pin is pressed | `NotAtStation`, `NotOneHanded` |
| `Hop` | `vantage` | The fade has reached black | `NotAdjacent`, `EdgeNotUsable`, `NotPlaying` |
| `LetterTake` | `hand` | The letter is pinched | `HandBusy` |
| `LetterRelease` | `atSlot: boolean` | The letter is released | none |
| `SealPress` | `seal: 'turn' \| 'intensity' \| 'hands'` | A settings seal is pressed | none |
| `SetVisibility` | `visible: boolean` | The XR visibility state changes | none |
| `AckEnding` | `choice: 'again' \| 'leave'` | An ending seal is pressed | `NotComplete` |

`Hop` is validated twice: once by the Hop Coordinator before starting the fade, by reading the view, and again by the domain when the command arrives. The second check is the authority.

Snap turn does not go to the domain. It changes only the player rig's heading.

## 2. Events: domain to presentation

Queued by the domain in the order they occur and drained once per frame after all ticks. Presentation and audio subscribe by type. Events are facts; subscribers never answer them.

### Seams and graph

| Event | Payload | Meaning |
|---|---|---|
| `GripTaken` | `grip, seam, hand` | A hold began |
| `GripRefused` | `grip, reason` | A take was refused |
| `LatchChanged` | `seam, open` | Latch lifted or dropped |
| `SeamLimit` | `seam, end: 'min' \| 'max'` | Reached the end of the path |
| `SeamBlocked` | `seam, by: ModuleId, at: param` | Reached a blocked stretch |
| `SeamPreview` | `seam, detent, pairs: EdgeId[], strength` | Sockets that would mate; strength 0 to 1 |
| `SeamFrozen` | `seam` | Anchor released mid-move |
| `SeamReleased` | `seam, kind: 'snap' \| 'return', toDetent, ticks` | Settle started |
| `SeamCommitted` | `seam, detent` | Settle ended on a new detent |
| `SeamRested` | `seam, detent, opened: number` | Settle ended; `opened` is how many edges opened |
| `PairRefused` | `a, b, why: 'profile'` | Sockets coincide but do not mate |
| `GraphChanged` | `opened: Edge[], closed: Edge[]` | The difference after a commit |
| `EdgeUnlocked` | `edge` | A locked edge became usable |
| `VantagesChanged` | `reachable: VantageId[]` | Which lamps should be lit |

### Player and progress

| Event | Payload |
|---|---|
| `PlayerHopped` | `from, to` |
| `LetterStateChanged` | `state` |
| `CheckpointReached` | `checkpoint` |
| `ObjectiveSolved` | `objective` |
| `HintShown` | `station, tier` |
| `FlagSet` | `flag` |
| `SettingsChanged` | `settings` |
| `GameStateChanged` | `from, to` |
| `PlayerCaught` | `in: ModuleId` |
| `CheckpointRestored` | `checkpoint` |
| `EndingStep` | `step: 1..7` |
| `SaveRequested` | `data: SaveData` |

### Surveyor

| Event | Payload |
|---|---|
| `SurveyorStateChanged` | `from, to` |
| `SurveyorLoggedJoint` | none (dormant, before armed) |
| `SurveyorCount` | `n, kind: 'plan' \| 'enter'` |
| `SurveyorNoRoute` | none |
| `SurveyorCrossingStarted` | `edge, from, to` |
| `SurveyorEnteredRoom` | `room` |
| `SurveyorMeasuring` | `room, edges` |
| `SurveyorBracing` | `room` |

## 3. The view: domain to presentation, continuous

Events carry moments. Things that vary every frame are read from `session.view`, a read-only projection recomputed after each frame's ticks. Reading it allocates nothing.

```ts
interface SessionView {
  game: GameStateId;
  playerVantage: VantageId;
  seams: ReadonlyArray<{ id; phase; param; committed; settleProgress }>;
  edges: ReadonlyArray<{ id; usablePlayer; usableEnemy; locked; suspended }>;
  reachableVantages: ReadonlySet<VantageId>;
  grips: ReadonlyArray<{ id; available: boolean; refusal?: Reason }>;   // for affordance display
  surveyor: {
    state; room?: ModuleId; crossing?: { edge; progress };
    walkProgress: number;            // 0..1 across the current room
    towards?: EdgeId;                // where the ring should point
    measuring: boolean; bracing: boolean;
    edgesToPlayer?: number;          // for audio and intensity
  };
  letter: 'held' | 'strap' | 'delivered';
  envelope: { postmarks: CheckpointId[]; hint?: { station; tier }; catches: number; settings };
  audioRouteEdges(fromModule: ModuleId): number | undefined;   // shortest open route to the player's module, any traversal
}
```

Presentation interpolates between views for smooth motion; it never extrapolates a rule outcome.

## 4. Presentation data: scene to systems

Authored in the scene document and attached to entities as components (`ecs-design.md`). The domain ID in each component is the join key.

| Component | Key fields |
|---|---|
| `ModuleView` | `moduleId` |
| `SocketView` | `socketId` |
| `GripView` | `gripId, seamId, role: 'travel' \| 'anchor', railKind, railLength or radius and angle` |
| `LatchPinView` | `seamId` |
| `BeaconView` | `vantageId` |
| `VantageAnchor` | `vantageId` (pose is the entity's transform) |
| `SealView` | `sealId` |
| `SurveyorView`, `LetterView`, `PigeonholeView`, `TurnMarkerView`, `FadeView` | tags or small data |

A startup check joins every ID in the content with the scene and fails loudly if a module, socket, grip, vantage or seal is missing on either side, or if a station's grips fall outside the reach envelope of its vantage (UT-CONN-06 covers the content side; RT-22 the scene side).

## 5. Persistence: domain to storage

`SaveRequested` carries a complete `SaveData` object. The persistence layer serialises it, writes it, and reports nothing back to the domain. On startup the persistence layer returns either a validated `SaveData` or `'new'` plus a notice flag. The schema is in `save-schema.md`.

## 6. Versioning of contracts

Commands, events and the view are internal to one build and are not versioned. `SaveData` and `ChapterContent` are versioned, because a save can outlive a build and content can change between builds.
