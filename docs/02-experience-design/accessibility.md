# Accessibility

What the chapter does to include more players, and where it honestly does not. Requirement IDs are in the SRS.

## Supported

| Need | Provision | Requirement |
|---|---|---|
| Cannot or prefer not to stand or walk | The whole chapter is seated and stationary | REQ-COMFORT-001 |
| Limited reach | Every grip within a defined seated envelope; nothing above the shoulder or below the knee | REQ-COMFORT-001 |
| One usable hand | One-handed mode: bracing is replaced by a latch pin pressed once; the letter holsters itself; every seam, hop and seal can be done with one hand | REQ-A11Y-001 |
| Left-handed, or one side stronger | Any hand can do any role; station layout can be mirrored | REQ-A11Y-002, REQ-INPUT-009 |
| Sensitive to motion | No smooth motion, no camera animation, the player's room never moves, faded hops, optional snap turn | REQ-COMFORT-002, REQ-COMFORT-004, REQ-COMFORT-005 |
| Sensitive to fear or startle | Reduced intensity: slower Surveyor, greater distance, no close approach, softer capture | REQ-A11Y-003 |
| Deaf or hard of hearing | Every sound that carries game information has a visual twin: the count as chalk strokes, "no route" as slack tape, seam refusal as jitter and dust, connection as the ring of light | REQ-A11Y-004 |
| Colour vision deficiency | Socket profiles differ by shape; states differ by brightness, motion and form; no information is carried by hue alone | REQ-A11Y-005 |
| Low vision, partial | Grips are at least 3:1 in luminance against their surroundings; envelope text has a capital height of at least 20 mm at 0.5 m; backlit silhouettes | REQ-A11Y-006 |
| Cannot hold a pinch for long | No hold longer than about 10 s is required; a ratchet stroke takes about 2 s; a dropped pinch returns the room without penalty | REQ-SEAM-003 |
| Slow to react | The tightest timing window is about 12 s and recurs; reduced intensity lengthens it; puzzles have no timer | REQ-ENEMY-011 |
| Hand tracking unavailable or unreliable for the player | Controllers work for every interaction | REQ-INPUT-005, REQ-INPUT-010 |
| Needs to stop suddenly | Removing the headset pauses everything and loses nothing | REQ-STATE-002 |

## Visual twins for sound

| Sound | Meaning | Visual twin |
|---|---|---|
| N knocks | The Surveyor's route has N doorways | N chalk strokes on the nearest lamp bracket, fading over 6 s |
| Long tape, no knock | It has no route | A slack loop of tape in its hand |
| Seating thud | Connected | Ring of light holds for 1 s; dust puff at the seam |
| Falling groan | Returned, not connected | The room visibly drifts back; no ring |
| Dull clank | Profiles refused | Threshold plates shake and do not interlock |
| Latch rattle | Needs bracing | Travel grip jitters; anchor grip pulses |
| Low groan at a stop | Path blocked | Ash outline of the collision |
| Measuring sounds, distant | It is waking | The far door's fanlight flickers |
| Lock turning (finale) | A locked door has opened | A light comes on behind the Dead Letter Office glazing |

## Not supported in this slice

Stated plainly so that nobody is misled.

| Need | Status | Reason |
|---|---|---|
| Blind players | Not playable | The puzzles depend on reading shapes across a distance. An audio-only design would be a different game |
| No use of either hand or arm | Not playable | There is no gaze, voice or switch input. The SDK has gaze-and-pinch support that could be explored later |
| Screen reader | Not applicable in VR; the web page uses semantic HTML and is readable |  |
| Languages other than English | Not localised | Fewer than forty words of story text; hints are English |
| Remappable gestures | Not offered | Three gestures; controllers are the alternative |
| Adjustable text size | Not offered | Text is on a held object that can be brought closer |
| Photosensitivity | Designed to be safe: no strobing, no full-field flashes | Not formally assessed against a standard |

## Settings

All on the back of the envelope, as embossed wax seals with symbols, usable at any time, saved locally.

| Seal | Options | Default |
|---|---|---|
| Turning arrow | Snap turn off, 30 degrees, 45 degrees | Off |
| Dimmed lamp | Intensity standard, reduced | Standard |
| Single hand | Two hands, one hand; press again to mirror the layout | Two hands |
| Doormat | Begin again (press and hold 2 s) | n/a |

The same four choices are offered as ordinary buttons on the web page before entering VR, so a player who needs one-handed mode does not have to operate the envelope two-handed to find it.

## Verification

- CF-07: a full run in one-handed mode on a headset.
- RT-16: seals toggle and persist.
- An inspection with audio muted: every item in the visual-twin table is observable (part of HQ-06).
- A colour-vision simulation pass on screenshots of each station (part of INS-05's review).
