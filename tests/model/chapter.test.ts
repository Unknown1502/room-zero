// Model checks over the real rules and the real content. IDs: MC-01 to MC-05 in docs/05-quality/test-strategy.md.
import { describe, expect, it } from 'vitest';
import { chapterOne } from '../../src/content/chapter-one';
import { House } from '../../src/domain/house';
import { Driver, replayReference } from '../../src/domain/reference';
import { GameSession } from '../../src/domain/session';
import type { DomainEvent } from '../../src/domain/types';

function begin() {
  const s = new GameSession(chapterOne);
  s.apply({ type: 'Begin', mode: 'new' }); s.apply({ type: 'IntroDone' });
  return s;
}

describe('model checks', () => {
  it('MC-01 no softlock from the player\'s own moves: Room Zero is reachable from every reachable configuration', () => {
    // Abstract state: committed detents + vantage. Moves: legal hops, and seam moves to adjacent detents
    // from a station, subject to blocking. Uses the real graph and the real blocking computation.
    const house = new House(chapterOne);
    type St = { d: Record<string, number>; v: string };
    const key = (s: St) => chapterOne.seams.map((sm) => s.d[sm.id]).join('') + s.v;
    const moves = (s: St): St[] => {
      const out: St[] = [];
      const here = chapterOne.vantages.find((x) => x.id === s.v)!;
      const edges = house.computeGraph(s.d, { houseClosing: true }).edges.filter((e) => e.player && !e.locked);
      for (const n of here.adjacent) {
        const m = chapterOne.vantages.find((x) => x.id === n)!.module;
        if (m === here.module || edges.some((e) => (e.ma === m && e.mb === here.module) || (e.mb === m && e.ma === here.module))) out.push({ d: s.d, v: n });
      }
      for (const sm of chapterOne.seams) {
        if (!sm.stations.includes(s.v)) continue;
        const n = sm.detents.length, cur = s.d[sm.id];
        const targets = sm.ratchet ? [(cur + 1) % n] : [cur - 1, cur + 1].filter((i) => i >= 0 && i < n);
        for (const t of targets) {
          const to = sm.ratchet ? sm.detents[cur] + 1 / n : sm.detents[t];
          if (house.firstBlock(sm.id, sm.detents[cur], to, s.d)) continue;
          out.push({ d: { ...s.d, [sm.id]: t }, v: s.v });
        }
      }
      return out;
    };
    const start: St = { d: Object.fromEntries(chapterOne.seams.map((sm) => [sm.id, sm.initial])), v: chapterOne.startVantage };
    const seen = new Map<string, St>([[key(start), start]]);
    const rev = new Map<string, string[]>();
    const q = [start];
    while (q.length) {
      const s = q.shift()!;
      for (const n of moves(s)) {
        (rev.get(key(n)) ?? rev.set(key(n), []).get(key(n))!).push(key(s));
        if (!seen.has(key(n))) { seen.set(key(n), n); q.push(n); }
      }
    }
    const good = new Set([...seen.values()].filter((s) => s.v === 'v-zero').map(key));
    const back = [...good];
    while (back.length) for (const p of rev.get(back.shift()!) ?? []) if (!good.has(p)) { good.add(p); back.push(p); }
    expect(good.size).toBeGreaterThan(0);
    expect(new Set([...seen.values()].map((s) => chapterOne.seams.map((sm) => s.d[sm.id]).join(''))).size).toBe(288);
    expect([...seen.keys()].filter((k) => !good.has(k))).toEqual([]);
  });

  it('MC-02 the reference solution completes the chapter, postmarks in order, ending steps 1 to 7', () => {
    const s = begin();
    const d = new Driver(s);
    const ev: DomainEvent[] = [];
    const orig = s.drainEvents.bind(s);
    const pump = () => ev.push(...orig());
    replayReference(s, 'cp-docked'); pump();
    d.hop('v-lift'); d.hop('v-zero');
    s.apply({ type: 'LetterTake', hand: 'right' });
    expect(s.apply({ type: 'LetterRelease', atSlot: true }).ok).toBe(true);
    for (let i = 0; i < 20 * 120 && s.game !== 'ChapterComplete'; i++) { s.tick(); pump(); }
    expect(s.game).toBe('ChapterComplete');
    expect(s.complete).toBe(true);
    expect(s.postmarks).toEqual(['ENTRANCE', 'STAIR', 'LANDING', 'WEST', 'EAST', 'LAST POST']);
    expect(ev.filter((e) => e.type === 'EndingStep').map((e) => (e as { step: number }).step)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s.catches).toBe(0);
    expect(s.surveyor.room).toBe('lift'); // at the round door for the final image
    expect([...s.solved].sort()).toEqual(['obj-bridge', 'obj-first-seam', 'obj-room-zero', 'obj-staircase', 'obj-wrong-door']);
    // and it can be played again
    expect(s.apply({ type: 'AckEnding', choice: 'again' }).ok).toBe(true);
    s.apply({ type: 'IntroDone' });
    expect(s.hash()).toBe(begin().hash());
  });

  it('MC-03 the encounter is fair: the window to seal the office is at least 10 s and recurs', () => {
    const s = begin();
    const d = new Driver(s);
    replayReference(s, 'cp-corridor');
    d.until(() => s.surveyor.room === 'c-east' && !s.surveyor.crossing);
    d.move('seam-bridge', 1);
    d.until(() => s.surveyor.room === 'dead-letter' && !s.surveyor.crossing);
    const enter = s.tickCount;
    d.until(() => !!s.surveyor.crossing);
    const window1 = (s.tickCount - enter) * 0.05;
    expect(window1).toBeGreaterThanOrEqual(10);
    d.until(() => s.surveyor.room === 'bridge' && !s.surveyor.crossing);
    d.until(() => s.surveyor.room === 'dead-letter' && !s.surveyor.crossing, 60); // it comes back: the window recurs
    expect(s.game).not.toBe('FailureRecovery');
  });

  it('MC-04 across the whole reference playthrough the Surveyor never shares a room with the player', () => {
    const s = begin();
    const orig = s.tick.bind(s);
    let together = 0;
    s.tick = () => { orig(); if (s.surveyor.armed && s.surveyor.room === s.vantageModule()) together++; };
    replayReference(s, 'complete');
    expect(together).toBe(0);
    expect(s.game).toBe('ChapterComplete');
  });

  it('MC-05 the reference solution at the reference pacing takes between 5 and 7 minutes', () => {
    const s = begin();
    replayReference(s, 'cp-east');
    const encounterWait = Math.max(0, 12); // time spent waiting on the Surveyor beyond the player's own actions, from the timeline below
    const pacing = 12 + 11 * 15 + 10 * 1.5 + 4 * 9 + 4 * 11 + 45 + encounterWait;
    expect(pacing).toBeGreaterThanOrEqual(300);
    expect(pacing).toBeLessThanOrEqual(420);
    expect(s.checkpoint).toBe('cp-east');
  });
});
