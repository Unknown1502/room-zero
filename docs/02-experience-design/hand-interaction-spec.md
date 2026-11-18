# Hand interaction specification

How the player's hands operate the game. SDK facts cited here are recorded in `04-engineering/iwsdk-verification.md` with their evidence level. Anything marked **to verify in M0** has been read in a type declaration or SDK note but not exercised.

All numbers are starting values for tuning on a headset.

## 1. Principles

1. **Hands only.** No required step needs a controller (REQ-INPUT-001).
2. **Three gestures, no more.** Pinch-and-hold on brass. Point-and-pinch at a lamp. Fingertip press on a wax seal.
3. **One hand may always stay still.** Tracking is most reliable for a hand that is not moving and is in front of the headset.
4. **Nothing fights the hand.** The hand visual is never displaced from the tracked hand. Weight is shown by the room, not by dragging the player's hand image.
5. **Losing tracking never commits anything the player did not intend** (REQ-INPUT-006).

## 2. Hand representation

- The SDK's tracked-hand visual is the only hand shown. The SDK notes say it provides an animated skeletal hand mesh for hand-tracking mode. We restyle its material as the courier's glove and attach a cuff. **To verify in M0:** that the hand material can be replaced and a cuff parented to the wrist without forking the SDK. If it cannot, we ship the SDK's default hand and drop the glove (REQ-INPUT-008 is met either way).
- No second, game-owned hand mesh. No hand is drawn when tracking is lost.

## 3. Interaction types and their SDK basis

| Interaction | Gesture | SDK mechanism | Evidence |
|---|---|---|---|
| Take a grip | Pinch near it and hold | `OneHandGrabbable` on the grip entity; `GrabSystem` forwards a hand pinch as a grab (`useHandPinchForGrab`, default true); the `Grabbed` tag marks the hold | Declarations read |
| Know which hand | n/a | `GrabSystem.getHolderHand(entity)` | Declaration read |
| Force a release | n/a | `GrabSystem.forceRelease(entity)` | Declaration read |
| Hop | Point with the hand ray at a lamp, pinch | `RayInteractable` on the beacon; `Hovered` and `Pressed` tags | Declarations read; guide states hand rays drive the same tags as controller rays |
| Press a seal | Push a fingertip through it | `PokeInteractable`; `Pressed` tag | Declaration read |
| Hand position | n/a | `player.gripSpaces.left` and `.right`, world position | SDK reference read. **To verify in M0:** that grip spaces follow tracked hands, not only controllers |

## 4. Grips

### 4.1 Anatomy

A grip is a knurled brass bar 11 cm long and 3 cm in diameter, standing 4 cm proud of its rail on two posts. Every grip in the house is the same object. A **travel grip** rides a rail. An **anchor grip** is fixed and is stamped with a small anchor.

### 4.2 Reach envelope

At every station, every grip and the whole length of its rail lie inside this volume, measured from the vantage's seated reference point (floor point beneath the head) (REQ-COMFORT-001):

| Axis | Range |
|---|---|
| Height above floor | 0.75 m to 1.25 m |
| Forward | 0.30 m to 0.55 m |
| Sideways from centre | within 0.45 m |

Two-hand stations place the anchor grip on one side and the travel rail on the other, 0.35 m to 0.5 m apart, and are mirrored when the handedness setting is changed.

### 4.3 States of a grip

| State | Entered when | Shown by |
|---|---|---|
| Idle | No hand within 0.20 m | Dull warm brass |
| Near | A hand within 0.20 m | Brightens; one slow pulse |
| In reach | A hand within 0.08 m | Steady glow on the knurling |
| Held | Pinch closed within reach | Glow moves to the rail; leather creak |
| Refused | Grab attempted while latched or held by the Surveyor | Short rattle; the grip jitters 2 mm; the reason is shown (anchor pulses, or chalk dust falls) |
| Limit | Held at a rail end or block | Dull knock; rail end flashes once |

Proximity is computed by our input adapter from grip-space positions. It does not use `Hovered`, which belongs to ray and poke pointers.

