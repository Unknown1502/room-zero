# Character design

Visual design of the Surveyor and the courier's hands. Behaviour is in `01-game-design/enemy-surveyor.md`; personality in `character-bible.md`.

## The Surveyor

### Silhouette

Designed first as a black shape. It must be identifiable at 50 m, at 15 m and at 3 m, and must not be mistaken for a person.

- **Proportions.** Upright height about 7.5 m. Legs 45% of height, torso short and narrow, arms reaching to mid-shin. Each limb has one extra joint: a second elbow, a second knee.
- **Posture.** Rarely upright. Default is a deep stoop, knees and hips folded, the ring carried forward of the body at about 5 m. In corridors it advances like a folding rule opening and closing.
- **The ring.** An open brass circle 1.1 m across, with a gap of about 50 degrees at the lower front, mounted on a short neck of lath. It is graduated on its inner face like a theodolite circle. There is nothing inside it. Light and background show through.
- **Hands.** Very long fingers, four to a hand, each ending flat like the tip of a carpenter's pencil.

Silhouette tests for the originality checklist: no head-shaped mass, no hat, no coat, no hunch suggesting a sack, no trailing cloth.

### Surface

- **Plaster over lath.** Bone-white lime plaster, hairline-cracked, with lath showing at the joints where it has worn through. Not flesh; no wetness, no veins.
- **Measurement marks.** Fine pencil lines, dimension arrows and numbers over the forearms, shins and chest, denser where it can reach. They are its notebook. Up close they can be read as room dimensions.
- **Brass.** The ring, the tape reel at the left wrist, the hinge pins of its extra joints.
- **Chalk.** White on its fingertips; it leaves faint marks on what it touches.

### Tools

| Tool | Carried | Used when |
|---|---|---|
| Steel tape on a brass reel | Left wrist | Measuring; drawn long when it has no route |
| Plumb line and lead bob | Right hand, looped | At a brink |
| Carpenter's pencil | Tucked at the neck | Writing on itself |

### Scale relationships

| Compared with | Relationship |
|---|---|
| A house door, 6.3 m | It must stoop. Its hand goes to the frame at about 5 m |
| The player seated at 1.2 m eye height | Its knee is above the player's head |
| Room Zero's round door, 1.0 m across | Slightly smaller than its ring. Its ring fits round the doorway like a collar |

The last relationship is the final image and must be modelled first: ring inner diameter, gap angle and the door's brass arc are one design.

### Light

It emits nothing. It is lit only by the scene and is always staged against something brighter. At the ending the lamp in Room Zero lights the inside of the ring.

### Technical targets

Budgets are in `04-engineering/performance-budget.md`. In outline: one skinned mesh of about 12,000 triangles, one 2K texture set, about 40 bones, with a simplified version beyond 25 m. Its animation is described in `animation-style.md`.

## The Courier's hands

- Built on the SDK's tracked-hand visual, restyled if the SDK allows it (`02-experience-design/hand-interaction-spec.md` section 2).
- **Gloves:** oiled brown leather, darker at the fingertips, a stitched patch on the left palm, seams along the fingers.
- **Cuffs:** heavy wool in postal blue-grey, two brass buttons, ending 10 cm above the wrist where they fade out. Nothing is drawn beyond that.
- No arms, no body, no shadow of a body.
- The same glove appears, empty, on the desk in Room Zero.

If the SDK's hand cannot be restyled, the default hand is used and this section is cut. The story does not depend on it; the coat on the hook carries the same information.

## The letter

16 by 11 cm, cream laid paper, slightly soft at the corners. Front: the address in the courier's hand, in iron-gall brown. Back: a red wax seal on the flap at the title, then postmarks in black, a hint line, chalk tallies, and four small settings seals along the flap. It is the most closely seen object in the game and receives a 2K texture to itself.
