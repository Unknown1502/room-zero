# System components

Every component of the application, what it is responsible for, and what it must not do. Layers are defined in `technical-architecture.md`.

## Layer B: input adapters

| Component | Responsible for | Must not |
|---|---|---|
| **Hand input adapter** | Detecting that a grip is held and by which hand; projecting the hand onto the rail; the 0.25 s loss grace; the leave-rail test; proximity for grip highlighting; emitting `GripTake`, `GripDrag`, `GripRelease` | Decide whether a grab is allowed, clamp to limits, choose a detent, or touch a module |
| **Pointer adapter** | Turning `Pressed` on beacons, seals, latch pins and turn-markers into hop requests and commands; suppressing a hop when a hand is near a grip | Check adjacency or usability beyond a courtesy read of the view |
| **Letter adapter** | Take, release, and whether the release was at the pigeonhole | Decide that the chapter is complete |
| **Lifecycle adapter** | Mapping session visibility, start and end to `SetVisibility`; resuming audio | Pause anything itself |
| **Storage adapter** | `get`, `set`, `remove` over local storage; reporting unavailability | Interpret what it stores |

## Layer C: gameplay domain

| Component | Responsible for | Must not |
|---|---|---|
| **GameSession** | The single entry point: `apply`, `tick`, `drainEvents`, `view`, `snapshot`, `hash`; ordering of everything inside a command or tick | Expose mutable state |
| **Seam manipulation** | Seam state machines; guards; clamping; snap or return; settle timing; commit | Know about hands as anything but left or right; know about rails |
| **HouseGraph and connection rules** | Module and socket poses from detents; the five connection conditions; edge attributes; graph diff | Read anything from presentation |
| **Collision and blocking** | Oriented-box overlap; blocked stretches per seam per configuration; cache | Use a physics engine |
| **Content validation** | Checking authored data: declared versus computed connections, near-misses, overlaps, reach of every ID | Run in production builds, except the scene join check |
| **Puzzle engine** | Evaluating objective and checkpoint predicates; hint timers | Contain per-puzzle code. Puzzles are data |
| **Surveyor director** | The state machine; target selection; fresh-joint list; catch rule; the count | Use randomness or wall-clock time |
| **Navigation** | Uniform-cost search with a fixed tie-break; reachability; route length for audio | Use geometry. It works on the graph only |
| **Progression** | Game state machine; checkpoints and canonical snapshots; flags; settings | Write to storage |

## Layer D: application systems

| Component | Responsible for | Must not |
|---|---|---|
| **Command queue** | Holding commands from adapters until the Director applies them, in order | Reorder or drop |
| **Game Director** | Being the only caller of `apply` and `tick`; the fixed-step accumulator; draining and publishing events; refreshing the view | Contain rules |
| **Hop Coordinator** | The fade sequence; placing the player rig; releasing grips before a hop | Decide whether a hop is legal |
| **Event dispatch** | Delivering each frame's events to subscribers by type, synchronously, after all ticks | Deliver events mid-tick |
| **Persistence system** | Reacting to `SaveRequested` and `SettingsChanged` | Block the frame. Writes are tiny and synchronous; if that proves measurable they move to idle time |
| **Application context** | A typed accessor for the session view, event stream and command queue stored on `world.globals` | Hand out the `GameSession` itself to presentation |

## Layer E: presentation

| Component | Responsible for | Must not |
|---|---|---|
| **Module view** | Moving module entities to follow each seam's `param` with damping and a speed cap; secondary motion of chains and counterweights | Decide a detent; report position back to the domain |
| **Grip and rail view** | Placing travel grips on rails at the clamped value; proximity glow; refusal jitter; latch | Move a grip to where the hand is if the domain clamped it |
| **Socket feedback** | Ring of light from `SeamPreview` and `GraphChanged`; ash outline from `SeamBlocked`; refusal shake from `PairRefused` | Infer a connection from positions |
| **Surveyor view** | Position along authored in-room paths from `walkProgress`; clip selection; ring aim; minimum camera distance; chalk strokes for the count | Move the Surveyor between rooms on its own |
| **Lamp view** | Lighting beacons from `VantagesChanged` | Light a lamp because a mesh looks connected |
| **Envelope view** | Postmarks, hints, tallies, seals; holster easing | Hold progress |
| **Fade** | The black sphere | Affect simulation |
| **Audio director** | Mapping events to SDK audio sources; per-source level from route length; mix priorities; resuming on visibility | Decide what the Surveyor is doing |
| **Ambience** | Dust, lamp flicker, void rooms, the closing drift | Carry game information |
| **Visibility sets** | Showing only the rooms visible from the current vantage | Hide the room the Surveyor's sound says it is in when it should be visible |
| **Debug overlay** (development only) | Drawing the graph, the Surveyor's route and state, seam parameters and tick time in the world | Ship |

## Layer F: persistence

| Component | Responsible for | Must not |
|---|---|---|
| **Save codec** | `encode`, `decode` of schema version 1 | Trust input |
| **Validator** | The eight checks of `save-schema.md` section 4 | Repair silently |
| **Migrator** | Version-to-version functions | Skip versions |
| **Recovery ladder** | Choosing stored record, other slot, canonical snapshot or new game; raising the notice flag | Throw |

## Cross-cutting

| Concern | Where it lives |
|---|---|
| IDs joining content to scene | Component fields; checked at startup |
| Tunables | Chapter content for rules; a presentation settings object for animation and audio |
| Logging | A small logger with levels; silent in production except errors |
| Error boundary | A wrapper round the Director's update: an exception stops ticking, shows the error card and offers restart (REQ-REL-003) |
| Development commands | Skip to checkpoint, show the graph, step ticks: available through the debug overlay and the SDK's ECS pause and step tooling |

## Ownership of state

| State | Single owner |
|---|---|
| Seam detents, graph, flags, progress, Surveyor, game state | Domain |
| Drawn position of modules, grips and the Surveyor | Presentation, derived each frame |
| Which hand holds which grip, as the SDK sees it | SDK; mirrored into the domain by commands |
| Player rig pose | SDK; set by the Hop Coordinator |
| Saved record | Persistence |
| Settings | Domain, persisted by persistence |

No state has two owners. Where presentation and the domain could disagree, a rule above says which one is wrong.
