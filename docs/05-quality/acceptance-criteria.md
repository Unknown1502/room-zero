# Acceptance criteria

The vertical slice is accepted when a player who has never seen the game can do all eleven things below on a physical Quest 3, seated, with tracked hands, with no controller used at any step.

"Accepted" requires the evidence in the last column. Passing the emulator tests alone makes the slice **IWER-verified**, which is a milestone and not acceptance.

## The eleven criteria

| # | A new player can | Observable result | Automated evidence | Headset evidence |
|---|---|---|---|---|
| AC-01 | Enter immersive VR | Pressing Enter VR in the Quest Browser starts the session; the envelope is in front of them | RT-01 | HQ-01 |
| AC-02 | Understand how to interact | Without help, they press the seal, hop to the first lamp and take the first grip | RT-03, RT-10 | PT-01, PT-05 |
| AC-03 | Grab a structural seam with their hands | A pinch on the travel grip holds it; the grip glows; either hand works | RT-04, UT-ADPT-03 | HQ-02 |
| AC-04 | Move a module through its constrained path | The room follows the hand along one path only, stops at its limits, and stops at a blocked stretch | RT-06, RT-09, UT-SEAM-01, UT-SEAM-04 | HQ-02, HQ-03 |
| AC-05 | Align and connect compatible doorway sockets | Near a detent the doorways light; on release the room seats; mismatched profiles are refused | RT-07, RT-08, UT-CONN-01 to UT-CONN-04 | HQ-06 |
| AC-06 | Open a previously inaccessible route | After a commit a new lamp lights and they can hop where they could not before | RT-07, RT-22, UT-GRAPH-04 | HQ-06 |
| AC-07 | Encounter the Surveyor | It is heard, then seen at a distance; it counts; it walks the corridor toward them | RT-14, RT-20, UT-SURV-11, UT-SURV-13 | HQ-06, HQ-08 |
| AC-08 | Manipulate the house to block or redirect its route | Swinging the bridge stops it and sends it to the office; swinging back seals it in; its position always matches the open doorways | RT-14, MC-03, MC-04, UT-SURV-03, UT-SURV-05, UT-SURV-08 | HQ-06, PT-03 |
| AC-09 | Complete the final Room Zero puzzle | The arm is blocked by the lift; moving the lift, docking the room and returning the lift opens the round door | RT-09, RT-15, UT-PUZ-03 | HQ-06, PT-04 |
| AC-10 | Deliver the letter and receive the chapter ending | Placing the letter in pigeonhole 0 plays the ending and reaches the title | RT-15, RT-21, UT-PUZ-06 | HQ-06 |
| AC-11 | Restart successfully | "Begin again" returns to the doormat with everything reset and settings kept | RT-13, UT-STATE-05 | HQ-06 |

**No controller at any step:** HQ-06 records input sources throughout the completion run and passes only with zero controller events (REQ-INPUT-001).

## Conditions that apply to all eleven

| Condition | Evidence |
|---|---|
| Frame rate meets REQ-PERF-001 throughout, and never triggers the blocker in REQ-PERF-002 | PF-01 |
| No tester stops for discomfort | CF-06 |
| At least 80% of first-time testers complete unassisted | PT-04 |
| The chapter cannot be softlocked | MC-01 |
| Interrupting at any point loses nothing but position within a sequence | RT-12, RT-18, HQ-07 |
| One-handed mode completes the chapter | CF-07 |
| Every shipped asset has provenance; the originality checklist is signed | INS-04, INS-05 |
| No network request after load | INS-06 |

## Acceptance levels

| Level | Meaning | Required evidence |
|---|---|---|
| Rules-verified | The domain is correct | All UT and MC pass |
| IWER-verified | The application works in the emulator | The above, plus all RT and automated INS pass |
| Quest-verified | It works on hardware | The above, plus all HQ and PF pass on Quest 3 |
| Accepted | It works for people | The above, plus CF and PT pass |

The project reports the highest level it has evidence for, and no higher.

## What acceptance does not include

Final art quality beyond the M6 definition, Quest 2 performance, localisation, store packaging, and anything in `07-delivery/known-limitations.md`.
