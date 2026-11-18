// The reference solution of chapter one, as a driver over GameSession.
// Used for canonical checkpoint snapshots (save repair) and by tests. See first-chapter.md section 10.
import type { GameSession } from './session.js';
import { TICK_SEC } from './types.js';

export class Driver {
  constructor(readonly s: GameSession) {}

  wait(sec: number): void {
    for (let i = 0; i < Math.round(sec / TICK_SEC); i++) this.s.tick();
  }

  /** Tick until a condition holds. Throws rather than loop for ever. */
  until(cond: () => boolean, maxSec = 300): void {
    for (let i = 0; i < maxSec / TICK_SEC; i++) {
      if (cond()) return;
      this.s.tick();
    }
    throw new Error('condition never held');
  }

  hop(v: string): void {
    const r = this.s.apply({ type: 'Hop', vantage: v });
    if (!r.ok) throw new Error(`hop ${v}: ${r.reason}`);
  }

  /** Move a seam to a detent the way a player does: brace if latched, take, drag in steps, release, wait for rest. */
  move(seamId: string, detent: number): void {
    const sm = this.s.house.seamById.get(seamId)!;
    const st = () => this.s.seams[seamId];
    const strokes = sm.ratchet ? (detent - st().committed + sm.detents.length) % sm.detents.length : 1;
    for (let k = 0; k < strokes; k++) {
      if (sm.latched) this.must({ type: 'GripTake', seam: seamId, role: 'anchor', hand: 'left' });
      this.must({ type: 'GripTake', seam: seamId, role: 'travel', hand: 'right' });
      const span = sm.detents[sm.detents.length - 1] - sm.detents[0];
      const from = sm.ratchet ? 0 : (st().param - sm.detents[0]) / span;
      const to = sm.ratchet ? 1 : (sm.detents[detent] - sm.detents[0]) / span;
      for (let i = 1; i <= 10; i++) {
        this.must({ type: 'GripDrag', seam: seamId, u: from + ((to - from) * i) / 10 });
        this.s.tick();
      }
      this.must({ type: 'GripRelease', seam: seamId, role: 'travel', reason: 'open' });
      if (sm.latched) this.must({ type: 'GripRelease', seam: seamId, role: 'anchor', reason: 'open' });
      this.until(() => st().phase === 'rest', 5);
    }
  }

  private must(c: Parameters<GameSession['apply']>[0]): void {
    const r = this.s.apply(c);
    if (!r.ok) throw new Error(`${c.type} ${'seam' in c ? c.seam : ''}: ${r.reason}`);
  }
}

/** Steps of the reference solution. Each returns after its checkpoint, if it has one. */
const STEPS: [string | undefined, (d: Driver) => void][] = [
  [undefined, (d) => { d.hop('v-foyer-door'); d.move('seam-hall', 1); }],
  ['cp-stairhead', (d) => { d.hop('v-stair-head'); }],
  [undefined, (d) => { d.move('seam-landing', 2); }],
  ['cp-landing', (d) => { d.hop('v-landing-east'); }],
  [undefined, (d) => { d.move('seam-rotunda', 1); d.hop('v-turn-centre'); }],
  ['cp-corridor', (d) => { d.hop('v-cwest-end'); }],
  [undefined, (d) => {
    d.until(() => d.s.surveyor.room === 'c-east' && !d.s.surveyor.crossing);
    d.move('seam-bridge', 1);
    d.until(() => d.s.surveyor.room === 'dead-letter' && !d.s.surveyor.crossing);
    d.move('seam-bridge', 0);
    d.until(() => !!d.s.flags.surveyorSealed);
    d.hop('v-bridge-mid');
  }],
  ['cp-east', (d) => { d.hop('v-ceast-west'); }],
  [undefined, (d) => { d.hop('v-ceast-end'); d.move('seam-lift', 0); d.move('seam-arm', 1); }],
  ['cp-docked', (d) => { d.move('seam-lift', 1); }],
  ['complete', (d) => {
    d.hop('v-lift');
    d.hop('v-zero');
    d.s.apply({ type: 'LetterTake', hand: 'right' });
    d.s.apply({ type: 'LetterRelease', atSlot: true });
    d.until(() => d.s.game === 'ChapterComplete', 120);
  }],
];

/** Play the reference solution on a session that has just begun, stopping once `untilCheckpoint` is reached. */
export function replayReference(s: GameSession, untilCheckpoint: string): void {
  if (s.checkpoint === untilCheckpoint) return;
  const d = new Driver(s);
  for (const [cp, step] of STEPS) {
    step(d);
    if (cp === untilCheckpoint) return;
  }
}
