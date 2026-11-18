# Audio direction

Sound carries more of this game than image does: the Surveyor is heard long before it is seen, and the count is the main way the player knows how much danger they are in. Every gameplay sound also has a visual twin (`02-experience-design/accessibility.md`).

## 1. Principles

- **The house is the instrument.** Wood, plaster, brass, chain, paper. No synthesised effects.
- **Silence is the bed.** There is no continuous music. Room tone is very low.
- **Everything comes from somewhere.** Sounds are positioned at their source. Only glove and paper sounds are at the hands.
- **One sound, one meaning.** A sound that carries information is never reused for decoration.
- **Headphones or the headset's speakers both work.** Critical cues are in the mid-range, not sub-bass.

## 2. Palette

| Family | Sources | Used for |
|---|---|---|
| Timber | Floorboards, door frames, large furniture dragged | Rooms moving, settling |
| Masonry | Plaster dust, brick on brick, deep thuds | Seating, the house closing |
| Brass and iron | Latches, ratchets, chains, rails, reels | Grips, seams, the lift |
| Paper | Envelopes, stamps, pen | The letter |
| Leather and wool | Gloves, cuffs | The player's own hands |
| The Surveyor's kit | Steel tape, plumb bob, pencil, knuckle on plaster | Everything it does |
| Air | Draughts through gaps, a far letterbox flap | Space and scale |

## 3. The Surveyor's sounds

Each state is identifiable by ear within half a second of beginning (REQ-AUDIO-002).

| State or event | Sound | Character |
|---|---|---|
| Dormant, logging a joint | One knock, far east, muffled | Barely there |
| Listening | Tape rasp, pencil scratch, plumb tick, loose and irregular | Something busy behind a door |
| Replanning then the count | A beat of silence, then N knocks at 0.6 s spacing | Dry, exact, unhurried. The signature |
| Entering a room | The remaining count, quieter | A reminder |
| Approaching | Plaster creak per step; reel ticking | Regular |
| Hunting | As approaching, closer-miked, with a low tape pulse about once a second | Pressure without melodrama |
| Blocked | Line paying out; bob ticking as it swings, slowing | Puzzled |
| No route | One long draw of the tape, no knock | Almost a sigh |
| Measuring | Tape, pencil, in bursts | Absorbed |
| Bracing | Plaster strain | Held breath |
| Reaching the player | The tape drawn slowly as the world dims | Not a sting |
| Ending | The knock that makes no sound: the gesture, then silence where the knock should be | The quietest moment in the game |

The knock is the most important asset in the project. It is recorded, not synthesised, and chosen for a clear attack that localises well.

## 4. Through walls

Web audio has no model of walls. We approximate it from the house graph, which is already known:

- For each sound source, the audio system asks the domain for the number of doorways on the shortest open route from the source's room to the player's room, ignoring who may use them.
- Zero or one doorway: full, direct sound.
- Each further doorway: about 6 dB quieter and progressively low-passed.
- No route at all: heavily muffled and quiet, but never silent, so the Surveyor can always be heard to exist.

The sound's position stays at its true place in the world, so direction is always honest. Only loudness and brightness follow the graph (REQ-AUDIO-003). The low-pass needs access to the audio graph beneath the SDK's audio component; if that proves awkward, volume alone is used and the muffling is baked into a second set of samples. This is question Q-09.

## 5. Seams and rooms

| Event | Sound | Position |
|---|---|---|
| Room moving | Layered grind: timber drag, chain run, low rumble; pitch and level follow speed | The moving room |
| Seat | Deep thud with a short metallic settle | The joint |
| Return | Falling groan | The moving room |
| Block | Low groan, timber under load | Point of collision |
| Refused profiles | Dull clank of plates that do not mesh | The joint |
| Latch | Rattle (refused), clack (lifted or dropped) | The station |
| Ratchet | Clicks through the stroke | The station |

Because rooms are far away and huge, their sounds have a slow attack and a long tail. Station sounds are close, small and crisp. The contrast is how one hand movement sounds like moving a building.

## 6. Music

Almost none.

- **Chapter body:** no music. A very quiet tonal bed made from bowed metal and room resonance may sit under Sequences 4 and 5, below conscious notice.
- **Room Zero:** a single sustained warm chord, entering as the player comes through the round door.
- **The card:** silence.
- **Title:** one phrase of a few notes on a small, plain instrument, such as a reed organ or bowed glass. Not a music box, not a lullaby.

All music is original, composed for the project.

## 7. Mix

| Priority | Content | Behaviour |
|---|---|---|
| 1 | The count and other Surveyor state sounds | Never ducked; others duck by 4 dB while a count plays |
| 2 | The seam in the player's hand | Full |
| 3 | Feedback: thud, clank, lamp | Full |
| 4 | Hands, paper | Low |
| 5 | Room tone, the void | Very low |
| 6 | Music bed | Lowest |

Loudness is set so that the seating thud is the loudest ordinary event and nothing clips. A single master level is the only audio setting, and it follows the headset volume; there is no in-game slider.

## 8. Implementation notes

- The SDK's audio component provides positional playback, distance models, looping, instance pooling, cross-fade and one-shots, with playback modes for restart, overlap and ignore. Those cover every need above except the low-pass.
- Browsers allow audio only after a user gesture. The Enter VR button is that gesture; the audio context is resumed there and again on every return to the visible state (REQ-AUDIO-004).
- Short sounds are loaded as critical assets before the title. The longer ending bed is loaded in the background during play.
- Format: compressed, mono for positional sources, stereo only for the two beds.

## 9. Asset count

About 60 files, under 6 MB in total. Listed in `asset-register.md`.