## 5. From hand to seam

### 5.1 The mapping

The SDK is used to detect that a grip is held and by which hand. The seam position is computed by us:

1. Each frame while a travel grip is held, take the holding hand's world position.
2. Project it onto the rail curve: a line segment for linear seams, an arc for rotary ones.
3. Normalise to a rail parameter `u` from 0 to 1.
4. Send `u` to the domain as a drag command. The domain converts it to the seam parameter, clamps it at limits and blocked stretches, and returns the clamped value.
5. Presentation places the travel grip on the rail at the clamped value and moves the room toward it.

The grip is therefore always on its rail, even if the hand drifts off it. If the hand moves more than 0.15 m from the rail, the hold is released.

**Why not let the SDK move the grip.** `OneHandGrabbable` offers `translateMin` and `translateMax` and rotation limits, which could constrain a grip to a rail. We do not rely on them because the declarations do not say which coordinate frame the limits use, how a rotation-only grab maps hand motion to angle, or whether the result can be geared. Computing the parameter ourselves removes all three unknowns and gives one code path for lines and arcs.

**Fallback ladder, decided in M0.**

| Plan | Grab detection | Position | Use if |
|---|---|---|---|
| P1 (intended) | `OneHandGrabbable` with `translate: false`, `rotate: false`; read `Grabbed` | Our projection of the grip-space position | A grabbable with both motions disabled still receives `Grabbed` |
| P2 | `OneHandGrabbable` constrained to the rail with `translateMin`/`translateMax` in a rail-aligned parent frame | Read the grip's local position back | P1's tag is not set, and the limits prove to be in local space |
| P3 | Our own pinch test: hand within 0.08 m and the hand's select value above threshold | Our projection | Neither works for hands |

### 5.2 Rails

| Seam type | Rail | Hand travel |
|---|---|---|
| Linear, two detents | Straight, 0.40 m | Full length between detents |
| Linear, three detents | Straight, 0.40 m, notch at the middle | 0.20 m between detents |
| Rotary lever, two detents (`seam-bridge`, `seam-arm`) | Arc of radius 0.30 m through 90 degrees | 0.47 m along the arc |
| Ratchet (`seam-rotunda`) | Same arc. One full stroke advances one detent; the lever then returns to its start by itself | One stroke per quarter turn, either direction |

### 5.3 Gearing and weight

- The rail parameter maps linearly to the seam path between adjacent detents. A 0.40 m pull moves the landing 14 m.
- The room's drawn position chases the target with a critically damped spring and a speed cap, so that a full pull takes at least 1.2 s to arrive however fast the hand moves. This is presentation only. The domain's value is the clamped hand value.
- After release the room finishes its travel and seats within 0.8 s (REQ-SEAM-012).

### 5.4 Snapping, preview and return

| Term | Definition | Value |
|---|---|---|
| Snap window | Distance from a detent, as a fraction of the spacing to the next detent, within which a release seats there | 0.15 |
| Preview window | Distance within which doorways that would connect begin to light | 0.30, brightening to full at 0.15 |
| Return | Release outside every snap window | The room and grip ease back to the last committed detent over 0.6 s; falling groan |
| Connection tolerance | Geometric tolerance for sockets to count as mated | 0.05 m, 2 degrees. This is a property of the rules, not of the hand. See `house-graph-rules.md` |

A ratchet stroke commits when the lever passes 0.85 of its arc and is released, or reaches the end stop.

### 5.5 Blocked stretches

The domain returns the clamped parameter and a reason. At a block the grip stops on the rail, the room stops short, an ash-grey outline of the swept shape appears where it would collide, and a low groan plays. Pulling further does nothing. Releasing returns the room.

## 6. Two-hand seams

A latched seam needs the anchor grip held before the travel grip will move.

| Situation | Result |
|---|---|
| Travel grip taken first, anchor not held | Refused: rattle, anchor pulses. The pinch may be kept; taking the anchor then frees it |
| Anchor held, travel taken | Latch lifts with a clack. Travel moves |
| Anchor released while travel is held | Latch drops. The room freezes where it is. Re-taking the anchor within 1.5 s continues. After 1.5 s it counts as a release of the travel grip: snap or return |
| Both released together | Snap or return |

