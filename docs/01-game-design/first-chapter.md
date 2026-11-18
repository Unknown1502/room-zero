# Chapter One: The Unreturned Letter

This is the single source for chapter content. Every room, socket, seam, vantage, checkpoint and timing used anywhere else in the documentation is defined here. All numbers are starting values to be tuned in M1 to M5; changing one means changing it here first.

Target length: 5 to 7 minutes for a player who knows the solutions (REQ-GAME-003). First-time players are expected to take up to about 12 minutes.

## 1. The house at a glance

```
                                   [den]
                                     |  \(locked until the house closes)
                                     |   \
 [foyer]--S1--[stair]--S2--[landing]--S3--[turn]--S3--[c-west]--S4--[bridge]==[c-east]--S5--[lift]--S5+S6--[zero]
                                                                      |
                                                                      S4
                                                                      |
                                                                [dead-letter]

 --Sn--  connection that exists only at certain detents of seam n
 ==      permanent connection (the bridge pivots about this end)
```

The house is one horizontal run from west to east with two side rooms. Room Zero hangs on a crane arm in the void and is visible as a small lit lantern from the landing onward.

## 2. Modules

House scale is about three times human scale. Dimensions are interior width x depth x height in metres and are provisional.

| ID | Name | Size | Moved by | Role |
|---|---|---|---|---|
| `foyer` | Entrance Hall | 14 x 16 x 11 | fixed | Start. World anchor |
| `stair` | Stair Wing | 9 x 18 x 16 | `seam-hall` | A staircase that ends in open air |
| `landing` | The Landing | 9 x 9 x 9 | `seam-landing` | The missing landing |
| `turn` | The Turning Room | 10 x 10 x 9 | `seam-rotunda` | Square room on a turntable with three doorways |
| `c-west` | West Corridor | 6 x 22 x 8 | fixed | Where the Surveyor is first seen from |
| `bridge` | The Swing Bridge | 6 x 12 x 8 | `seam-bridge` | Corridor section that pivots about its east end |
| `c-east` | East Corridor | 6 x 22 x 8 | fixed | The Surveyor's side; final puzzle station |
| `dead-letter` | Dead Letter Office | 9 x 9 x 8 | fixed | Dead end. Glazed partition faces the corridor |
| `den` | Survey Office | 9 x 9 x 8 | fixed | The Surveyor's home. Only its door is seen |
| `lift` | Parcel Lift | 4 x 4 x 6 | `seam-lift` | Lift cage with a square door and a round port |
| `zero` | Room Zero | 3.2 x 3.6 x 2.4 | `seam-arm` | The only room at the courier's own scale |

## 3. Sockets and possible connections

A socket's profile is the shape of its opening. Two sockets can only mate if their profiles match, they face each other and they coincide within tolerance. The rule is in `house-graph-rules.md`.

| Socket | Profile | Mates with | When | Player | Surveyor |
|---|---|---|---|---|---|
| `foyer.north` | arched | `stair.foot` | `seam-hall` = 1 | yes | yes |
| `stair.head` | arched | `landing.west` | `seam-hall` = 1 and `seam-landing` = 2 | yes | yes |
| `landing.east` | arched | `turn.f0` | `seam-landing` = 2 and `seam-rotunda` = 0 | yes | yes |
| `landing.east` | arched | `turn.f3` | `seam-landing` = 2 and `seam-rotunda` = 1 | yes | yes |
| `c-west.mouth` | square | `turn.f1` | `seam-rotunda` = 1 | yes | yes |
| `c-west.end` | square | `bridge.free` | `seam-bridge` = 0 | yes | yes |
| `bridge.pivot` | square | `c-east.west` | always | yes | yes |
| `dead-letter.door` | square | `bridge.free` | `seam-bridge` = 1 | no | yes |
| `dead-letter.back` | square | `den.side` | always aligned; **locked** until the `houseClosing` flag is set | no | yes |
| `den.door` | square | `c-east.north` | always | no | yes |
| `c-east.end` | square | `lift.near` | `seam-lift` = 1 | yes | yes |
| `lift.far` | round | `zero.door` | `seam-lift` = 1 and `seam-arm` = 1 | yes | **no** |

The Turning Room has four faces in its own frame, clockwise from above: `f0` arched, `f1` square, `f2` a blank wall with no socket, `f3` arched.

The player cannot enter the Dead Letter Office or the Survey Office: their thresholds are a step too high for someone courier-sized, and they have no vantage. The Surveyor cannot enter Room Zero: the round door is courier-sized.

