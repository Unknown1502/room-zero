// ECS systems. Order per frame (lower runs first): input adapters, the simulation step, presentation.
// SDK systems run before all of these at negative priorities. See docs/04-engineering/technical-architecture.md.
import { InputComponent, Pressed, Vector3, VisibilityState, createSystem } from '@iwsdk/core';
import type { Game } from '../app/game.js';
import { Beacon, Seal } from '../components/game.js';
import type { Hand } from '../domain/types.js';
import { dispatchBeaconSelection, pinchClaimedByGrip, settingSealLive } from '../app/navigation.js';

const HANDS: Hand[] = ['left', 'right'];
const TAKE_RADIUS = 0.09;       // a forgiving sphere round a grip
const LEAVE_RAIL = 0.15;        // further than this from the rail and the hold ends
const LOSS_GRACE = 0.25;        // seconds a hold survives without tracking
const NEAR_GRIP = 0.2;          // a pinch this close to a grip never hops

interface Hold { kind: 'travel' | 'anchor' | 'letter'; seam?: string; station?: number }
interface HandState { pos: Vector3; tracked: boolean; isHand: boolean; pinch: boolean; was: boolean; hold?: Hold; lost: number }

const game = (sys: { globals: Record<string, unknown> }): Game => sys.globals.game as Game;

/** Layer B. Turns tracked hands into commands: take, drag, release. Holds no rules. */
export class HandInputSystem extends createSystem({}) {
  readonly hands: HandState[] = HANDS.map(() => ({ pos: new Vector3(), tracked: false, isHand: false, pinch: false, was: false, lost: 0 }));
  private tmp = new Vector3();
  private rail = new Vector3();

  update(delta: number): void {
    const g = game(this);
    const s = g.session;
    HANDS.forEach((hand, i) => {
      const h = this.hands[i];
      const xr = this.input.xr;
      h.tracked = !!this.world.session && xr.getPrimaryInputSource(hand) !== undefined;
      h.isHand = h.tracked && xr.isPrimary('hand', hand);
      if (h.tracked) {
        // Tracked hands pinch at the fingertips; controllers grip at the grip space.
        const space = xr.isPrimary('hand', hand) ? this.player.indexTipSpaces[hand] : this.player.gripSpaces[hand];
        space.getWorldPosition(h.pos);
        // A hand grabs by pinching. A controller grabs with the squeeze button; its trigger stays the ray select (hops).
        h.pinch = h.isHand ? xr.getSelectState(hand).active : !!xr.gamepads[hand]?.getButtonPressed(InputComponent.Squeeze);
      }
      if (g.failed) { h.hold = undefined; h.was = h.pinch; if (g.letterHand === i) g.letterHand = undefined; return; }
      if (!s.playing()) { h.hold = undefined; h.was = h.pinch; if (g.letterHand === i) g.letterHand = undefined; return; }

      if (h.hold) {
        // Tracking lost: wait out the grace, then release with the last good value (REQ-INPUT-006).
        if (!h.tracked) { h.lost += delta; if (h.lost > LOSS_GRACE) this.release(g, h, i, 'lost'); return; }
        h.lost = 0;
        if (!this.stillHeld(g, h, hand)) { h.hold = undefined; return; }
        if (!h.pinch) { this.release(g, h, i, 'open'); h.was = false; return; }
        if (h.hold.kind === 'travel') {
          const st = g.stations[h.hold.station!];
          st.group.worldToLocal(this.tmp.copy(h.pos));
          const [ox, oy, oz] = st.spec.origin, [dx, dy, dz] = st.spec.dir;
          const along = (this.tmp.x - ox) * dx + (this.tmp.y - oy) * dy + (this.tmp.z - oz) * dz;
          this.rail.set(ox + dx * along, oy + dy * along, oz + dz * along);
          const clamped = Math.max(0, Math.min(st.spec.length, along));
          const off = Math.hypot(this.tmp.distanceTo(this.rail), along - clamped);
          if (off > LEAVE_RAIL) { this.release(g, h, i, 'leftRail'); return; }
          g.command({ type: 'GripDrag', seam: h.hold.seam!, u: clamped / st.spec.length });
        }
      } else if (h.tracked && h.pinch && !h.was) {
        this.take(g, h, i, hand);
      }
      h.was = h.pinch;
    });
  }