Two one-hand grabbables are used instead of the SDK's `TwoHandsGrabbable` because its declaration says a two-hand hold reports only the left hand as holder, and because we need the two hands to do different things. ADR-005.

**One-handed mode** (REQ-A11Y-001): the anchor grip is replaced by a latch pin. Pressing it with a fingertip lifts the latch for 6 s, renewed while the travel grip is held.

## 7. Hopping

- Each vantage the player can currently hop to shows a small signal lamp: a courier-sized brass lantern on a bracket, lit warm. Lamps for vantages that cannot be reached are dark and do not respond (REQ-UX-004).
- Pointing a hand at a lit lamp brightens it and draws the SDK's hand ray to it. A pinch starts the hop.
- The lamp's ray target is a sphere 0.5 m across at the lamp, larger than the lamp, so that distant lamps are easy to hit. Lamps are placed so that no two targets overlap from any vantage.
- A hop releases any held grip first.

**Conflict to manage:** a pinch near a grip must grab, not hop. Lamps are never placed behind a station from the seated viewpoint, and a hop is ignored if either hand is within 0.20 m of a grip. **To verify in M0:** how the SDK arbitrates between a near grab and a far ray on the same pinch.

## 8. The letter

- A flat object 16 cm by 11 cm. At chapter start it is in the open left hand.
- It is a one-hand grabbable. When released anywhere except the pigeonhole it eases back to the satchel strap, a point 0.25 m below and 0.20 m left of the head, in front of the hip, which follows the player's position and turns only about the vertical axis.
- Turned face down within view, its back shows the postmarks, any hint line, and four wax seals for settings.
- Held within 0.08 m of pigeonhole 0 and released, it seats in the slot and the ending begins.

**To verify in M0:** whether release-and-return is better done with `DistanceGrabbable`'s `returnToOrigin`, the `Follower` component, or our own easing.

## 9. Wax seals

Four seals on the envelope's back, each 3 cm across, pressed with a fingertip: snap turn (off, 30 degrees, 45 degrees), intensity (standard, reduced), hands (two, one, and mirrored layout), and begin again (press and hold 2 s). They are symbols, embossed, and each changes shape as well as tone when toggled.

## 10. Tracking loss and other interruptions

| Event | Detection | Response |
|---|---|---|
| Holding hand loses tracking | Hand input source disconnects, or `Grabbed` is removed without a pinch-open | Hold the last value for a 0.25 s grace. If tracking returns within it and the pinch is still closed and within 0.15 m of the rail, continue. Otherwise treat as a release at the last valid value: snap or return |
| Bracing hand loses tracking | Same | Latch drops; room freezes; 1.5 s to re-take, as in section 6 |
| Both hands lost | Same | Each handled as above. Nothing commits outside a snap window |
| Hand leaves the rail by more than 0.15 m | Our projection | Release |
| Headset removed, system menu opened | `visibilityState` leaves `Visible` | Force-release all grips with return, not snap; pause |
| A hop is requested while holding | Command order | Release first, then hop |
| Session ends | Session end event | As headset removed, then save nothing new |

A release caused by loss returns the room unless the last valid value was inside a snap window. It never seats a room somewhere the player had not brought it.

## 11. Controllers (optional)

If controllers are picked up, squeeze grabs, trigger selects, and the controller tip presses seals. This is the SDK's default mapping and costs nothing. It is tested once (RT-17) and is not required for any acceptance criterion.

## 12. What must be learned in M0

1. Does a grabbable with translation and rotation disabled still produce `Grabbed`? (P1)
2. Do grip spaces follow tracked hands?
3. How long after real tracking loss is `Grabbed` removed?
4. How are a near grab and a ray select arbitrated on one pinch?
5. Can the hand visual be restyled?
6. How reliable is a held pinch on Quest 3 for 10 s while the hand moves 0.4 m? Target: at least 95% of holds are not dropped (HQ-02).
