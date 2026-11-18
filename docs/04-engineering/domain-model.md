# Domain model

The gameplay domain: plain TypeScript with no imports from Three.js, IWSDK or the browser (REQ-INPUT-007). It is the authority on every rule. Type sketches below are contracts for implementation, not code to copy; names may change in M0 to M2 but responsibilities may not.

## 1. Shape of the domain

```
domain/
  math/         Vec3, Quat, Pose, oriented-box overlap. Small and self-contained
  house/        ModuleDef, SocketDef, HouseGraph, connection rules, collision, content validation
  seams/        SeamDef, SeamState, manipulation, snapping, blocking
  puzzles/      objectives, hint timers
  threats/      the Surveyor: state machine, target selection, routing
  progression/  game state machine, checkpoints, flags, settings
  session/      GameSession: the single entry point
content/
  chapter-one   authored data only
```

One aggregate, `GameSession`, owns all state. The outside world does three things to it: apply a command, advance a tick, read a view.

```ts
interface GameSession {
  apply(command: Command): CommandResult;      // legal: state changes, events queued. Illegal: reason, no change
  tick(): void;                                // advance exactly one fixed step (50 ms)
  drainEvents(): readonly DomainEvent[];       // events since last drain, in order
  readonly view: SessionView;                  // read-only projection for presentation
  snapshot(): SaveData;                        // for persistence
  hash(): string;                              // canonical state hash, for determinism tests
}
function createSession(content: ChapterContent, start: SaveData | 'new', settings: Settings): GameSession;
```

Commands and events are listed in `data-contracts.md`.

## 2. Identity

Everything is referred to by a stable string ID from the chapter content: `foyer`, `stair.head`, `seam-landing`, `v-zero`, `cp-east`. The domain never holds an entity, an object or a pointer from the layers above. An edge's ID is its two socket IDs in lexical order joined by `|`.

## 3. Static content

```ts
type Profile = 'arched' | 'square' | 'round';

interface ModuleDef {
  id: ModuleId;
  basePose: Pose;                       // pose at its seam's detent 0, or its fixed pose
  collision: OrientedBox[];             // coarse, in module space
  sockets: SocketDef[];
  surveyor?: { crossSec: number; reachSec?: number };
}

interface SocketDef {
  id: SocketId;                         // 'stair.head'
  local: Pose;                          // origin at sill centre; -Z is the outward normal; +Y up
  profile: Profile;
}

interface PairRule {                    // authored intent for a socket pair
  a: SocketId; b: SocketId;
  player: boolean; enemy: boolean;
  lockedUntilFlag?: FlagId;
  expectAt: Partial<Record<SeamId, number>>[];   // detent combinations where the author expects a connection
}

interface SeamDef {
  id: SeamId;
  moves: ModuleId;
  path: { kind: 'linear'; axis: Vec3; length: number }
      | { kind: 'rotary'; pivot: Vec3; axis: Vec3; angle: number; cyclic: boolean };
  detents: number[];                    // path parameters in [0,1], ascending
  initial: number;                      // detent index
  latched: boolean;                     // needs the anchor grip
  ratchet: boolean;                     // one stroke per detent
  stations: StationDef[];
}

interface StationDef { id: StationId; vantage: VantageId; travelGrip: GripId; anchorGrip?: GripId }

interface VantageDef { id: VantageId; module: ModuleId; adjacent: VantageId[] }

interface CheckpointDef { id: CheckpointId; trigger: Trigger; snapshot: CanonicalSnapshot }

interface ChapterContent {
  modules: ModuleDef[]; pairs: PairRule[]; seams: SeamDef[];
  vantages: VantageDef[]; checkpoints: CheckpointDef[];
  objectives: ObjectiveDef[]; hints: HintDef[];
  surveyor: SurveyorTuning; surveyorReduced: SurveyorTuning;
  tolerances: { positionM: number; angleDeg: number; snapWindow: number; previewWindow: number };
}
```

Station poses, rail shapes and grip geometry are presentation data and live in the scene, not here. The domain knows a station only as "the grips for this seam at this vantage".

## 4. Dynamic state

```ts
interface SessionState {
  game: GameStateId;                         // section 9
  seams: Record<SeamId, SeamState>;
  graph: HouseGraph;                         // derived; stored for diffing and validation
  player: { vantage: VantageId };
  letter: 'held' | 'strap' | 'delivered';
  flags: Record<FlagId, boolean>;            // 'surveyorArmed', 'houseClosing', 'oneHanded', ...
  progress: { checkpoint: CheckpointId; solved: Record<ObjectiveId, boolean>; catches: number };
  hints: Record<StationId, { idleTicks: number; tier: 0 | 1 | 2 | 3 }>;
  surveyor: SurveyorState;                   // section 7
  tickCount: number;
}

interface SeamState {
  committed: number;                         // detent index; the only value the graph uses
  phase: 'rest' | 'held' | 'frozen' | 'settling';
  heldBy?: { station: StationId; travelHand: Hand; anchorHand?: Hand };
  param: number;                             // continuous path parameter while not at rest
  settle?: { toDetent: number; kind: 'snap' | 'return'; ticksLeft: number };
  latchOpenTicks: number;                    // one-handed mode
  frozenTicks: number;
}
```

