# Art direction bible

The visual identity of ROOM ZERO. Companion documents: `environment-design.md`, `character-design.md`, `materials-and-lighting.md`, `animation-style.md`, `asset-register.md`.

## 1. Statement

**A very large, very old house, seen by lamplight from near the floor.**

Target: high-end stylised cinematic realism. Believable materials and light, simplified form, strong silhouette. Not photorealism: the asset pipeline and the hardware cannot deliver it, and we do not promise it (section 9).

## 2. Mood

Quiet. Heavy. Patient. Dust in the air and a long way to the ceiling. The feeling of being in a public building after hours, somewhere you are allowed to be but were not expected.

Three words for every review: **tall, worn, still.**

## 3. Shape language

| Subject | Shapes | Reason |
|---|---|---|
| The house | Tall verticals, deep rectangular reveals, heavy horizontals at dado and cornice far above the player | Reads as oversized and indifferent |
| Doorways | Three profiles only: a round-headed arch, a plain square, a circle | The puzzle language; must be legible at 30 m in silhouette |
| Courier-scale fittings | Small, rounded, turned, knurled | Made for hands; friendly by contrast |
| The Surveyor | Long straight members with hinge points; one open circle | Drawn with a ruler and a compass |
| Room Zero | Low, rounded, cluttered, soft | The only place with a curve at eye level |

The circle is reserved. It appears only as the Surveyor's ring, Room Zero's door and window, the pigeonhole label and the postmarks. A viewer should be able to feel, before understanding, that the Surveyor and Room Zero belong to each other.

## 4. Scale hierarchy

Three scales, never mixed in one object.

| Scale | Factor | Examples | Detail density |
|---|---|---|---|
| House | 3x human | Doors 6.3 m, stair risers 0.54 m, skirting boards at the player's shoulder, door handles 3 m up | Low. Large plain surfaces with wear |
| Courier | 1x human | Grips, rails, lamps, turn-markers, the letter, everything in Room Zero | High. This is where the texture budget goes |
| Surveyor | About 4.5x human | Its body, its tools | Medium, concentrated on the ring, hands and tools |

Rules:

- Something at courier scale is in view at every vantage, within arm's reach, to hold the sense of one's own size.
- Wood grain, wallpaper pattern and floorboard width are scaled with the house, so a floorboard is 0.6 m wide. This, more than height, is what makes the player feel small.
- Nothing at house scale is ever within reach except floor and skirting.

## 5. Colour

A narrow, desaturated palette. Warm practical light against cold ambient.

| Role | Colour | Hex | Used for |
|---|---|---|---|
| Void | Blue-black | `#0B0E13` | Background, fog target |
| Moonlight | Cold grey-blue | `#8FA3B8` | Fanlights, rim light, far rooms |
| Plaster | Bone white, dirtied | `#C9C2B3` | Walls above the dado; the Surveyor |
| Wallpaper | Faded sage with a dull ochre figure | `#6F7662`, `#9A8558` | Lower walls |
| Wood | Dark fumed oak | `#3A2A1E` | Floors, joinery, stair |
| Brass, tarnished | Brown-gold | `#7A6233` | Fittings at rest |
| Brass, lit | Warm gold | `#D9A441` | Grips in reach; lamp metal |
| Lamplight | Amber | `#FFB45A` | Practical lamps, the ring of light |
| Fabric | Oxblood, nearly black | `#3B1F22` | Curtains, runners |
| Postal blue-grey | | `#56657A` | The courier's cuff; pigeonhole paint |
| Paper | Cream | `#E9DFC8` | The envelope, the card |
| Chalk | Soft white | `#EDEAE2` | Tallies, strokes, dust |
| Ash | Neutral grey | `#8A8A86` | Blocked-path outline |

Rules: nothing saturated beyond lamplight; no pure white; no pure black except the void and fades; no green or red signal colours; emissive surfaces only for lamp glass, the ring of light and brass in reach.

## 6. Value and composition

- The image is mostly dark. Around 70% of any view sits in the lowest quarter of the value range.
- Each vantage has one pool of warm light on the station and one lit goal across the void. Everything else is rim and silhouette.
- The Surveyor is always seen against something lighter than itself: a fanlight, a lit doorway, the glazed partition.
- Views are composed like stage sets, since each is seen from one seat: foreground station, middle-distance void, background goal.

## 7. Atmosphere

- **Fog:** exponential, tinted to the void colour, tuned so that surfaces 40 m away are about half lost. It gives depth and hides the absence of distant detail.
- **Dust:** a few dozen slow, soft particles in each pool of lamplight, lit by it and invisible outside it.
- **The void:** no stars, no horizon, no floor. Far rooms appear as dim lit windows at several depths, like houses across a valley at night.
- **Light shafts:** faked with a few additive cards under fanlights. No volumetrics.

## 8. Interaction visual language

Defined once and used without exception (REQ-UX-002).

| Meaning | Look |
|---|---|
| For your hands | Knurled brass that warms and glows as a hand nears |
| Will connect | A thin line of amber light round the doorway's inner edge |
| Connected | The same line, fainter, permanent |
| Blocked | An ash-grey outline, no fill |
| You can go here | A lit signal lamp |
| The Surveyor has noted or planned | Chalk |

## 9. What the pipeline can and cannot deliver

The asset register lists every asset and its source. The realistic production reality is a very small team, a WebXR runtime and a mobile GPU.

| We can deliver | We will not promise |
|---|---|
| Physically based materials with baked lighting and a small number of texture sets | Real-time global illumination or ray-traced anything |
| A modular architectural kit reused across all eleven rooms | Unique sculpted detail in every room |
| One hero character with a modest skeleton and hand-keyed or procedural animation | Motion-captured performance |
| Fog, dust and faked light shafts | Volumetric lighting |
| A consistent, deliberate, dark look | Photorealism |

The darkness and fog are an art decision that also keeps the budget: a surface that is in shadow needs no detail.

## 10. Reference directions

Mood references to be gathered for the team's own boards, as categories and not as specific copyrighted images to copy:

- Victorian and Edwardian boarding houses, sorting offices and railway hotels: joinery, tile, brass letter plates, pigeonhole racks.
- Canal swing bridges, dumbwaiters, sash-window counterweights, theatre fly systems: how heavy things are moved by small fittings.
- Surveying instruments: theodolite circles, plumb bobs, folding rules, drafting tools.
- Interior paintings by lamplight and nocturnes with one warm window.
- Architectural models and section drawings, for the look of rooms seen from outside across a gap.

## 11. Originality checklist

Signed off for every character, environment and key image before it is accepted (REQ-ART-002, INS-05).

- [ ] No child or child-proportioned protagonist. The courier is an adult seen as hands only.
- [ ] No raincoat, hood or signature garment in a saturated colour.
- [ ] No masks, bags or sacks over heads.
- [ ] No human-caricature enemies: no cooks, teachers, doctors, janitors, guests or any figure of appetite.
- [ ] No ship, vessel, ocean, school, hospital or city-of-towers setting.
- [ ] No hunger, eating or meat motif.
- [ ] No music box, lullaby or humming theme.
- [ ] No television, signal or broadcast motif.
- [ ] The Surveyor's silhouette, tested as a black shape at three distances, does not resemble any creature from the reference series or other well-known horror characters.
- [ ] No composition reproduces a recognisable shot from an existing game or film.
- [ ] Every texture, model, sound and font is original or licensed, and listed in the asset register with its source.