  /** The rules may have ended a hold themselves: a hop, a pause, a frozen seam timing out. */
  private stillHeld(g: Game, h: HandState, hand: Hand): boolean {
    const hold = h.hold!;
    if (hold.kind === 'letter') return g.session.letter === 'held';
    const st = g.session.seams[hold.seam!];
    return hold.kind === 'anchor' ? st.anchorHand === hand : st.travelHand === hand && (st.phase === 'held' || st.phase === 'frozen');
  }

  private take(g: Game, h: HandState, i: number, hand: Hand): void {
    const s = g.session;
    let best: { d: number; hold: Hold } | undefined;
    g.stations.forEach((st, idx) => {
      if (st.spec.vantage !== s.vantage) return;
      const consider = (obj: { getWorldPosition(v: Vector3): Vector3 } | undefined, kind: 'travel' | 'anchor') => {
        if (!obj) return;
        const d = obj.getWorldPosition(this.tmp).distanceTo(h.pos);
        if (d < TAKE_RADIUS && (!best || d < best.d)) best = { d, hold: { kind, seam: st.spec.seam, station: idx } };
      };
      consider(st.travel, 'travel');
      if (s.settings.hands === 'two') consider(st.anchor, 'anchor');
      else if (st.pin && st.pin.getWorldPosition(this.tmp).distanceTo(h.pos) < 0.07) g.command({ type: 'LatchPinPress', seam: st.spec.seam });
    });
    if (best) {
      const b = best as { d: number; hold: Hold };
      if (g.command({ type: 'GripTake', seam: b.hold.seam!, role: b.hold.kind as 'travel' | 'anchor', hand }).ok) { h.hold = b.hold; h.lost = 0; }
      return;
    }
    if (s.letter !== 'delivered' && g.letter.getWorldPosition(this.tmp).distanceTo(h.pos) < 0.12 && g.command({ type: 'LetterTake', hand }).ok) { h.hold = { kind: 'letter' }; g.letterHand = i; }
  }

  private release(g: Game, h: HandState, i: number, reason: 'open' | 'lost' | 'leftRail'): void {
    const hold = h.hold!;
    h.hold = undefined; h.lost = 0;
    if (hold.kind === 'letter') {
      const atSlot = g.built.pigeonhole.getWorldPosition(this.tmp).distanceTo(h.pos) < 0.22;
      g.command({ type: 'LetterRelease', atSlot });
      if (g.letterHand === i) g.letterHand = undefined;
    } else g.command({ type: 'GripRelease', seam: hold.seam!, role: hold.kind, reason });
  }

  /** Is the pinching (or holding) hand on a grip, so that the pinch means "take", not "go there"? */
  nearGrip(g: Game): boolean {
    const hands = this.hands.filter((h) => h.tracked).map((h) => {
      let nearestGrip = Infinity;
      if (h.pinch) for (const st of g.stations) {
        if (st.spec.vantage !== g.session.vantage) continue;
        nearestGrip = Math.min(nearestGrip, st.travel.getWorldPosition(this.tmp).distanceTo(h.pos));
        if (st.anchor) nearestGrip = Math.min(nearestGrip, st.anchor.getWorldPosition(this.tmp).distanceTo(h.pos));
      }
      return { pinching: h.pinch, holding: !!h.hold, nearestGrip };
    });
    return pinchClaimedByGrip(hands, NEAR_GRIP);
  }
}