## 5. Geometry and the connection rule

Module pose is a pure function of content and the seam's committed detent:

```
pose(module) = basePose(module) composed with seamTransform(seam, detents[committed])
worldPose(socket) = pose(owner module) composed with socket.local
```

Two sockets `a` and `b` are **mated** when all hold (REQ-GRAPH-002):

1. `distance(origin_a, origin_b) <= positionM` (0.05 m)
2. `angle(normal_a, -normal_b) <= angleDeg` and `angle(up_a, up_b) <= angleDeg` (2 degrees)
3. `a.profile == b.profile`
4. neither owner's seam is in phase `held`, `frozen` or `settling`; neither socket is already in an edge
5. a `PairRule` exists for the pair, and no chapter rule forbids it

Only pairs with a `PairRule` are tested. There are twelve in chapter one.

```ts
interface Edge {
  id: EdgeId; a: SocketId; b: SocketId; modules: [ModuleId, ModuleId];
  player: boolean; enemy: boolean;
  locked: boolean;                 // PairRule.lockedUntilFlag not yet set
  suspended: boolean;              // a seam this edge depends on is not at rest
  dependsOn: SeamId[];             // seams that move either module
}
interface HouseGraph { edges: Edge[] }     // sorted by id; nodes are implicit
function computeGraph(content, seams, flags): HouseGraph;      // pure
function diffGraph(before, after): { opened: Edge[]; closed: Edge[] };
```

`usable(edge, who)` is `!locked && !suspended && (who === 'player' ? edge.player : edge.enemy)`.

While a seam is not at rest, the graph still contains the edges of its committed detent, marked suspended. They are removed or replaced only at commit (REQ-SEAM-006).

## 6. Seam manipulation

State machine of one seam:

```
rest --take(travel) [guards]--> held
held --drag(u)--> held            (param updated, clamped)
held --anchor released--> frozen  (latched seams only)
frozen --anchor retaken--> held
frozen --1.5 s--> settling
held --release--> settling        (snap or return chosen)
settling --ticks elapse--> rest   (COMMIT if snap to a different detent)
```

**Guards on take**, each with a reason code returned to the caller (REQ-ERR-003):

| Reason | Condition |
|---|---|
| `NotAtStation` | The player's vantage is not this station's vantage |
| `Latched` | The seam is latched, the anchor grip is not held and the latch pin is not open |
| `HeldBySurveyor` | The Surveyor is crossing an edge whose `dependsOn` includes this seam |
| `Busy` | The seam is held from another station, or is settling |
| `PlayerInside` | The player's vantage is in the module this seam moves |
| `NotPlaying` | The game state does not accept play commands |

**Drag.** The adapter sends the rail parameter `u` in [0,1]. For a plain seam, `u` maps linearly to the path parameter across the whole detent range. For a ratchet, `u` maps across one detent spacing from the committed detent, in the stroke's direction. The result is clamped to the path and to the nearest edge of any blocked stretch between the committed detent and the requested value.

**Blocked stretches** (REQ-SEAM-004). For a seam, sample its path at 64 steps between each pair of adjacent detents; at each sample, test the moving module's oriented boxes against every other module's boxes at their committed poses, by the separating-axis test. Contiguous colliding samples form a blocked stretch. Results are cached by the tuple of all other seams' committed detents. A seam not at rest counts as occupying its whole swept volume.

**Release.** Find the nearest detent to `param`. If `|param - detent|` is within `snapWindow` times the spacing to its neighbour, and the stretch between the committed detent and that detent is not blocked, settle to it (`snap`). Otherwise settle to the committed detent (`return`). A release with reason `lost` uses the last value received before loss (REQ-INPUT-006). A ratchet snaps to the next detent when `u >= 0.85`.

**Settle.** The domain sets `ticksLeft` from the distance still to travel, at most 16 ticks (0.8 s). Presentation animates to match. When it reaches zero the seam is at rest and, if the detent changed, the commit runs (REQ-SEAM-012).

**Commit**, in this order (REQ-GRAPH-004):

1. `committed = toDetent`
2. `graph = computeGraph(...)`; `diff = diffGraph(old, new)`
3. queue `SeamCommitted`, then `GraphChanged(diff)`
4. append each opened edge, with its measuring room, to the Surveyor's fresh-joint list, if the Surveyor is armed
5. evaluate objectives and checkpoints; set flags
6. recompute reachable vantages; queue `VantagesChanged` if different
7. mark the Surveyor for re-evaluation on its next tick

## 7. The Surveyor

```ts
interface SurveyorState {
  state: 'Dormant'|'Listening'|'Replanning'|'Investigating'|'Approaching'|'Hunting'|'Blocked'|'Searching'|'Retreating';
  at: { kind: 'room'; room: ModuleId; walkTicks: number; towards?: EdgeId }
    | { kind: 'crossing'; edge: EdgeId; from: ModuleId; to: ModuleId; ticksLeft: number };
  target?: { kind: 'joint'; edge: EdgeId; measureIn: ModuleId } | { kind: 'letter' };
  route: EdgeId[];                    // remaining edges, first is next
  stateTicks: number;                 // time in the current state or sub-phase
  measuring: boolean;
  freshJoints: { edge: EdgeId; measureIn: ModuleId }[];   // oldest first; measureIn is fixed when the joint is made
  inPlayerRoomTicks: number;
  idleTicks: number;                  // time without a target, for retreat
  braceTicks: number;
}
```

