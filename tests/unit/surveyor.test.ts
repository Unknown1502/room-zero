// The Surveyor. IDs refer to docs/05-quality/test-strategy.md.
import { describe, expect, it } from 'vitest';
import { chapterOne } from '../../src/content/chapter-one';
import { Driver, replayReference } from '../../src/domain/reference';
import { GameSession } from '../../src/domain/session';
import type { DomainEvent, SurveyorStateId } from '../../src/domain/types';

function at(cp: string, settings = {}) {
  const s = new GameSession(chapterOne, { snapTurn: 0, intensity: 'standard', hands: 'two', volume: 1, ...settings });
  s.apply({ type: 'Begin', mode: 'new' });
  s.apply({ type: 'IntroDone' });
  replayReference(s, cp);
  s.drainEvents();
  return { s, d: new Driver(s) };
}
/** Tick, collecting events, until a condition or a time limit. */
function run(s: GameSession, sec: number, stop: () => boolean = () => false): DomainEvent[] {
  const out: DomainEvent[] = [];
  for (let i = 0; i < sec * 20 && !stop(); i++) { s.tick(); out.push(...s.drainEvents()); }
  return out;
}
const counts = (ev: DomainEvent[]) => ev.filter((e) => e.type === 'SurveyorCount').map((e) => (e as { n: number }).n);
const rooms = (ev: DomainEvent[]) => ev.filter((e) => e.type === 'SurveyorEnteredRoom').map((e) => (e as { room: string }).room);

