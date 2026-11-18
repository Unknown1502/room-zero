# Animation style

## 1. Principles

- **Weight before speed.** Everything large starts slowly, travels steadily and settles with a small overshoot and a shake of dust.
- **Nothing moves without a cause the player can see.** A room moves because a grip moved. The Surveyor moves because it has a route.
- **Stillness is the default.** Idle scenes have dust and lamp flicker only.
- **Presentation follows the rules; it never leads them.** Every animation is started by a domain event and its length is bounded so that the drawn world and the rule state agree again within a known time.

## 2. Rooms

| Motion | Shape | Limits |
|---|---|---|
| Following a held grip | Critically damped spring toward the target position, with a speed cap | A full traverse takes at least 1.2 s; rotary speed no more than 60 degrees per second |
| Seating at a detent | Ease in over the last 5% of travel, 1 to 2 cm overshoot, one damped rebound | Complete within 0.8 s of release |
| Returning | Ease in and out to the last committed detent | 0.6 s |
| Blocked | Decelerate to the stop; a 0.5 degree shudder | No bounce |
| Secondary motion | Chains sway, counterweights travel opposite to the room, dust falls along the seam | Driven by room speed |
| The house closing (ending) | Far rooms drift inward at walking pace or less | Background only; never the player's room |

Rooms are moved by setting transforms from the seam's drawn parameter. No physics engine is involved.

## 3. The Surveyor

### Character of movement

A folding rule and a draughtsman's compass. It moves in clear, separate phases: plant, unfold, reach, fold. It pauses between phases. It never hurries, never stumbles and never gestures at the player.

### Clip list

| Clip | Use | Notes |
|---|---|---|
| Idle, stooped | Standing | Slow weight shift; ring drifts a few degrees |
| Walk | Crossing a room | Long placed steps; a cycle of about 2.4 s; ring leads |
| Walk, pressed | Hunting | Same clip at 1.3x with a lower stoop |
| Through a doorway | Threshold crossing, 1.5 s | Hand to frame, fold, pass, straighten |
| Ring sweep and hold | Replanning | Sweeps, stops on the route direction |
| Knock | The count | One knuckle strike on the nearest wall; repeatable |
| Plumb at a brink | Blocked | Lowers the line, watches the bob, 4 s |
| Tape slack | No route | Draws the tape long and lets it hang |
| Measure a joint | Investigating, 6 s | Kneel, tape across the sill, write on forearm |
| Brace | Its room is moving | Crouch, hands to walls |
| Frame the player | Caught | Ring lowers toward the camera and stops at the minimum distance |
| Lower to the round door | Ending | Kneels at the lift floor, brings the ring to the doorway |

Twelve clips. Walking is matched to the authored crossing times by adjusting playback rate and stride count per room, so that it arrives at the doorway when the rules say it does.

### How it is driven

- The domain gives its room, its progress across the room from 0 to 1, its state and its target direction.
- Presentation places it along an authored path through the room between the two doorways, at that progress.
- State changes select clips. Blends are 0.3 s.
- The ring is aimed by a look-at toward the next doorway on its route, blended over 0.5 s.

### Production approach

Hand-keyed, with procedural aiming for the ring and the arms. If time is short, the minimum set is idle, walk, doorway, knock, plumb, measure and the ending, seven clips, with the others replaced by poses and blends. This is listed in `07-delivery/known-limitations.md`.

## 4. Hands and held objects

The hands are driven entirely by tracking. Nothing animates the player's hands. The envelope and grips have small secondary motions only: the seal deforming, the latch flipping, a grip's 2 mm refusal jitter.

## 5. Light and effects

| Effect | Motion |
|---|---|
| Lamp flame | Subtle flicker, never strobing; under 10% variation |
| Signal lamp lighting | Flare over 0.3 s, settle |
| Ring of light | Draws round the doorway in the direction of approach; holds; fades to a faint line |
| Dust at a seam | Short puff on seat; slow fall during travel |
| Postmark | Presses in over 0.2 s; ink dries from glossy to matt over 2 s |
| Hint ink | Written stroke by stroke over 1.5 s |
| Fade | Linear alpha, 0.20 s out, 0.25 s in |

## 6. Camera

There is no camera animation. This is a rule, not a style (REQ-COMFORT-004).