One tick, in order:

1. If the game is paused or not in a playing state, do nothing.
2. If crossing: decrement; on zero, enter the destination room, emit the remaining count, reset walk time. Nothing else can happen during a crossing.
3. Drop fresh joints whose edge no longer exists.
4. If the room it is in belongs to a seam that is not at rest: brace, up to the brace limit, and stop here.
5. Evaluate `chooseTarget` and `findRoute` (below). Compare with the current plan:
   - next edge unusable: go to Blocked, facing that edge;
   - target kind or next edge changed: go to Replanning;
   - otherwise keep the plan, with the new route tail.
6. Run the current state's behaviour: count down timers; walk; begin a crossing when the walk time for this room is spent and the next edge is usable; measure; patrol.
7. Catch check: if it is in the player's room, increment `inPlayerRoomTicks`; when that reaches the room's reach time, queue `PlayerCaught`. Otherwise reset it.

```ts
function chooseTarget(s, graph, playerRoom): Target | undefined
// 1. newest fresh joint whose measuring room is reachable
// 2. else 'letter' if playerRoom is reachable
// 3. else undefined

function findRoute(graph, from, to, tuning): EdgeId[] | undefined
// Uniform-cost search over usable(edge, 'enemy').
// Step cost = crossSec(room being left) + thresholdSec. First step uses remaining walk time.
// Ties: lower total cost, then lexically smaller sequence of edge IDs.
```

Measuring room of a joint: decided once, at the commit that opens the edge. It is the edge's module that the committing seam did **not** move. If that module has no enemy-traversable socket at all (Room Zero), it is the other module. It is stored with the joint and never recomputed from the Surveyor's position. A measuring ritual marks every fresh joint that touches the room it is standing in.

The transition table is in `01-game-design/enemy-surveyor.md` section 5 and is implemented as data: `(state, condition) -> state`.

**Complexity.** At most 11 rooms and 12 edges. A tick is tens of comparisons. The budget in REQ-PERF-006 is 0.3 ms.

## 8. Puzzles, checkpoints, hints

```ts
interface ObjectiveDef { id: ObjectiveId; when: Predicate }   // over graph, seams, flags, player vantage, surveyor room
interface Trigger { firstArrivalAt?: VantageId; edgeFirstOpens?: EdgeId; and?: Predicate }
```

Predicates are data: a small expression tree of `edgeOpen`, `seamAt`, `flag`, `playerAt`, `surveyorIn`, `all`, `any`, `not`. No code is attached to content (REQ-PUZZLE-005).

Checkpoints: when a trigger first holds, record the checkpoint, queue `CheckpointReached` and `SaveRequested`. Each has a **canonical snapshot**: the complete `SessionState` the game is restored to after being caught there or after save repair. Canonical snapshots are generated by replaying the reference solution to that point and are stored as content, so they are always reachable states.

Hints: per station, count idle ticks while the player is at the station, its objective is unsolved, no grip is held and the Surveyor's route is longer than one edge. At 40, 80 and 120 s queue `HintShown` with the tier.

## 9. Game state

`game` is one of eleven states; the full transition table is in `runtime-lifecycle.md`. The domain owns it because several rules depend on it: the Surveyor does not tick outside playing states, commands are refused outside them, and failure recovery is a state.

`SeamInteraction` is entered when any seam leaves rest and left when all are at rest; it remembers which of Exploration, PuzzleActive or ThreatEncounter it came from. `ThreatEncounter` holds while the Surveyor is in any state other than Dormant and has, or last had, a route to the player.

## 10. Determinism

- The only clock is the tick counter. One tick is 50 ms.
- No `Math.random`, no `Date`, no iteration over unordered collections: every collection that is iterated is sorted by ID.
- All timings are stored as whole ticks, converted once from seconds when content is loaded.
- `hash()` serialises the state with sorted keys and applies a 32-bit FNV-1a hash.
- Floating point is used only in geometry, on inputs that are constant per configuration, so results are reproducible on one engine. Cross-engine bit equality is not required because commits depend on tolerance tests with wide margins, not on exact values.

## 11. Invariants

The nine invariants in `01-game-design/house-graph-rules.md` section 9, plus:

10. A seam in phase `rest` has `param` equal to its committed detent's parameter.
11. At most one seam is `held` per hand.
12. `surveyor.route`, if not empty, starts with an edge touching the room it is in.
13. `progress.checkpoint` is a known checkpoint and `player.vantage` a known vantage.

`assertInvariants(state)` is run after every command and tick in tests, and in development builds.

## 12. What the domain does not know

Poses of grips, rails, lamps and stations; meshes; animation; sound; hands as anything but `'left'` or `'right'`; frame time; the XR session; storage. Each is supplied or consumed by a layer above through commands, events and the view.
