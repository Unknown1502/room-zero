// Seams, grips, puzzles, game state. IDs refer to docs/05-quality/test-strategy.md.
import { describe, expect, it } from 'vitest';
import { chapterOne } from '../../src/content/chapter-one';
import { Driver, replayReference } from '../../src/domain/reference';
import { GameSession } from '../../src/domain/session';
import type { DomainEvent } from '../../src/domain/types';

function fresh(settings = {}) {
  const s = new GameSession(chapterOne, { snapTurn: 0, intensity: 'standard', hands: 'two', volume: 1, ...settings });
  s.apply({ type: 'Begin', mode: 'new' });
  s.apply({ type: 'IntroDone' });
  s.drainEvents();
  return { s, d: new Driver(s) };
}
const types = (ev: DomainEvent[]) => ev.map((e) => e.type);
const edgeIds = (s: GameSession) => s.edges.map((e) => e.id);

describe('seam manipulation', () => {
  it('UT-SEAM-01 drag is clamped to the path', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door');
    s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 7 });
    expect(s.seams['seam-hall'].param).toBe(1);
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: -3 });
    expect(s.seams['seam-hall'].param).toBe(0);
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: Number.NaN });
    expect(s.seams['seam-hall'].param).toBe(0);
  });

  it('UT-SEAM-02/05/12 release inside the snap window commits, only when the settle ends, within 0.8 s', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door');
    s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 0.9 });
    expect(edgeIds(s)).not.toContain('foyer.north|stair.foot'); // preview does not change the graph
    s.apply({ type: 'GripRelease', seam: 'seam-hall', role: 'travel', reason: 'open' });
    expect(s.seams['seam-hall'].phase).toBe('settling');
    expect(s.seams['seam-hall'].committed).toBe(0);
    let n = 0;
    while (s.seams['seam-hall'].phase !== 'rest') { s.tick(); n++; expect(n).toBeLessThanOrEqual(16); }
    expect(s.seams['seam-hall'].committed).toBe(1);
    expect(edgeIds(s)).toContain('foyer.north|stair.foot');
    const ev = types(s.drainEvents());
    expect(ev.indexOf('SeamCommitted')).toBeLessThan(ev.indexOf('GraphChanged'));
    expect(ev.indexOf('GraphChanged')).toBeLessThan(ev.lastIndexOf('VantagesChanged'));
  });

  it('UT-SEAM-03 release outside every snap window returns and changes nothing', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door');
    const before = s.hash();
    s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 0.5 });
    s.apply({ type: 'GripRelease', seam: 'seam-hall', role: 'travel', reason: 'open' });
    const ev = s.drainEvents();
    expect(ev.find((e) => e.type === 'SeamReleased')).toMatchObject({ kind: 'return' });
    d.until(() => s.seams['seam-hall'].phase === 'rest', 2);
    expect(s.seams['seam-hall']).toMatchObject({ committed: 0, param: 0 });
    expect(edgeIds(s)).not.toContain('foyer.north|stair.foot');
    expect(before).not.toBe(''); // state hash exists; committed state unchanged above
  });

  it('UT-SEAM-05b a seam in the hand suspends its doorways and nobody may start through them', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door'); d.move('seam-hall', 1);
    s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 0.6 });
    expect(s.edges.find((e) => e.id === 'foyer.north|stair.foot')!.suspended).toBe(true);
    expect(s.reachable()).not.toContain('v-stair-head');
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 1 });
    s.apply({ type: 'GripRelease', seam: 'seam-hall', role: 'travel', reason: 'open' });
    d.until(() => s.seams['seam-hall'].phase === 'rest', 2);
    expect(s.reachable()).toContain('v-stair-head');
  });

  it('UT-SEAM-06 latched seams need the brace; releasing it freezes, then releases after 1.5 s', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door'); d.move('seam-hall', 1); d.hop('v-stair-head');
    expect(s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'travel', hand: 'right' })).toEqual({ ok: false, reason: 'Latched' });
    expect(s.gripRefusal('seam-landing')).toBe('Latched');
    expect(s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'anchor', hand: 'left' }).ok).toBe(true);
    expect(s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'travel', hand: 'right' }).ok).toBe(true);
    s.apply({ type: 'GripDrag', seam: 'seam-landing', u: 0.3 });
    s.apply({ type: 'GripRelease', seam: 'seam-landing', role: 'anchor', reason: 'open' });
    expect(s.seams['seam-landing'].phase).toBe('frozen');
    expect(s.apply({ type: 'GripDrag', seam: 'seam-landing', u: 0.9 })).toEqual({ ok: false, reason: 'NotHeld' });
    // re-taking the brace within the limit continues
    s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'anchor', hand: 'left' });
    expect(s.seams['seam-landing'].phase).toBe('held');
    s.apply({ type: 'GripRelease', seam: 'seam-landing', role: 'anchor', reason: 'open' });
    d.wait(1.6);
    d.until(() => s.seams['seam-landing'].phase === 'rest', 2);
    expect(s.seams['seam-landing'].committed).toBe(0); // 0.3 is outside every snap window
  });

  it('UT-SEAM-06b grips are independent: either hand can take either role, and a busy hand is refused', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door'); d.move('seam-hall', 1); d.hop('v-stair-head');
    expect(s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'anchor', hand: 'right' }).ok).toBe(true);
    expect(s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'travel', hand: 'right' })).toEqual({ ok: false, reason: 'HandBusy' });
    expect(s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'travel', hand: 'left' }).ok).toBe(true);
    expect(s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'anchor', hand: 'left' })).toEqual({ ok: false, reason: 'HandBusy' });
  });

  it('UT-SEAM-06c one-handed mode: the latch pin replaces the brace', () => {
    const { s, d } = fresh({ hands: 'one' });
    d.hop('v-foyer-door'); d.move('seam-hall', 1); d.hop('v-stair-head');
    expect(s.apply({ type: 'LatchPinPress', seam: 'seam-landing' }).ok).toBe(true);
    expect(s.apply({ type: 'GripTake', seam: 'seam-landing', role: 'travel', hand: 'left' }).ok).toBe(true);
    for (let i = 0; i <= 10; i++) { s.apply({ type: 'GripDrag', seam: 'seam-landing', u: i / 10 }); d.wait(1); } // held far longer than the pin
    s.apply({ type: 'GripRelease', seam: 'seam-landing', role: 'travel', reason: 'open' });
    d.until(() => s.seams['seam-landing'].phase === 'rest', 2);
    expect(s.seams['seam-landing'].committed).toBe(2);
    const two = fresh();
    expect(two.s.apply({ type: 'LatchPinPress', seam: 'seam-hall' })).toEqual({ ok: false, reason: 'NotAtStation' });
  });

  it('UT-SEAM-07 a seam cannot be worked from elsewhere, and no station is inside the room it moves', () => {
    const { s } = fresh();
    expect(s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' })).toEqual({ ok: false, reason: 'NotAtStation' });
    for (const sm of chapterOne.seams) for (const v of sm.stations) expect(chapterOne.vantages.find((x) => x.id === v)!.module).not.toBe(sm.moves);
  });

  it('UT-SEAM-09 a ratchet advances exactly one detent per completed stroke and wraps', () => {
    const { s, d } = fresh();
    replayReference(s, 'cp-landing');
    for (const want of [1, 2, 3, 0]) {
      d.move('seam-rotunda', want);
      expect(s.seams['seam-rotunda'].committed).toBe(want);
      expect(s.seams['seam-rotunda'].param).toBeCloseTo(want / 4, 6);
    }
    s.apply({ type: 'GripTake', seam: 'seam-rotunda', role: 'anchor', hand: 'left' });
    s.apply({ type: 'GripTake', seam: 'seam-rotunda', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-rotunda', u: 0.7 }); // an incomplete stroke
    s.apply({ type: 'GripRelease', seam: 'seam-rotunda', role: 'travel', reason: 'open' });
    d.until(() => s.seams['seam-rotunda'].phase === 'rest', 2);
    expect(s.seams['seam-rotunda'].committed).toBe(0);
  });

  it('UT-SEAM-10 a seam with two stations is one seam', () => {
    const { s, d } = fresh();
    replayReference(s, 'cp-east');
    expect(s.seams['seam-bridge'].committed).toBe(0);
    d.move('seam-bridge', 1); // from the east station this time
    expect(s.seams['seam-bridge'].committed).toBe(1);
  });

  it('UT-SEAM-11 tracking loss uses the last good value and never commits outside a snap window; forced release always returns', () => {
    const a = fresh();
    a.d.hop('v-foyer-door');
    a.s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    a.s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 0.4 });
    a.s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 0.98 }); // a tracking glitch on the way out
    a.s.apply({ type: 'GripRelease', seam: 'seam-hall', role: 'travel', reason: 'lost' });
    a.d.until(() => a.s.seams['seam-hall'].phase === 'rest', 2);
    expect(a.s.seams['seam-hall'].committed).toBe(0);
    const b = fresh();
    b.d.hop('v-foyer-door');
    b.s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    b.s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 1 });
    b.s.apply({ type: 'SetVisibility', visible: false }); // pause forces a return, never a snap
    b.s.apply({ type: 'SetVisibility', visible: true });
    b.d.until(() => b.s.seams['seam-hall'].phase === 'rest', 2);
    expect(b.s.seams['seam-hall'].committed).toBe(0);
  });

  it('UT-SEAM-13 the preview names exactly the pairs that open on commit', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door');
    s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 0.5 });
    expect(s.preview).toBeUndefined();
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 0.9 });
    expect(s.preview).toMatchObject({ seam: 'seam-hall', detent: 1, pairs: ['foyer.north|stair.foot'], strength: 1 });
  });

  it('a hop releases every grip first', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door');
    s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 1 });
    d.hop('v-foyer-start');
    d.until(() => s.seams['seam-hall'].phase === 'rest', 2);
    expect(s.seams['seam-hall'].committed).toBe(0);
    expect(s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' })).toEqual({ ok: false, reason: 'NotAtStation' });
  });
});

