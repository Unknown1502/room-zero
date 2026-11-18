# Comfort test plan

Comfort cannot be established in an emulator. Every test here needs a headset and people.

## 1. Participants and conduct

- Six to eight people per round, including at least two who describe themselves as prone to motion sickness, at least one left-handed person, and a spread of heights and arm lengths.
- Seated on a fixed chair. Hands only.
- Participants are told they can stop at any time for any reason, and that stopping is useful information.
- A facilitator watches and does not help unless asked.
- Discomfort is rated on a 0 to 10 scale before the session, at each postmark, and at the end, with 0 as none. A short symptom checklist is completed before and after: general discomfort, fatigue, eye strain, difficulty focusing, headache, sweating, nausea, dizziness.
- Any rating of 4 or more, or any request to stop, ends that person's session and is recorded as a finding.

Rounds: one at M5 on graybox, one at M7 on the release build. A quick check by the team at M0 and M1 on the first seam.

## 2. Tests

Results: all "not run".

| ID | Question | Method | Pass | Requirement |
|---|---|---|---|---|
| CF-01 | Can everyone reach everything, seated, without strain? | Each participant operates every station. Record leaning, stretching, hand height complaints. Measure the furthest and highest grip positions used | No one leans more than 20 cm or raises a hand above the shoulder; no complaints of arm fatigue during the chapter | REQ-COMFORT-001 |
| CF-02 | Is the hop comfortable and not disorienting? | Ratings after the first three hops and at the end; ask "did you ever not know where you were?" | Median rating 1 or less; no one disoriented after the first hop | REQ-COMFORT-002, REQ-COMFORT-003 |
| CF-03 | Do large moving rooms cause a sense of self-motion? | Ratings immediately after the landing crossing, the first rotation of the Turning Room, and the bridge swing. Ask "did it feel as if you moved?" Repeat the landing crossing at the fastest hand speed | Median 1 or less; no rating of 4 or more; if anyone reports self-motion, lower the speed cap and re-test | REQ-COMFORT-006 |
| CF-04 | Is the Surveyor frightening in the intended way and not distressing? | Ratings of fear and of discomfort separately, after the encounter and after being caught once deliberately. Check its closest drawn distance from a recording | Fear may be high; discomfort median 2 or less; nobody removes the headset; closest distance at least 1.5 m | REQ-COMFORT-007 |
| CF-05 | Does snap turn work and stay comfortable? | Two participants in the fixed chair use 30 and 45 degree steps for a whole run | Median 1 or less | REQ-COMFORT-005 |
| CF-06 | Is the whole session comfortable? | Ratings and symptom checklist before and after the full chapter | No one stops for discomfort; median end rating 1 or less; no symptom rises by more than one step | REQ-COMFORT-004, REQ-COMFORT-008 |
| CF-07 | Is one-handed mode complete and comfortable? | Two participants play the whole chapter with one hand, one of them with the non-dominant hand | Both complete; ratings as CF-06 | REQ-A11Y-001 |

## 3. Things to watch for

| Observation | Likely cause | First response |
|---|---|---|
| Leaning forward at stations | Grips too far | Move the station closer within the envelope |
| Hands raised and held up | Grips too high; fatigue | Lower the station; shorten required holds |
| Looking down a lot | Station too low; neck strain | Raise the station |
| Unease while a room moves | Vection | Slower speed cap; darker void; narrower view of the moving room |
| Flinching at the edge | Height | More floor in front; a more solid rail |
| Startle at the Surveyor's first appearance | Too close or too sudden | It is already distant and slow; check the audio lead-in is audible |
| Confusion after a hop | Facing or landmarks | Adjust the vantage's facing; add a landmark |
| Squinting at the envelope | Text size or darkness | Larger text; a brighter key light on the letter |
| Grip dropped repeatedly | Tracking, pinch held too long | Check hand position relative to the headset cameras; shorten the rail |

## 4. Standing play

Not a target, but one participant per round plays standing still to confirm nothing breaks: stations are lower relative to the head, and the rail positions should still be reachable.

## 5. Reporting

Per participant: ratings at each point, symptoms before and after, completion, anything said. Per round: the medians, the list of findings and what was changed. Results are labelled Human-tested and Quest-tested with the device and build.

## 6. Limits of this plan

Six to eight people will find gross problems and will not characterise rare ones. The plan supports the statement "no tester stopped for discomfort in these sessions", and nothing stronger.