## 4. Seams

Every seam is one degree of freedom along an authored path with authored resting positions. Hands are described in `02-experience-design/hand-interaction-spec.md`.

| Seam | Moves | Path | Detents (initial in bold) | Hands | Station vantage |
|---|---|---|---|---|---|
| `seam-hall` | `stair` | Linear, 4.5 m sideways | **0 offset**, 1 aligned | one | `v-foyer-door` |
| `seam-landing` | `landing` | Linear, 14 m across the void | **0 far dock**, 1 half-way, 2 stairhead | two (brace and pull) | `v-stair-head` |
| `seam-rotunda` | `turn` | Rotary about vertical, 90 degrees per stroke, cyclic | **0**, 1, 2, 3 | two (brace and stroke) | `v-landing-east` |
| `seam-bridge` | `bridge` | Rotary about its east end, 90 degrees | **0 inline**, 1 swung north | one | `v-cwest-end` and `v-ceast-west` |
| `seam-lift` | `lift` | Linear vertical, 7 m each way | 0 upper, **1 corridor level**, 2 lower | two (brace and haul) | `v-ceast-end` |
| `seam-arm` | `zero` | Rotary crane arm, 110 degrees | **0 stowed**, 1 docked | one | `v-ceast-end` |

Blocked intervals, computed from collision volumes (`house-graph-rules.md` section 5):

- `seam-arm` cannot pass from 0 to 1 while `seam-lift` is at 1. The arm's sweep passes through the space the lift cage occupies at corridor level. Its docked resting pose does not.
- `seam-landing` detent 1 is a legal resting place that connects nothing. It exists to teach that resting is not the same as connected.

Turning Room configurations. `r` is the detent of `seam-rotunda`.

| r | West side, facing the landing | East side, facing the corridor | Result |
|---|---|---|---|
| 0 | `f0` arched: connects | `f2` blank wall | You can walk in. There is no way on. The south door stands open on the void |
| 1 | `f3` arched: connects | `f1` square: connects | **The route** |
| 2 | `f2` blank wall | `f0` arched against square: refused | Sealed from the landing |
| 3 | `f1` square against arched: refused | `f3` arched against square: refused | No connection on either side |

## 5. Vantages

The player is always seated at exactly one vantage. A hop is possible when the destination is in the same module, or in a module joined to this one by an open, player-traversable edge and listed here as adjacent.

| Vantage | Module | Adjacent to | What is here |
|---|---|---|---|
| `v-foyer-start` | `foyer` | `v-foyer-door` | Where you wake. The doormat |
| `v-foyer-door` | `foyer` | `v-foyer-start`, `v-stair-head` | Station for `seam-hall`, set into the north door's architrave |
| `v-stair-head` | `stair` | `v-foyer-door`, `v-landing-east` | Top step. Station for `seam-landing` on the newel post |
| `v-landing-east` | `landing` | `v-stair-head`, `v-turn-centre` | Station for `seam-rotunda`. First view of the lantern |
| `v-turn-centre` | `turn` | `v-landing-east`, `v-cwest-end` | Centre of the Turning Room |
| `v-cwest-end` | `c-west` | `v-turn-centre`, `v-bridge-mid` | East end of the West Corridor. West station for `seam-bridge` |
| `v-bridge-mid` | `bridge` | `v-cwest-end`, `v-ceast-west` | Middle of the bridge. No station |
| `v-ceast-west` | `c-east` | `v-bridge-mid`, `v-ceast-end` | East station for `seam-bridge` |
| `v-ceast-end` | `c-east` | `v-ceast-west`, `v-lift` | Stations for `seam-lift` and `seam-arm`, side by side |
| `v-lift` | `lift` | `v-ceast-end`, `v-zero` | Inside the cage |
| `v-zero` | `zero` | `v-lift` | At the writing desk |

No station is ever inside the module it moves, so the player's own room never moves (REQ-SEAM-008).

## 6. Checkpoints

Checkpoints appear as postmarks stamped on the envelope. Each has a canonical snapshot of seam detents, flags and Surveyor state, used for failure recovery and for save repair (`04-engineering/save-schema.md`).

| ID | Postmark | Set when | Surveyor in the snapshot |
|---|---|---|---|
| `cp-arrival` | ENTRANCE | Chapter starts | Dormant in `den`, not armed |
| `cp-stairhead` | STAIR | First arrival at `v-stair-head` | Dormant, not armed |
| `cp-landing` | LANDING | First arrival at `v-landing-east` | Dormant, not armed |
| `cp-corridor` | WEST | First arrival at `v-cwest-end` | Dormant, armed, wake timer at zero |
| `cp-east` | EAST | First arrival at `v-ceast-west` while the Surveyor is sealed in `dead-letter` | Searching in `dead-letter`, with no route out |
| `cp-docked` | LAST POST | Edge `lift`-`zero` first opens | Leaving `dead-letter` for `den`, target the lift |

