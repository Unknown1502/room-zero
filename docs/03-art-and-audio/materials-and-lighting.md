# Materials and lighting

How the look in `art-direction-bible.md` is built within the budget in `04-engineering/performance-budget.md`.

## 1. Materials

Physically based, metal-roughness workflow. A small library, shared by every room.

| Material | Character | Texture sets | Notes |
|---|---|---|---|
| Fumed oak | Dark, open grain scaled 3x, worn pale on stair nosings and door edges | 1 tiling + wear by vertex colour | Floors, joinery, stair |
| Lime plaster | Bone white, uneven, hairline cracks, grime rising from the skirting | 1 tiling + grime by vertex colour | Walls; the Surveyor uses a variant |
| Wallpaper | Faded sage with an ochre repeating figure scaled 3x; lifting at seams | 1 tiling | Below the dado |
| Encaustic tile | Two-colour geometric, cracked in places | 1 tiling | Foyer floor |
| Tarnished brass | Brown-gold, rough, brighter on edges where handled | 1 shared | All house-scale brass |
| Hand brass | As above, cleaner, knurled; an emissive mask on the knurling driven by proximity | 1 shared, courier scale | Grips, rails, lamps |
| Heavy fabric | Oxblood wool or velvet, light-absorbing | 1 tiling | Runners, curtains |
| Iron | Black, slightly rusted | 1 shared | Lift cage, rails, chains |
| Lath and rough timber | Pale, sawn | 1 tiling | Outer shells |
| Glass | Dirty, mostly opaque with a soft reflection | No texture | Lamp glass, partition, fanlights. Used sparingly: transparent surfaces are costly |
| Paper | Cream, fibrous | 1 atlas | Envelope, card, mail |
| Room Zero set | Painted wood, quilt, enamel, rag rug | 1 atlas at courier scale | Everything in Room Zero |

Rules:

- Texel density follows the scale hierarchy: highest on courier-scale fittings and Room Zero, lowest on house-scale walls that are mostly dark.
- Wear, grime and edge highlights are painted into vertex colours on kit parts, so one tiling texture serves every room without visible repetition.
- No transparency except lamp glass, the glazed partition, fanlights, dust and the fade sphere. No refraction.
- Compressed GPU textures (KTX2) for everything that ships. The SDK's asset loader handles the decoder.

## 2. Lighting approach

**Baked, with a very small amount of dynamic light.** Real-time shadows from many lamps are beyond the budget and unnecessary when the camera only ever sits at eleven points.

| Layer | Method |
|---|---|
| Each room's interior lighting | Baked lightmaps per room, authored with the room's own lamps and fanlights |
| Environment and reflections | The SDK's gradient or texture image-based lighting on the level root, very dim and cold |
| Background | The SDK's gradient dome set to the void colour, with fog |
| Moving rooms | Their baked lighting moves with them. They do not relight each other |
| The Surveyor and the hands | Lit by image-based lighting plus one or two unshadowed dynamic lights per vantage standing in for the nearest lamp and the moon |
| Contact grounding | A soft blob shadow under the Surveyor's feet; the SDK offers a contact-shadow node component to evaluate |
| The ring of light, brass glow | Emissive, with no light cast |

### Consequences to accept

- A room that moves next to another does not cast its light into it. In a dark house with rooms seen across a void this is rarely visible. Where it matters, at doorways that join, the ring of light and an emissive threshold strip cover the join.
- The Surveyor casts no true shadow. Its blob shadow and its staging against light carry its presence.
- A baked room cannot change its own lamps. The one change we need, lamps dimming by a tenth as the house closes, is done by scaling lightmap intensity.

### Lightmap budget

One lightmap per room, sized by how much of the room is ever lit and seen. Starting sizes: 1024 for the foyer, corridors and Room Zero; 512 for the others. Total under 12 MB compressed. Rooms never entered (Survey Office) have none.

## 3. Light sources in the fiction

| Source | Colour | Role |
|---|---|---|
| Wall lamps (gas mantles) | Amber | Pools of warm light at stations; most are out |
| Signal lamps (courier scale) | Amber, brighter | Vantage markers |
| Fanlights and windows | Cold blue-grey | Moonlight: rim light, floor rectangles, the Surveyor's backlight |
| Room Zero's lamp | Warm, slightly rosier | The warmest light in the game |
| The ring of light at a joining doorway | Amber | Feedback |

Each vantage's lighting is designed as a shot: key (the nearest lamp, on the station), rim (moonlight on edges and on the Surveyor), goal (the lit doorway or room across the void).

## 4. Fog and depth

Exponential fog to the void colour, tuned so surfaces 40 m away are about half lost. Fog is applied in the standard material path and costs almost nothing. It gives the sense of air and hides the lack of far detail.

## 5. Rendering settings to decide on a headset

| Setting | Starting point | Decide by |
|---|---|---|
| Antialiasing | The browser's default multisampling for the XR layer | PF-01 |
| Foveation | High | PF-01, HQ-09 for edge legibility |
| Framebuffer scale | 1.0; 0.9 only as a last resort, as Meta's guidance suggests | PF-01 |
| Tone mapping and colour space | The SDK and Three.js defaults for physically based output; verify that dark values are not crushed on the headset | HQ-09 |
| Post-processing | None | Fixed |

## 6. Readability in darkness

The look is dark, and the headset's display has limited black level and contrast. Guards:

- Grips, lamps and the ring of light are emissive and never depend on scene light.
- The minimum ambient is set on a headset, not on a monitor.
- A brightness check on the web page ("you should just see the outer ring") is an option to add if HQ-09 shows a spread between devices.
