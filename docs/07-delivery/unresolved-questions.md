# Unresolved questions

Open decisions and unknowns, each with who or what resolves it and when. Nothing here is hidden elsewhere as a settled fact. When a question is answered, the answer is written here and the affected documents are updated.

Status of all: **open**.

## Needs a person's decision

| ID | Question | Why it matters | Default if nobody decides | By |
|---|---|---|---|---|
| Q-19 | Is a Quest 3 or 3S available to the team, and from when? | Without one the project cannot go beyond IWER-verified, and comfort, tracking and performance stay unknown | Proceed to IWER-verified and say so | Before M0 |
| Q-22 | Who produces art, animation and audio, and with how much time? | M6 is content production. Scope must match capacity | Graybox through M5; scope review then | End of M5 |
| Q-20 | Is the title "Room Zero" free to use? | A conflict could force a rename or a takedown. No search has been done | Treat the title as provisional; do not publish under it | Before any public release |
| Q-18 | Which static host? | Affects the content security policy, cache headers and the release steps | Any static HTTPS host | M7 |
| Q-17 | Which generated tooling stays: the headset command-line tool that reports usage data, the reference-search package, the agent and editor configuration folders? | Privacy on developer machines; three high-severity advisories in the development tree; clutter | Keep the SDK command-line tool and dev plugin; remove the rest unless used | M0 |
| Q-26 | Stay on IWSDK 1.1.0 for the whole slice, or move to 1.2 when it is released? | 1.2.0 has a release candidate. An upgrade mid-project costs time; staying may miss fixes | Stay on the version M0 generates; revisit once, at the end of M5 | M0, M5 |
| Q-23 | What level of Quest 2 support is promised? | It may not reach frame rate | Best effort, stated as such | M7 |
| Q-21 | Is a fuller competitive search needed before describing the game publicly? | Claims about distinctiveness rest on a brief review | Make no uniqueness claims | Before marketing |

## Answered by the M0 spike

These are the assumptions A1 to A11 in `04-engineering/iwsdk-verification.md`.

| ID | Question | If the answer is no | Assumption |
|---|---|---|---|
| Q-01 | Does a one-hand grabbable with translation and rotation disabled still receive the grabbed tag when pinched? | Use rail-constrained grab limits, or our own pinch test | A1 |
| Q-02 | Do the player rig's grip spaces follow tracked hands, not only controllers? | Read hand joint poses from the input manager | A2 |
| Q-03 | How quickly is the grabbed tag removed when a hand is lost? | Add our own tracked-state check | A3 |
| Q-04 | When a pinch is made near a grip, does it also fire a ray select on something behind? | Rely on the suppression rule already specified | A4 |
| Q-05 | Can the player rig be placed and turned directly during an XR session with locomotion off? | Use the authored-position call, or enable locomotion for its position setter only | A5 |
| Q-06 | Can the tracked-hand visual be restyled as a glove? | Ship the default hand | A6 |
| Q-07 | Does a tracked fingertip press a poke interactable reliably? | Use ray select for seals | A7 |
| Q-10 | Can 72 Hz be requested on the session and foveation set on the renderer as the generator's reference describes? | Accept browser defaults | A8 |
| Q-11 | Can a ray interactable be added and removed at run time cheaply? | Ignore unlit lamps in the adapter | A9 |
| Q-13 | Can the SDK command-line tool script a held pinch along a rail and drive two hands in one sequence? | Build tests from lower-level steps | A10 |
| Q-12 | Does the proposed test runner work with the starter's Vite version and configuration? | Give tests their own minimal configuration, or choose another runner | A11 |

## Answered during implementation

| ID | Question | Options | By |
|---|---|---|---|
| Q-08 | How should the letter return to the strap? | The distance grabbable's return-to-origin; the follower component; our own easing | M3 |
| Q-09 | Can a low-pass filter be applied per audio source beneath the SDK's audio component? | Yes: muffle by route length. No: level only, or a second set of pre-muffled samples | M4 |
| Q-14 | Are the two in-VR cards built with the SDK's UI kit, which means enabling that feature, or as plain textured quads? | UI kit; quads | M5 |
| Q-15 | How are baked lightmaps authored and attached to kit parts so the SDK's scene and asset pipeline loads them? | Second UV set in glTF with a lightmap texture; baked into base colour for simple rooms | Before M6 |
| Q-24 | What does the content security policy need to allow for texture and mesh decoders? | Found by running the production build under a strict policy | M7 |
| Q-27 | Should all 288 blocked-stretch results be precomputed at load, or computed on demand and cached? | Measure one computation at M2 | M2 |
| Q-28 | Is the startup shader and texture warm-up enough to meet the hitch budget, or is the SDK's deferred upload facility needed? | Measure at M5 | M5 |

## Answered only on a headset, with people

| ID | Question | Test |
|---|---|---|
| Q-16 | Does seated eye height vary enough between people that stations need a height calibration? | CF-01, HQ-04 |
| Q-29 | Is watching a 14 m room cross the void comfortable at the planned speed cap? | CF-03 |
| Q-30 | Is a held pinch reliable enough for two-hand seams, or should the latch pin be the default? | HQ-02, HQ-03 |
| Q-31 | Are the snap window of 0.15 and the rail lengths right for real hands? | HQ-02, PT-01 |
| Q-32 | Is the encounter's twelve-second window right for first-time players, and are the eighteen seconds to leave the corridor at the finale? | PT-03, PT-04 |
| Q-33 | Can door profiles be read at 30 m in this darkness on the headset's display, and at which foveation level? | HQ-09 |
| Q-34 | Can players locate the Surveyor by ear on the headset's speakers? | HQ-08 |
| Q-35 | Do first-time players understand the Wrong Door, and the Surveyor's compulsion, without the third hint? | PT-02, PT-03 |
| Q-36 | Does the budget of 120 draw calls and 300,000 triangles hold 72 frames per second on Quest 3 in the browser? | PF-01, PF-02 |

## Design questions deliberately left open

| ID | Question | Note |
|---|---|---|
| Q-37 | Should the Surveyor's count also be heard for joints it logs before waking, as now, or would silence be stronger? | Tune at M4 by ear |
| Q-38 | Is the half-way detent on the landing worth its cost? | Cut candidate at the M5 scope review |
| Q-39 | Should the ending wait for the Surveyor's arrival, as specified, or play at once? | Tune at M5 |

## How this list is used

A milestone is not closed while a question assigned to it is open. A question may be closed as "decided by default" if nobody has answered it by its date; the default is then recorded as the decision.