## 7. Surveyor timings

Authored per module, in seconds. *Cross* is the time to walk from one doorway of the room to another. *Reach* is the time from entering the room to reaching the player's vantage in it.

| Module | Cross | Reach |
|---|---|---|
| `den` | 3 | n/a |
| `c-east` | 10 | 6 |
| `bridge` | 6 | 4 |
| `c-west` | 10 | 6 |
| `turn` | 5 | 3 |
| `landing` | 5 | 3 |
| `stair` | 8 | 6 |
| `foyer` | 6 | 5 |
| `dead-letter` | 5 | n/a |
| `lift` | 4 | 4 |

Other values: threshold crossing 1.5 s; wake delay 8 s; measuring ritual 6 s; pause at a broken route 4 s; replanning 1.5 s; retreat after 45 s without a target; pace multiplier 1.3 when one doorway away. Reduced intensity multiplies all its movement times by 1.25.

## 8. Sequences

Times are the golden path at an unhurried pace.

### Sequence 1 — The Arrival (0:00 to 1:05)

**Purpose.** Establish scale, the letter, the grip language and the first seam.

1. Black. A letterbox flap claps shut somewhere far above. Fade in over two seconds.
2. You are seated on a doormat the size of a small field. In front of you a hall rises eleven metres. A single wall lamp burns. Moonlight falls from a fanlight you could never reach.
3. The envelope lies in your open left hand. It reads, in a careful hand: **ROOM 0**, and beneath, **Return before the house closes.** If you let go, it drops to a satchel strap at your hip and stays there.
4. A long rasp, like a steel tape being drawn out, travels through the east wall. Then silence.
5. A small signal lamp glows by the north door. Point and pinch, and you are sitting at the door (`v-foyer-door`).
6. The door opens on nothing: a gap of dark, and beyond it, shifted to one side, a staircase lit from above. At hand height in the architrave is a brass rail with a knurled grip. It pulses once as your hand comes near.
7. Grip and slide. The Stair Wing grinds sideways, with dust falling from the gap. The foot of the stair lines up. A warm line of light runs round the doorway. Let go: a deep, seating thud.
8. Far off, one knock. Something has noted the change.

**Teaches.** Look, pinch a lamp to move, grip brass, slide, release to seat. No text beyond the envelope.
**Graph change.** `seam-hall` 0 to 1 opens `foyer`-`stair`.
**Checkpoint.** `cp-arrival` at start.

### Sequence 2 — The Missing Staircase (1:05 to 2:05)

**Purpose.** First real puzzle. Introduce two-handed seams, the void, and resting without connecting.

1. Hop to the top step (`v-stair-head`). Postmark: STAIR. The staircase ends in air. Fourteen metres away across the void, the landing it belongs to is docked against a far wall, its door lit.
2. On the newel post are two grips: a fixed one stamped with a small anchor, and a travelling one on a rail. The travelling grip will not move alone; it strains and a latch rattles.
3. Hold the anchor grip with one hand. The latch lifts with a clack. Pull the travelling grip with the other. The landing separates from its dock and comes across the void on a rail you can now see.
4. Half way there is a resting place. If you release there, the landing sits short of the stair and nothing lights. The gap is plainly visible.
5. Pull to the end of the rail. Light runs round the stairhead doorway. Release. Thud.
6. Through the landing's far door you can now see a square room with a door facing you.

**Teaches.** Brace and pull. A preview of light means it will connect. Resting is not connecting.
**Graph change.** `seam-landing` 0 to 2 opens `stair`-`landing` and `landing`-`turn`.
**Solution.** `seam-hall` = 1 and `seam-landing` = 2 (REQ-PUZZLE-001).

### Sequence 3 — The Wrong Door (2:05 to 3:20)

**Purpose.** The first idea that must be understood: profile and facing.

