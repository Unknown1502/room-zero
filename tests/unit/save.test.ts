// Persistence. IDs refer to docs/05-quality/test-strategy.md.
import { describe, expect, it } from 'vitest';
import { chapterOne } from '../../src/content/chapter-one';
import { replayReference } from '../../src/domain/reference';
import { GameSession } from '../../src/domain/session';
import type { SaveData } from '../../src/domain/types';
import { KEYS, MemoryStorage, load, validate, write, writeSettings } from '../../src/persistence/save';

function saveAt(cp: string): SaveData {
  const s = new GameSession(chapterOne);
  s.apply({ type: 'Begin', mode: 'new' }); s.apply({ type: 'IntroDone' });
  replayReference(s, cp);
  return s.snapshot();
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('save', () => {
  const east = saveAt('cp-east');

  it('UT-SAVE-01 a record survives a round trip, for every checkpoint', () => {
    for (const cp of chapterOne.checkpoints) {
      const data = saveAt(cp.id);
      const v = validate(JSON.parse(JSON.stringify(data)), chapterOne);
      expect(v.ok, `${cp.id}: ${!v.ok && v.reason}`).toBe(true);
      if (v.ok) expect(v.data).toEqual(data);
    }
  });

  it('UT-SAVE-05/06 a record is small and holds only the whitelisted fields; nothing personal', () => {
    const text = JSON.stringify(east);
    expect(text.length).toBeLessThan(8 * 1024);
    expect(Object.keys(east).sort()).toEqual(['catches', 'chapter', 'checkpoint', 'complete', 'contentVersion', 'edges', 'flags', 'schemaVersion', 'seams', 'settings', 'solved', 'surveyor']);
    expect(text).not.toMatch(/pose|position|quaternion|timestamp|userAgent/i);
  });

  it('UT-SAVE-03 tampered and malformed records are rejected', () => {
    const cases: [string, (d: any) => unknown][] = [
      ['seam index out of range', (d) => { d.seams['seam-rotunda'] = 9; return d; }],
      ['edge list that does not match the seams', (d) => { d.edges.push('lift.far|zero.door'); return d; }],
      ['an edge removed', (d) => { d.edges.pop(); return d; }],
      ['unknown checkpoint', (d) => { d.checkpoint = 'cp-moon'; return d; }],
      ['unknown field', (d) => { d.extra = 1; return d; }],
      ['missing field', (d) => { delete d.flags; return d; }],
      ['unknown seam', (d) => { d.seams['seam-x'] = 0; return d; }],
      ['surveyor in Room Zero', (d) => { d.surveyor.room = 'zero'; return d; }],
      ['surveyor in a room that does not exist', (d) => { d.surveyor.room = 'attic'; return d; }],
      ['awake but not armed', (d) => { d.surveyor.armed = false; return d; }],
      ['oversized string', (d) => { d.solved = ['x'.repeat(5000)]; return d; }],
      ['wrong schema version', (d) => { d.schemaVersion = 99; return d; }],
      ['wrong content version', (d) => { d.contentVersion = 'chapter-one@0'; return d; }],
      ['checkpoint trigger not satisfied', (d) => { d.checkpoint = 'cp-docked'; return d; }],
      ['not an object', () => 'hello'],
      ['null', () => null],
      ['array', () => []],
    ];
    for (const [name, mutate] of cases) expect(validate(mutate(clone(east)), chapterOne).ok, name).toBe(false);
  });

  it('UT-SAVE-06b writes go to the other slot and then switch the pointer', () => {
    const st = new MemoryStorage();
    expect(write(st, saveAt('cp-landing'))).toBe(true);
    expect(st.get(KEYS.pointer)).toBe('A');
    expect(write(st, east)).toBe(true);
    expect(st.get(KEYS.pointer)).toBe('B');
    expect(JSON.parse(st.get(KEYS.a)!).checkpoint).toBe('cp-landing');
    expect(JSON.parse(st.get(KEYS.b)!).checkpoint).toBe('cp-east');
    expect(load(st, chapterOne, replayReference)).toMatchObject({ notice: false, save: { checkpoint: 'cp-east' } });
  });

  it('UT-SAVE-04 the recovery ladder: stored, canonical snapshot, other slot, new game; never throws', () => {
    const empty = new MemoryStorage();
    expect(load(empty, chapterOne, replayReference)).toMatchObject({ save: undefined, notice: false });

    const broken = new MemoryStorage();
    write(broken, saveAt('cp-landing')); write(broken, east);
    const bad = clone(east) as any; bad.edges.pop();
    broken.set(KEYS.b, JSON.stringify(bad)); // current slot no longer matches its own seams
    const r1 = load(broken, chapterOne, replayReference);
    expect(r1.notice).toBe(true);
    expect(r1.save).toEqual({ ...east, catches: 0 }); // canonical snapshot of the same checkpoint

    broken.set(KEYS.b, '{"schemaVersion":1,"checkpoint":"cp-moon"'); // truncated: falls to the other slot
    const r2 = load(broken, chapterOne, replayReference);
    expect(r2).toMatchObject({ notice: true, save: { checkpoint: 'cp-landing' } });

    broken.set(KEYS.a, 'garbage');
    expect(load(broken, chapterOne, replayReference)).toMatchObject({ save: undefined, notice: true });

    const throwing = { get() { throw new Error('denied'); }, set() { throw new Error('denied'); }, remove() {} };
    expect(load(throwing, chapterOne, replayReference)).toMatchObject({ save: undefined });
    expect(write(throwing, east)).toBe(false);
  });

  it('UT-SAVE-02 a record older than the current schema with no migration falls to the canonical snapshot', () => {
    const st = new MemoryStorage();
    st.set(KEYS.pointer, 'A');
    st.set(KEYS.a, JSON.stringify({ ...east, schemaVersion: 0 }));
    expect(load(st, chapterOne, replayReference)).toMatchObject({ notice: true, save: { checkpoint: 'cp-east', schemaVersion: 1 } });
  });

  it('regression (RT-16): settings changed after a checkpoint survive a reload and a Continue', () => {
    const st = new MemoryStorage();
    write(st, saveAt('cp-landing')); // the record holds the defaults it was written with
    writeSettings(st, { snapTurn: 30, intensity: 'reduced', hands: 'one', volume: 0.4 }); // the player changes them afterwards
    const r = load(st, chapterOne, replayReference);
    expect(r.settings).toMatchObject({ snapTurn: 30, intensity: 'reduced', hands: 'one', volume: 0.4 });
    const s = new GameSession(chapterOne, r.settings, r.save);
    s.apply({ type: 'Begin', mode: 'continue' });
    expect(s.settings).toMatchObject({ snapTurn: 30, intensity: 'reduced', hands: 'one', volume: 0.4 });
    // and the same holds when the stored record is unusable and the canonical snapshot is used
    const bad = JSON.parse(st.get(KEYS.a)!); bad.edges = [];
    st.set(KEYS.a, JSON.stringify(bad));
    expect(load(st, chapterOne, replayReference).settings).toMatchObject({ snapTurn: 30, intensity: 'reduced' });
  });

  it('a loaded save continues play from its checkpoint and the chapter can still be finished', () => {
    for (const cp of ['cp-stairhead', 'cp-landing', 'cp-corridor', 'cp-east', 'cp-docked']) {
      const s = new GameSession(chapterOne, undefined, saveAt(cp));
      expect(s.canContinue()).toBe(true);
      expect(s.apply({ type: 'Begin', mode: 'continue' }).ok).toBe(true);
      s.apply({ type: 'IntroDone' });
      expect(s.checkpoint).toBe(cp);
      const fresh = new GameSession(chapterOne);
      fresh.apply({ type: 'Begin', mode: 'new' }); fresh.apply({ type: 'IntroDone' });
      replayReference(fresh, cp);
      expect([s.committed(), s.vantage, s.surveyor.room, s.postmarks]).toEqual([fresh.committed(), fresh.vantage, fresh.surveyor.room, fresh.postmarks]);
    }
  });
});