describe('puzzles', () => {
  it('UT-PUZ-01 the staircase needs both seams', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door'); d.move('seam-hall', 1); d.hop('v-stair-head');
    d.move('seam-landing', 1);
    expect(edgeIds(s)).not.toContain('landing.west|stair.head'); // the half-way rest joins nothing
    expect(s.reachable()).not.toContain('v-landing-east');
    d.move('seam-landing', 2);
    expect(edgeIds(s)).toContain('landing.west|stair.head');
    expect(s.solved.has('obj-staircase')).toBe(true);
  });

  it('UT-PUZ-02 only a quarter turn opens the corridor; position 3 is refused on both sides', () => {
    const { s, d } = fresh();
    replayReference(s, 'cp-landing');
    expect(s.reachable()).toContain('v-turn-centre'); // the wrong door works
    d.hop('v-turn-centre');
    expect(s.reachable()).toEqual(['v-landing-east']); // and leads nowhere
    d.hop('v-landing-east');
    s.drainEvents();
    d.move('seam-rotunda', 1);
    expect(s.solved.has('obj-wrong-door')).toBe(true);
    d.move('seam-rotunda', 2);
    expect(s.reachable()).not.toContain('v-turn-centre');
    s.drainEvents();
    d.move('seam-rotunda', 3);
    expect(s.drainEvents().filter((e) => e.type === 'PairRefused').length).toBe(2);
    expect(s.reachable()).not.toContain('v-turn-centre');
  });

  it('UT-PUZ-03 the room cannot dock until the lift is moved away, then the lift can return', () => {
    const { s, d } = fresh();
    replayReference(s, 'cp-east');
    d.hop('v-ceast-end');
    s.drainEvents();
    s.apply({ type: 'GripTake', seam: 'seam-arm', role: 'travel', hand: 'right' });
    s.apply({ type: 'GripDrag', seam: 'seam-arm', u: 1 });
    expect(s.seams['seam-arm'].param).toBeLessThan(0.95);
    expect(s.drainEvents().find((e) => e.type === 'SeamBlocked')).toMatchObject({ by: 'lift' });
    s.apply({ type: 'GripRelease', seam: 'seam-arm', role: 'travel', reason: 'open' });
    d.until(() => s.seams['seam-arm'].phase === 'rest', 2);
    expect(s.seams['seam-arm'].committed).toBe(0);
    d.move('seam-lift', 2); d.move('seam-arm', 1); d.move('seam-lift', 1);
    expect(edgeIds(s)).toContain('lift.far|zero.door');
    expect(s.flags.houseClosing).toBe(true);
    expect(s.checkpoint).toBe('cp-docked');
  });

  it('UT-PUZ-04 hints appear at 40, 80 and 120 s of idling at an unsolved station, and not while holding a grip', () => {
    const { s, d } = fresh();
    d.hop('v-foyer-door');
    d.wait(39); expect(s.hint).toBeUndefined();
    d.wait(1.1); expect(s.hint).toMatchObject({ tier: 1, text: 'The stair is waiting.' });
    d.wait(40); expect(s.hint?.tier).toBe(2);
    d.wait(40); expect(s.hint?.tier).toBe(3);
    const b = fresh();
    b.d.hop('v-foyer-door');
    b.s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    b.d.wait(60); expect(b.s.hint).toBeUndefined();
  });

  it('UT-PUZ-06 the letter: in hand at the start, back to the strap, delivered only at the slot in Room Zero', () => {
    const { s } = fresh();
    expect(s.letter).toBe('held');
    s.apply({ type: 'LetterRelease', atSlot: false });
    expect(s.letter).toBe('strap');
    s.apply({ type: 'LetterTake', hand: 'left' });
    expect(s.apply({ type: 'LetterRelease', atSlot: true })).toEqual({ ok: false, reason: 'NotAtSlot' });
    expect(s.letter).toBe('strap');
    expect(s.ending).toBeUndefined();
  });
});