1. Hop to the landing's east side (`v-landing-east`). Postmark: LANDING. To your left, far out in the void, hangs a small lit lantern on a long arm. You cannot reach it. It is Room Zero.
2. Ahead is the Turning Room, with an arched door facing you. It is open. Beyond the room is the mouth of a long corridor with a **square** opening and a square brass threshold plate.
3. You can hop into the Turning Room. Inside: the door you came through, a blank wall opposite, a square door to one side facing the void, and a second arched door standing open on a drop. There is no way on. Hop back.
4. On the landing is a quadrant rail with an anchor grip and a stroke lever. Brace and pull the lever through its arc: the whole room turns a quarter and seats. The lever returns.
5. As it turns you see its faces go by. Three doors: arched, square, arched, and one blank wall. The landing's doorway is arched. The corridor's is square.
6. One quarter turn puts an arched door to you and the square door to the corridor. Both doorways light. Any other position leaves one side dark, and at one of them your own door meets the square face and is refused with a dull clank.

**Teaches.** Doors mate by shape and facing. The first door that works is not the one you need.
**Graph change.** `seam-rotunda` 0 to 1 opens `turn`-`c-west` and keeps `landing`-`turn`.
**Solution.** Only `seam-rotunda` = 1 (REQ-PUZZLE-002).

### Sequence 4 — First Surveyor Encounter (3:20 to 5:00)

**Purpose.** Meet the Surveyor at a distance, learn its two rules, and beat it with the house.

1. Hop through the Turning Room to the east end of the West Corridor (`v-cwest-end`). Postmark: WEST. The Surveyor is now armed.
2. The corridor runs straight on across a bridge section and down the East Corridor, about fifty metres in all. A lever stands by you, with a matching one visible at the far side of the bridge.
3. Measuring sounds start: a tape rasp, a pencil scratch, a plumb-bob tick. After eight seconds, three knocks come from behind a door at the far end: one for each doorway between it and you. The door opens. A tall pale figure stoops out. Its head is an open brass ring. It straightens and turns the ring toward you.
4. It walks. It does not hurry. Each time it enters a room it knocks again for the doorways that remain: two, then one.
5. Pull the lever. The bridge swings ninety degrees north, like a canal bridge, and its free end seats against the door of a side room. Your end of the corridor now opens on the void.
6. The Surveyor stops where it is. Its ring sweeps, and settles on the joint you have just made. Two knocks: the bridge, then the office door. It walks onto the bridge and into the Dead Letter Office to measure the new joint. You can see it through the glazed partition, kneeling with its tape across the sill. (If it was already on the bridge when you pulled, it crouches and rides the swing, finds the doorway it wanted gone, lowers its plumb line where the corridor was, and only then turns to the new door.)
7. While it is inside, push the lever back. The bridge swings inline. The office door now opens on nothing. When it has finished measuring it comes to the door, finds the void, and draws its tape out, long and slow. No knocks: there is no route.
8. Hop across the bridge to the East Corridor (`v-ceast-west`). Postmark: EAST.

**Teaches.** It can only use open doorways. It goes to the newest joint first. Knocks are doorways.
**What if.** If you swing the bridge back while it is still on the bridge, it rides round with it and is now one doorway from you. If you never act, it reaches you. Both are recoverable: see section 9.
**Solution.** Swing to 1 while it is in `c-east` or on `bridge`; swing to 0 while it is in `dead-letter` (REQ-PUZZLE-003).
**Graph change.** `seam-bridge` 0 to 1 to 0.

### Sequence 5 — Room Zero (5:00 to 6:15)

**Purpose.** Final puzzle joining three sections: the corridor's end, the Parcel Lift and Room Zero.

1. Hop to the end of the East Corridor (`v-ceast-end`). The corridor ends at a lift cage, level with the floor, its square door open to you. On its far side is a round port the size of a serving hatch. Through it: the void, and the lantern on its arm.
2. You can hop into the cage and look. The round port opens on air. Hop back.
3. Two stations stand side by side: a rope haul with an anchor grip for the lift, and a single lever for the crane arm.
4. Pull the arm's lever. The lantern swings in on its arm and stops short with a groan. A ghost outline of its path shows it meeting the lift cage. It will not pass. Release, and it swings back.
5. Brace and haul the lift up or down, out of the way. Pull the arm's lever again: the lantern swings through the place where the cage was and seats at the end of the corridor, its small round door facing where the cage will be.
6. Brace and lower the lift back to corridor level. The round port comes down onto the round door. Two rings of light, one square and one round. Thud. Postmark: LAST POST.
7. Far behind you, a lock turns. Three knocks.

**Teaches.** Paths can be blocked by other sections. Make room for the room.
**Graph change.** `seam-lift` 1 to 0 (or 2), `seam-arm` 0 to 1, `seam-lift` to 1 opens `c-east`-`lift` and `lift`-`zero`. Sets the flag `houseClosing`, which unlocks `dead-letter`-`den`.
**Solution.** That order (REQ-PUZZLE-004).

