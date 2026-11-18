# Onboarding

## Goal

A first-time player seats their first seam within 90 seconds of entering VR, without reading instructions and without help, in at least 80% of sessions (REQ-UX-001, measured by PT-01).

## Method

Teach one thing at a time, by putting exactly one new thing in view and making it the most attractive thing there. Let the player's first guess be right.

| # | Lesson | The one thing in view | Why the first guess works | If they do nothing |
|---|---|---|---|---|
| 1 | Fingertips press things | A glowing wax seal on the envelope, at chest height | A glowing button at arm's length invites a poke | After 10 s the seal pulses; after 25 s a line appears under it: *Press the seal* |
| 2 | Lamps are places to go | One lit lamp in a dark hall | It is the only light source that is small and near a door | After 20 s the SDK's hand ray is shown more brightly and the lamp flickers once. After 45 s the envelope writes: *Point at the lamp. Pinch.* |
| 3 | Brass is for hands | One brass grip on a rail, pulsing as the hand nears | It is at hand height, hand-sized and reacts to approach | After 20 s the grip pulses on a loop. After 45 s: *Brass is for hands.* |
| 4 | Sliding moves the house | The stair wing moving as the hand moves | Direct cause and effect in the first centimetre of travel | n/a: they are already holding |
| 5 | Light means it will join | A line of light gathering round the doorway | Light at a goal is universally read as "yes" | If released early the wing returns; the grip pulses again |
| 6 | Letting go commits | The thud and a new lamp | They have already let go | n/a |
| 7 | Some seams need two hands | A travel grip that rattles, an anchor grip that pulses | The pulsing object next to the refusing one is the obvious next thing to try | After 15 s of failed pulls: *Hold on with one hand. Pull with the other.* |
| 8 | It is going to the newest joint | The Surveyor turning away from the player toward the joint just made | It is seen, not explained | Hint tiers in `puzzle-design.md` |

Lessons 1 to 6 are Sequence 1. Lesson 7 is Sequence 2. Lesson 8 is Sequence 4.

## Rules

- No floating panels, no arrows in the air, no ghost hands, no voice.
- Words appear only on the envelope and only after the wait times above.
- A lesson is never repeated once the player has done the thing.
- The first seam cannot be done wrongly. It has two detents and nothing else to touch.
- The first time each kind of feedback occurs it is slightly stronger: the first ring of light is brighter, the first thud deeper.

## Specific risks

| Risk | Sign in playtest | Response |
|---|---|---|
| Player does not notice hands are tracked | Sits still for more than 10 s at the title | The envelope drifts 5 cm toward whichever hand moves first |
| Player pinches at the lamp from too close and grabs nothing | Repeated pinches with no ray on target | Enlarge the lamp's ray target; brighten the ray |
| Player tries to grab the room itself | Reaches forward at full stretch | The grip pulses whenever a pinch occurs outside any target |
| Player releases before the ring of light | Repeated returns | Widen the snap window for the first seam only to 0.25 |
| Player looks for a menu | Turns hands over, looks at wrists | Turning the envelope over is rewarded: the back is where the seals are |
| Player expects to walk | Leans or shuffles | Nothing moves; the lamp flickers |

## What onboarding does not cover

Snap turn, intensity and one-handed mode are found on the envelope's back and are not taught. They are also described on the web page before entry for anyone who needs them first.