describe('the Surveyor', () => {
  it('UT-SURV-13 stays dormant until the player reaches the corridor; earlier joints are logged, not fresh', () => {
    const s = new GameSession(chapterOne);
    s.apply({ type: 'Begin', mode: 'new' }); s.apply({ type: 'IntroDone' });
    const d = new Driver(s);
    d.hop('v-foyer-door'); s.drainEvents();
    d.move('seam-hall', 1);
    expect(s.drainEvents().some((e) => e.type === 'SurveyorLoggedJoint')).toBe(true);
    d.wait(120);
    expect(s.surveyor).toMatchObject({ state: 'Dormant', room: 'den', armed: false, fresh: [] });
  });

  it('UT-SURV-11 counts: 3 on waking, 2 then 1 on entering rooms; UT-SURV-09 doing nothing gets you caught', () => {
    const { s } = at('cp-corridor');
    const ev = run(s, 60, () => s.game === 'FailureRecovery');
    expect(counts(ev)).toEqual([3, 2, 1]);
    expect(rooms(ev)).toEqual(['c-east', 'bridge', 'c-west']);
    const caughtAt = s.tickCount * 0.05;
    expect(s.game).toBe('FailureRecovery');
    expect(caughtAt).toBeGreaterThan(30);
    expect(caughtAt).toBeLessThan(42);
  });

  it('UT-STATE-03 being caught restores the last postmark exactly and adds one to the tally', () => {
    const { s } = at('cp-corridor');
    const before = JSON.stringify([s.committed(), s.vantage, s.surveyor.room, s.surveyor.state]);
    run(s, 60, () => s.game === 'FailureRecovery');
    run(s, 5, () => s.game === 'ChapterIntro');
    expect(s.game).toBe('ChapterIntro');
    s.apply({ type: 'IntroDone' });
    expect(JSON.stringify([s.committed(), s.vantage, s.surveyor.room, s.surveyor.state])).toBe(before);
    expect(s.catches).toBe(1);
    expect(s.checkpoint).toBe('cp-corridor');
  });

  it('UT-SURV-05 the newest joint draws it, it measures from the side that stayed still, and it does not oscillate', () => {
    const { s, d } = at('cp-corridor');
    d.until(() => s.surveyor.room === 'c-east' && !s.surveyor.crossing);
    d.move('seam-bridge', 1);
    expect(s.surveyor.fresh).toEqual([{ edge: 'bridge.free|dead-letter.door', measureIn: 'dead-letter' }]);
    s.drainEvents();
    const ev = run(s, 60, () => s.surveyor.state === 'Searching');
    expect(counts(ev)).toEqual([2, 1]);
    expect(rooms(ev)).toEqual(['bridge', 'dead-letter']); // straight in, once
    expect(ev.filter((e) => e.type === 'SurveyorMeasuring').length).toBe(1);
    expect(s.surveyor.fresh).toEqual([]);
  });

  it('UT-SURV-08 a doorway that vanishes ahead of it: it rides the bridge, is Blocked for the block time, then replans', () => {
    const { s, d } = at('cp-corridor');
    d.until(() => s.surveyor.room === 'bridge' && !s.surveyor.crossing);
    s.drainEvents();
    d.move('seam-bridge', 1);
    const ev = run(s, 30, () => s.surveyor.room === 'dead-letter');
    const states = ev.filter((e) => e.type === 'SurveyorStateChanged').map((e) => (e as { to: SurveyorStateId }).to);
    expect(states.slice(0, 3)).toEqual(['Blocked', 'Replanning', 'Investigating']);
    expect(s.surveyor.room).toBe('dead-letter'); // it rode round and walked in: UT-SURV-07
  });

  it('UT-SURV-07 it braces while its room is in the hand, for no longer than the limit', () => {
    const { s, d } = at('cp-corridor');
    d.until(() => s.surveyor.room === 'bridge' && !s.surveyor.crossing);
    const walk = s.surveyor.walk;
    s.apply({ type: 'GripTake', seam: 'seam-bridge', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-bridge', u: 0.5 });
    const ev = run(s, 9);
    expect(ev.some((e) => e.type === 'SurveyorBracing')).toBe(true);
    expect(s.surveyor.walk).toBe(walk);
    run(s, 3);
    expect(s.surveyor.walk).toBeGreaterThan(walk); // the brace has run out
  });

  it('UT-SEAM-08 a seam is held while it is in that doorway, and free again after', () => {
    const { s, d } = at('cp-corridor');
    d.until(() => !!s.surveyor.crossing && s.surveyor.crossing.edge === 'bridge.pivot|c-east.west');
    expect(s.apply({ type: 'GripTake', seam: 'seam-bridge', role: 'travel', hand: 'right' })).toEqual({ ok: false, reason: 'HeldBySurveyor' });
    expect(s.gripRefusal('seam-bridge')).toBe('HeldBySurveyor');
    d.until(() => !s.surveyor.crossing);
    expect(s.apply({ type: 'GripTake', seam: 'seam-bridge', role: 'travel', hand: 'right' }).ok).toBe(true);
  });

  it('UT-SURV-03 a suspended doorway makes it wait; it never enters Room Zero', () => {
    const { s, d } = at('cp-corridor');
    d.until(() => s.surveyor.room === 'c-east' && s.surveyor.walk > 150);
    s.apply({ type: 'GripTake', seam: 'seam-bridge', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-bridge', u: 0.3 });
    run(s, 8);
    expect(s.surveyor.room).toBe('c-east');
    expect(s.surveyor.crossing).toBeUndefined();
    const end = at('cp-docked');
    end.d.hop('v-lift'); end.d.hop('v-zero');
    const ev = run(end.s, 90);
    expect(rooms(ev)).not.toContain('zero');
    expect(end.s.game).not.toBe('FailureRecovery');
    expect(rooms(ev)).toContain('lift');
    expect(end.s.surveyor.room).toBe('lift'); // it waits at the round door; it does not wander off to an older joint
  });

  it('UT-SURV-10 sealed in the office it searches with no route; left unsealed it patrols and the window recurs', () => {
    const sealedRun = at('cp-east');
    expect(sealedRun.s.surveyor).toMatchObject({ state: 'Searching', room: 'dead-letter' });
    run(sealedRun.s, 1);
    expect(sealedRun.s.surveyor.route).toEqual([]);
    expect(sealedRun.s.surveyor.target).toBeUndefined();
    const sealedWalk = sealedRun.s.surveyor.walk;
    run(sealedRun.s, 120);
    expect(sealedRun.s.surveyor).toMatchObject({ state: 'Searching', room: 'dead-letter' });
    expect(sealedRun.s.surveyor.route).toEqual([]);
    expect(sealedRun.s.surveyor.walk).toBe(sealedWalk);
    expect(sealedRun.s.surveyor.idle).toBe(chapterOne.surveyor.retreatSec * 20);
    const { s, d } = at('cp-corridor');
    d.until(() => s.surveyor.room === 'c-east' && !s.surveyor.crossing);
    d.move('seam-bridge', 1);
    const ev = run(s, 100);
    expect(rooms(ev).filter((r) => r === 'dead-letter').length).toBeGreaterThanOrEqual(2);
    expect(s.game).not.toBe('FailureRecovery');
  });

  it('UT-SURV-06 it changes room only through open doorways after the authored time (trace property)', () => {
    const { s, d } = at('cp-corridor');
    let last = s.surveyor.room;
    let lastChange = s.tickCount;
    const check = () => {
      if (s.surveyor.room !== last) {
        const linked = chapterOne.pairs.some((p) => {
          const ma = s.house.socketById.get(p.a)!.module.id, mb = s.house.socketById.get(p.b)!.module.id;
          return (ma === last && mb === s.surveyor.room) || (mb === last && ma === s.surveyor.room);
        });
        expect(linked, `${last} -> ${s.surveyor.room}`).toBe(true);
        expect(s.tickCount - lastChange).toBeGreaterThanOrEqual(30); // at least the threshold time
        last = s.surveyor.room; lastChange = s.tickCount;
      }
    };
    d.until(() => { check(); return s.surveyor.room === 'c-east' && !s.surveyor.crossing; });
    d.move('seam-bridge', 1);
    for (let i = 0; i < 3000; i++) { s.tick(); check(); }
  });

  it('UT-SURV-12 reduced intensity slows it and changes nothing else', () => {
    const std = at('cp-corridor');
    const red = at('cp-corridor', { intensity: 'reduced' });
    const a = run(std.s, 70, () => std.s.game === 'FailureRecovery');
    const b = run(red.s, 70, () => red.s.game === 'FailureRecovery');
    expect(rooms(b)).toEqual(rooms(a));
    expect(counts(b)).toEqual(counts(a));
    expect(red.s.tickCount).toBeGreaterThan(std.s.tickCount * 1.15);
  });

  it('finale: the house closing unlocks the office; three knocks; it comes to the lift to measure the round door', () => {
    const { s } = at('cp-docked');
    expect(s.edges.find((e) => e.id === 'dead-letter.back|den.side')!.locked).toBe(false);
    const ev = run(s, 40, () => s.game === 'FailureRecovery');
    expect(counts(ev)[0]).toBe(3);
    expect(s.game).toBe('FailureRecovery'); // staying at the corridor's end is fatal
    const t = s.tickCount * 0.05;
    expect(t).toBeGreaterThan(14);
  });
});
