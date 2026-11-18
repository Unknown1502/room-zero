# Environment design

Room-by-room design for the chapter. IDs, sizes and connections are in `01-game-design/first-chapter.md`.

## 1. Architectural language

A late-nineteenth-century boarding house: fumed oak joinery, plaster above a high dado, faded patterned paper below it, encaustic tile in halls, boards in corridors, brass everywhere a hand or a letter might go. It was once respectable and has been empty a long time. Nothing is broken; everything is worn.

Each room is a complete box with its own outer shell, visible from other rooms across the void: lath and plaster on the outside, with joist ends, cut pipes and a brass *seam plate* round every doorway. Rooms hang from steel rails and chains that run up into darkness.

## 2. The modular kit

All eleven rooms are built from one kit. This is what makes the scope achievable.

| Kit part | Variants | Notes |
|---|---|---|
| Wall bay, 3 m wide | Plain, with dado panel, with fanlight, with glazed partition | House scale. Tiling textures |
| Doorway bay | Arched, square | With seam plate and threshold plate |
| Round port | One | Courier scale; lift and Room Zero only |
| Floor | Tile, board | Tiling |
| Ceiling and cornice | One | Mostly in darkness |
| Stair flight | One | Risers 0.54 m |
| Outer shell panel | Lath, joist end, pipe end | Seen only from across the void |
| Rail, chain, counterweight, carriage | One set | The house's visible mechanism |
| Courier fittings | Grip, rail (straight, arc), anchor grip, latch pin, signal lamp, turn-marker | Courier scale; the hero props |
| Dressing | Radiator, coat stand, umbrella stand, console table, picture frames, runner, curtain | House scale; a small set, re-used |

## 3. Rooms

### Entrance Hall (`foyer`)
The widest, tallest room. Tile floor, a doormat the player wakes on, a front door behind with a brass letter plate four metres up, a console table whose underside is the player's ceiling for the first few seconds of looking round. One wall lamp. A fanlight throws a cold rectangle across the floor. The north door stands open on the void.
**Says:** you are small, and the mail comes in up there.

### Stair Wing (`stair`)
A single broad flight rising to nothing. Runner in oxblood held by brass rods. Newel post at the top with the first two-hand station. Seen from the hall it is offset by half its width behind the doorway.
**Says:** the house has come apart.

### The Landing (`landing`)
A square landing with a balustrade on the void side and doors west and east. Starts docked against a blank wall 14 m away, its west door lit.
**Says:** the piece you need is over there.

### The Turning Room (`turn`)
A square parlour with four walls and three doors. A round rug marks its centre and its turntable. Each door's shape is repeated on the wall above it as a plaster overdoor, so the faces can be read as it turns. A cold fireplace on the blank wall.
**Says:** read the shapes.

### West Corridor (`c-west`)
Long, boarded, a runner down the middle, wall lamps every third bay with most of them out. Bedroom doors along both sides, all numbered from 1 upward, none of them openable or reachable. At its east end the floor stops at a seam plate.
**Says:** this is where the numbered rooms are, and there is no 0.

### The Swing Bridge (`bridge`)
One corridor section with open sides, since its walls are railings, so that whoever is on it is visible from both corridors and from the office. Pivots on a visible drum at its east end.
**Says:** this piece moves, and you can see what is on it.

### East Corridor (`c-east`)
As the West Corridor but colder and darker, with a tall door on the north side: the Survey Office. A fanlight above that door is the first sign of the Surveyor waking. The corridor ends at the lift.

### Dead Letter Office (`dead-letter`)
A side room facing the bridge's swung position, with a glazed timber partition toward the corridor so the player can see inside. Sacks, a sorting frame, undeliverable mail in drifts. One door to the void side, one locked door at the back.
**Says:** things that could not be delivered end up here.

### Survey Office (`den`)
Never entered or fully seen. A door, a fanlight, and at the finale a second door heard to unlock. Through the fanlight: the top edge of a very large drawing board.

### Parcel Lift (`lift`)
A small iron cage on guide rails, sized for parcels and so nearly at courier scale. Square door to the corridor, round port on the far side. The round port is the first courier-scale opening in the house.
**Says:** something small is meant to go through here.

### Room Zero (`zero`)
3.2 by 3.6 by 2.4 m. A bedsit at human scale: an iron bed, a writing desk with a pigeonhole rack, a chair, a small stove with a kettle, a coat on a hook, a rag rug, a round window. Warm, cluttered, lived in today. From outside, earlier in the chapter, it is a lit box on a crane arm, read as a lantern.
**Says:** this one was built for you.

## 4. The void

Not empty. At several depths hang other rooms that are never reached: dark boxes with one lit window each, a few dozen in all, the nearest about 60 m away. They are flat cards or very simple boxes. Rails and chains run between them and fade into fog. In the ending, they begin to drift inward.

## 5. Sight lines that the design depends on

| From | Must see | Why |
|---|---|---|
| `v-foyer-door` | The stair, offset, through the door | The first seam must be self-explanatory |
| `v-stair-head` | The landing docked across the void; its lit door | The goal of puzzle 1 |
| `v-landing-east` | Three of the Turning Room's faces as it turns; the corridor's square mouth beyond; the lantern | Puzzle 2; foreshadowing |
| `v-turn-centre` | All four walls from inside | The room explains itself |
| `v-cwest-end` | Straight down the bridge and the East Corridor to the Survey Office door, about 50 m | The first sight of the Surveyor at distance |
| `v-cwest-end` | The Dead Letter Office's glazed partition | The player must see it go in |
| `v-ceast-end` | The lift, the arm and the lantern; the arm's whole sweep | Puzzle 4 |
| `v-zero` | The round door with the lift beyond it | The final image |

Each is a checklist item for the graybox review at M5.

## 6. Environmental storytelling

| Detail | Where | Reading |
|---|---|---|
| A letter plate far above the player | Foyer | Mail arrives; you came in that way |
| Bedroom doors numbered from 1 | Corridors | There is no room 0 here |
| A coat hook at courier height by the foyer door, empty | Foyer | Someone your size uses this house |
| Courier-scale fittings on house-scale architecture | Everywhere | The house was adapted for a small worker |
| Pencilled dimensions on door frames | From the West Corridor on | The Surveyor has been through |
| Undelivered mail in drifts | Dead Letter Office | The fate of letters that do not arrive |
| A coat with the player's cuff | Room Zero | This is yours |
| A warm kettle | Room Zero | You left tonight |
| Pigeonholes full of the same letter | Room Zero | Not the first night |

## 7. Graybox first

Rooms are built first as untextured boxes at correct scale with correct sockets, collision volumes and sight lines (M2 to M5). No art is made for a room until its puzzle has been played in graybox on a headset. The kit is textured once and applied in M6.
