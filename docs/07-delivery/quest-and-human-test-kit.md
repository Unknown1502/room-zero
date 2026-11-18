# Quest validation checklist and first-time-player observation script

Both are **NOT TESTED**. Nothing in this repository was run on a Quest or by a person. This page is what a real tester needs so that the next round produces evidence.

## A. Quest 3 / 3S checklist (needs a headset and the HTTPS URL)

Record each item as Pass, Fail or Not run, with a note and, where it helps, a screen recording.

1. **Start.** Open the URL in the Quest Browser, press Enter VR. Time from the press to the title. Any error text?
2. **Hands.** With hand tracking on and controllers down: do both hands appear and follow? Does the "NO HANDS FOUND" card appear after 5 s if hands are hidden?
3. **Title.** Touch BEGIN with a fingertip. Does it start? Is the "Touch a seal" prompt readable at arm's length?
4. **First hop.** Point at the lit lamp, pinch. Does the view hop and fade comfortably?
5. **First seam.** At the foyer door seat, pinch the brass grip and slide it. Does the grip follow the hand without lag? Does the doorway join and a lamp light?
6. **Two-hand seam.** At the stair head, brace with one hand and pull with the other. Does it feel reliable? How many tries?
7. **Reach.** Seated, can every grip be reached without leaning? Any grip too far or too near?
8. **Surveyor.** Can you see it in the East Corridor from the west end? Does its movement read? Does the bridge swing work while it is in view?
9. **Ending.** Is "You are the return address." legible on the card? Can you take the letter and place it in pigeonhole 0?
10. **Comfort.** Any discomfort at hops, seam movement, the fade? (Ask: 0 none to 3 strong.) Try snap turn and reduced intensity.
11. **Performance.** Open the Quest performance overlay or OVR Metrics; note frame rate in the foyer, during a seam move, during the encounter. The target is 60 FPS or better.
12. **Audio.** With headphones, listen to every sound listed in `qa/experience-polish/reports/audio-audit.md` in context. Note anything harsh, too quiet, repeated or missing. **No one has listened to the audio yet.**
13. **Exit and return.** Take the headset off for 10 s and put it back; take the system menu out and back. Does the game pause and resume?

## B. First-time-player observation script (needs a person who has never seen the game)

Setup: a Quest with the URL open at the page, the tester seated, no explanation of the game. Say only: "This is a VR game. Play it. Think aloud. I will not help unless you are stuck for two minutes."

Observe and note the time of each:

| Moment | Question to answer by watching | Note |
|---|---|---|
| Enter VR to title | Did they find Enter VR? Did they understand the letter and seals? | |
| Begin | Did they touch BEGIN? Did they try something else first? | |
| First 30 s in the foyer | Did they look at the lamp? Did they point and pinch without help? | |
| First seam | Did they find the brass grip? Did they pinch and slide? How long did it take? | |
| Cause and effect | Did they say, or show, that the doorway joined because of their action? | |
| Stair head | Did they work out the brace hand? | |
| Wrong Door | Did they understand why the room had to turn? | |
| Surveyor | Did they notice it before it was pointed out? What did they think it was? | |
| Bridge swing | Did they link swinging the bridge to the Surveyor's route? | |
| Final puzzle | Did they work out lift away, room in, lift back? | |
| Ending | Did they read the card? What did they say it meant? | |
| Total time | Start to ChapterComplete. | |

After play, ask: "What was the goal?", "What did the brass grips do?", "What was the tall figure?", "What would you change first?". Record the answers in the tester's own words. Do not lead.

Count as defects of **presentation** (not puzzle design) anything the tester could not do because they could not see or understand what to do.