/** Layer B. Lamps and seals: point and pinch, through the SDK's ray interaction. Also a fingertip press on seals. */
export class PointerInputSystem extends createSystem({
  beacons: { required: [Beacon, Pressed] },
  seals: { required: [Seal, Pressed] },
}) {
  private tmp = new Vector3();
  private contacts = new Set<string>();
  private restartHold = 0;
  init(): void {
    this.queries.beacons.subscribe('qualify', (e) => {
      const g = game(this);
      const handNearGrip = this.world.getSystem(HandInputSystem)?.nearGrip(g) ?? false;
      dispatchBeaconSelection(e.getValue(Beacon, 'vantage') as string, true, handNearGrip, (vantage) => g.requestHop(vantage));
    });
    this.queries.seals.subscribe('qualify', (e) => game(this).pressSeal(e.getValue(Seal, 'action') as string));
  }
  update(delta: number): void {
    const g = game(this);
    const hands = this.world.getSystem(HandInputSystem)?.hands ?? [];
    const nearest = (object: { getWorldPosition(v: Vector3): Vector3 }): number => {
      object.getWorldPosition(this.tmp);
      let distance = Infinity;
      for (const h of hands) if (h.tracked) distance = Math.min(distance, h.pos.distanceTo(this.tmp));
      return distance;
    };

    if (g.failed) {
      const d = nearest(g.errorRetry);
      if (d < 0.055) {
        if (!this.contacts.has('error-retry')) { this.contacts.add('error-retry'); g.restart(); }
      } else if (d > 0.075) this.contacts.delete('error-retry');
      return;
    }
    this.contacts.delete('error-retry');

    for (const side of ['left', 'right'] as const) {
      const d = nearest(g.turnMarkers.get(side)!);
      const key = `turn:${side}`;
      if (d < 0.04) {
        if (!this.contacts.has(key)) { this.contacts.add(key); g.requestSnapTurn(side); }
      } else if (d > 0.065) this.contacts.delete(key);
    }

    const handStates = hands.filter((h) => h.tracked).map((h) => ({ pinching: h.pinch, holding: !!h.hold }));
    for (const [name, seal] of g.settingSeals) {
      const d = nearest(seal);
      const key = `setting:${name}`;
      if (!settingSealLive(name, g.session.letter, g.session.game, handStates)) {
        // Not answering now. A hand already on the seal must leave it before it can press once it answers again.
        if (d < 0.055) this.contacts.add(key); else this.contacts.delete(key);
        if (name === 'restart') this.restartHold = 0;
        continue;
      }
      if (name === 'restart') {
        if (d < 0.035) {
          this.restartHold += delta;
          if (this.restartHold >= 2 && !this.contacts.has(key)) {
            this.contacts.add(key);
            g.restart();
            return;
          }
        } else if (d > 0.055) {
          this.restartHold = 0;
          this.contacts.delete(key);
        }
      } else if (d < 0.035) {
        if (!this.contacts.has(key)) { this.contacts.add(key); g.pressSetting(name); }
      } else if (d > 0.055) this.contacts.delete(key);
    }

    for (const [action, seal] of g.seals) {
      if (!seal.mesh.visible) continue;
      for (const h of hands) if (h.tracked && seal.mesh.getWorldPosition(this.tmp).distanceTo(h.pos) < 0.04) g.pressSeal(action);
    }
  }
}

/** Layer B. The XR session's visibility becomes pause and resume (REQ-STATE-002). */
export class LifecycleSystem extends createSystem({}) {
  init(): void {
    let wasImmersive = false;
    this.cleanupFuncs.push(this.world.visibilityState.subscribe((v) => {
      const g = game(this);
      const immersive = v !== VisibilityState.NonImmersive;
      // Hidden or blurred (system menu, headset off): pause. In the browser, with no session, play continues for development.
      const visible = v === VisibilityState.Visible || v === VisibilityState.NonImmersive;
      g.command({ type: 'SetVisibility', visible });
      if (v === VisibilityState.Visible) { g.startAudio(); this.world.session?.updateTargetFrameRate?.(72)?.catch?.(() => undefined); }
      // The session ended while playing: back to the title; continue resumes from the last postmark.
      if (wasImmersive && !immersive && (g.session.playing() || g.session.game === 'Pause')) { g.command({ type: 'SetVisibility', visible: true }); g.returnToTitle(); }
      wasImmersive = immersive;
    }));
  }
}

/** Layer D. The only place the rules are advanced. */
export class GameDirectorSystem extends createSystem({}) {
  update(delta: number): void {
    const g = game(this);
    try {
      g.step(delta);
    } catch (err) {
      g.fail(err);
    }
  }
}

/** Layer E. Draws and sounds the state the rules are in. Reads; never decides. */
export class PresentationSystem extends createSystem({}) {
  update(delta: number): void {
    const g = game(this);
    try {
      g.view(delta, this.world.getSystem(HandInputSystem)?.hands ?? []);
    } catch (err) {
      g.fail(err);
    }
  }
}
