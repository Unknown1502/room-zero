# Interaction feedback

Every event the player can cause or needs to notice, and what answers it. Tracked hands have no haptics, so feedback is sound and sight only. Each row has both, so that neither sense is required alone (REQ-UX-003, REQ-A11Y-004).

Presentation subscribes to domain events (`04-engineering/data-contracts.md`). It never decides that an event happened.

## Visual language

- **Warm brass glow** means "for your hands".
- **A line of warm light round a doorway** means "these will join".
- **Ash-grey outline** means "blocked by this".
- **Chalk** belongs to the Surveyor: tallies, strokes, dust.
- **Lamplight** means "you can go here".

No other colours carry meaning. There is no red for danger and no green for success.

## Grips and seams

| Event | Sight | Sound | Latency target |
|---|---|---|---|
| Hand near a grip | Grip brightens, one slow pulse | None | Next frame |
| Hand in reach | Steady glow on the knurling | Faint brass ring, once | Next frame |
| Grip taken | Glow runs from grip into the rail | Leather creak, soft clunk | Next frame |
| Grab refused: latched | Travel grip jitters 2 mm; anchor grip pulses | Latch rattle | Next frame |
| Grab refused: held by Surveyor | Chalk dust falls from the grip; its hand is on the door frame | Stiff creak | Next frame |
| Latch lifted | Small brass latch above the rail flips up | Clack | Next frame |
| Room moving | Room follows with lag; dust falls along the seam; chains or counterweights along the track move | Grind, with pitch and loudness following speed; from the room's position | Within 2 frames of hand motion |
| Entering preview window | A line of warm light starts round each doorway that would join | Rising hum | Next frame |
| Inside snap window | The line is complete and steady | Hum settles to a note | Next frame |
| At a limit | Rail end flashes once | Dull knock | Next frame |
| At a block | Ash outline of the collision; room stops short | Low groan | Next frame |
| Released inside a snap window | Room finishes travel and seats; dust puff; ring of light holds 1 s then fades to a faint permanent line | Deep seating thud from the joint, then a short ring of settling metal | Seat within 0.8 s |
| Released outside | Room and grip ease back over 0.6 s | Falling groan | Starts next frame |
| Profiles refused at a detent | Threshold plates shake, teeth visibly do not mesh | Dull clank | At seat |
| Rested, nothing joined | No ring anywhere; visible gap | Seating thud without the ring | At seat |
| Ratchet stroke completes | Lever returns to start by itself | Ratchet clicks, then thud | At seat |
| Anchor released mid-move | Latch drops; room freezes | Clack | Next frame |

## Movement

| Event | Sight | Sound |
|---|---|---|
| Vantage becomes reachable | Its lamp lights with a small flare | Soft gas-mantle pop at the lamp |
| Vantage becomes unreachable | Lamp gutters out | Small hiss |
| Hand ray on a lit lamp | Lamp brightens; the SDK ray's cursor rests on it | None |
| Hop | Fade out, fade in | Cloth and footfall, low and brief |
| Snap turn | 0.1 s fade | Soft tick |

## The letter

| Event | Sight | Sound |
|---|---|---|
| Taken from the strap | Follows the hand | Paper |
| Released | Eases back to the strap | Paper, canvas |
| Turned over | Back comes into view | Paper |
| Postmark earned | A stamp presses itself onto the back; ink is wet for 2 s | Rubber stamp thump |
| Hint appears | Ink writes itself, one stroke at a time, over 1.5 s | Pen scratch |
| Seal pressed | Seal deforms and changes its embossed symbol | Wax tick |
| Near pigeonhole 0 | The empty slot's brass label catches the light | None |
| Delivered | Letter slides in; seal breaks; card slides out | Paper, a small crack of wax |

## The Surveyor

Meanings are in `01-game-design/enemy-surveyor.md` section 3.

| Event | Sight | Sound |
|---|---|---|
| Logs a joint while dormant | None | One distant knock, from the east |
| Waking | The far door's fanlight flickers | Tape rasp, pencil scratch, plumb tick, in loose rhythm for 8 s |
| Forms a plan | Ring sweeps, then holds on its route; N chalk strokes on the lamp bracket nearest the player | N knocks, evenly spaced at 0.6 s |
| Enters a room | Hand on the frame, stoop, straighten | Remaining count, quieter |
| Walking | Slow, placed steps | Plaster creak per step; the tape reel ticking |
| One doorway away | Silhouette fills the far doorway | Low tape pulse, about one per second (omitted in reduced intensity) |
| Next doorway gone | Stops at the brink, lowers the plumb line; the bob swings | Line paying out; bob tick slowing |
| No route to anything | Tape hangs in a slack loop | One long draw of the tape; no knock |
| Measuring a joint | Kneels; tape across the sill; writes on its forearm | Tape, pencil, in bursts for 6 s |
| Its room is moving | Crouches, both hands on the walls | Plaster strain |
| In a doorway | Hand grips the frame | Brass-on-wood |
| Reaches the player | Ring lowers to frame the player; world dims | Tape drawn out slowly as the light goes |

## Game state

| Event | Sight | Sound |
|---|---|---|
| Chapter begins | Fade in over 2 s | A letterbox flap, far above |
| Paused | World dims to 30% and freezes | Sound ducks to silence over 0.3 s |
| Resumed | World returns over 0.3 s | Sound returns |
| Woken at a postmark after being caught | Fade in; one new chalk tally on the envelope | The postmark's stamp, soft |
| The house begins to close | Far rooms begin a very slow drift inward; lamps dim by a tenth | A long low settling, continuous |
| Ending | See `first-chapter.md` | See `audio-direction.md` |

## Rules

1. Feedback begins on the frame after the event unless a different latency is stated.
2. Sounds come from where the thing is: the joint, the room, the Surveyor. Only paper and glove sounds come from the hands.
3. No feedback is louder or brighter the second time than the first.
4. If two events coincide, the one about the Surveyor wins the audio mix; the one about the held grip wins the visual.
5. A refused action always shows why.