### Ending — The Return Address (6:15 to 7:00)

The player keeps full head and hand control throughout. Nothing is taken from them.

1. Hop into the lift, then through the round door into Room Zero (`v-zero`). For the first time, everything is your size. A chair you could sit in. A bed with the blanket thrown back. A coat on a hook with a cuff like the one on your wrist. A lamp, lit. A kettle ticking as it cools. Someone lives here, now.
2. On the writing desk is a rack of pigeonholes. Every slot but one holds a sealed envelope identical to yours, each with a different set of postmarks. The empty slot is labelled **0**.
3. Place your letter in the slot. The seal breaks by itself. A card slides out, in the same hand as the envelope: **You are the return address.**
4. The measuring sounds, close. Outside the round door the Surveyor lowers itself to the floor of the lift. It does not reach in. It brings its open ring to the doorway. The door's own brass arc fills the gap in the ring. For a moment it is a whole zero, with you inside it.
5. It knocks, and there is no knock. Zero doorways.
6. The lamp steadies. Outside the window the sections of the house begin to fold toward one another, slowly, like the flaps of an envelope. Among the pigeonholes, one envelope is addressed in a different hand: **ROOM 1**.
7. Title. *The Unreturned Letter.* The envelope on the desk offers two seals: begin again, or leave.

## 9. Failure and recovery

There is one failure: the Surveyor reaches the player's vantage.

- **What happens.** The Surveyor stops at least 1.5 m away. Its ring lowers until it frames you. The world dims to black over about a second while a tape is drawn out. No strike, no scream, no contact.
- **Where you return.** The last postmark, with the house and the Surveyor as they were in that checkpoint's snapshot. You wake seated, the envelope in your hand, with one more faint chalk tally on its back.
- **Why it makes sense.** The Surveyor returns things to where they were last recorded. The ending explains this.

There are no softlocks. Every seam can be moved back, and failure recovery always restores a state from which the chapter can be finished (REQ-GAME-005, verified by MC-01).

## 10. Golden path as a command list

This is the reference solution used by tests MC-02 and RT-15.

```
hop v-foyer-door
seam-hall -> 1
hop v-stair-head                     # cp-stairhead
seam-landing -> 2                    # brace held
hop v-landing-east                   # cp-landing
seam-rotunda stroke +1 (-> 1)        # brace held
hop v-turn-centre
hop v-cwest-end                      # cp-corridor, Surveyor armed
wait until Surveyor is in c-east or bridge, not crossing
seam-bridge -> 1
wait until Surveyor is in dead-letter
seam-bridge -> 0
hop v-bridge-mid
hop v-ceast-west                     # cp-east
hop v-ceast-end
seam-lift -> 0                       # brace held
seam-arm -> 1
seam-lift -> 1                       # brace held; cp-docked; houseClosing
hop v-lift
hop v-zero
deliver letter                       # ending
```

Ten hops, eight seam moves, one delivery.

### Reference pacing

The chapter's stated length assumes this pacing, which is a planning model and not a measurement of players.

| Activity | Time |
|---|---|
| Title seal and fade-in | 12 s |
| Looking round on arrival at each of the 11 vantages | 15 s each |
| A hop | 1.5 s |
| A one-hand seam move, from reach to seated (hall, bridge twice, arm) | 9 s |
| A two-hand seam move (landing, rotunda, lift twice) | 11 s |
| Waiting for the Surveyor to enter the office after the first swing | about 11 s beyond the above |
| Ending | 45 s |

That sums to about 5 minutes 30 seconds. The sequence times in section 8 add slack for reading the envelope and for the scripted beats of the Arrival, and total 7 minutes. Both ends are inside the 5 to 7 minute target (REQ-GAME-003, MC-05).

### Encounter timings implied by section 7

Worked through with a small model of these rules while the documents were assembled; see `07-delivery/documentation-gate-audit.md`. Standard intensity.

| Event | Time after arriving at `v-cwest-end` |
|---|---|
| Three knocks | 9.5 s |
| It enters the East Corridor: two knocks | 14 s |
| If the player does nothing: caught | 36 s |
| Reference: the bridge is swung | 21 s |
| It replans: two knocks | 22 s |
| It enters the Dead Letter Office | 35 s |
| Last moment to take the lever before it starts back through the door | 47 s |
| At the finale, from docking to being reached if the player stays at the corridor's end | 19 s |