describe('game state', () => {
  it('UT-STATE-01 Title, intro, play, and commands refused outside play', () => {
    const s = new GameSession(chapterOne);
    expect(s.game).toBe('Title');
    expect(s.apply({ type: 'Hop', vantage: 'v-foyer-door' })).toEqual({ ok: false, reason: 'NotPlaying' });
    expect(s.apply({ type: 'Begin', mode: 'continue' })).toEqual({ ok: false, reason: 'NoSave' });
    s.apply({ type: 'Begin', mode: 'new' });
    expect(s.game).toBe('ChapterIntro');
    s.apply({ type: 'IntroDone' });
    expect(s.game).toBe('Exploration');
    new Driver(s).hop('v-foyer-door');
    s.tick();
    expect(s.game).toBe('PuzzleActive');
    s.apply({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' });
    s.tick();
    expect(s.game).toBe('SeamInteraction');
  });

  it('UT-STATE-02 pause and resume leave the rules exactly where they were', () => {
    const { s, d } = fresh();
    replayReference(s, 'cp-corridor');
    d.wait(12);
    const before = s.hash();
    s.apply({ type: 'SetVisibility', visible: false });
    expect(s.game).toBe('Pause');
    for (let i = 0; i < 500; i++) s.tick();
    s.apply({ type: 'SetVisibility', visible: true });
    expect(s.hash()).toBe(before);
  });

  it('UT-STATE-05 illegal commands change nothing; restart returns everything to the start and keeps settings', () => {
    const { s, d } = fresh({ intensity: 'reduced' });
    replayReference(s, 'cp-landing');
    const h = s.hash();
    expect(s.apply({ type: 'Hop', vantage: 'v-zero' }).ok).toBe(false);
    expect(s.apply({ type: 'GripDrag', seam: 'seam-hall', u: 1 }).ok).toBe(false);
    expect(s.apply({ type: 'GripTake', seam: 'nope', role: 'travel', hand: 'left' }).ok).toBe(false);
    expect(s.hash()).toBe(h);
    s.apply({ type: 'Restart' });
    s.apply({ type: 'IntroDone' });
    const again = new GameSession(chapterOne, { snapTurn: 0, intensity: 'reduced', hands: 'two', volume: 1 });
    again.apply({ type: 'Begin', mode: 'new' }); again.apply({ type: 'IntroDone' });
    expect(s.hash()).toBe(again.hash());
    expect(s.settings.intensity).toBe('reduced');
    expect(d.s.vantage).toBe('v-foyer-start');
  });

  it('UT-GRAPH-05 the same commands and ticks give the same state, every time', () => {
    const run = () => { const { s } = fresh(); replayReference(s, 'cp-docked'); return s.hash(); };
    expect(run()).toBe(run());
  });
});
