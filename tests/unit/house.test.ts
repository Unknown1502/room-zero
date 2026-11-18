// Graph, connection rules and content validation. IDs refer to docs/05-quality/test-strategy.md.
import { describe, expect, it } from 'vitest';
import { chapterOne } from '../../src/content/chapter-one';
import { House, findRoute } from '../../src/domain/house';
import type { Edge } from '../../src/domain/types';

const house = new House(chapterOne);
const INIT = Object.fromEntries(chapterOne.seams.map((s) => [s.id, s.initial]));
const ids = (d: Record<string, number>, flags = {}) => house.computeGraph(d, flags).edges.map((e) => e.id);

describe('configurations (enumerator)', () => {
  it('UT-CONN-06a enumerates every detent combination: 288, derived from the seam data', () => {
    const all = [...house.configurations()];
    const expected = chapterOne.seams.reduce((n, s) => n * s.detents.length, 1);
    expect(all.length).toBe(expected);
    expect(new Set(all.map((c) => JSON.stringify(c))).size).toBe(expected);
    expect(expected).toBe(288);
  });

  it('UT-CONN-06b no two modules overlap at rest in any configuration, except lift and docked room when blocked', () => {
    const bad: string[] = [];
    for (const c of house.configurations()) for (const [a, b] of house.restOverlaps(c)) bad.push(`${JSON.stringify(c)} ${a}/${b}`);
    expect(bad).toEqual([]);
  });

  it('UT-CONN-06c computed connections equal the authored table in first-chapter.md for all 288', () => {
    for (const c of house.configurations()) {
      const want = new Set<string>(['bridge.pivot|c-east.west', 'c-east.north|den.door', 'dead-letter.back|den.side']);
      if (c['seam-hall'] === 1) want.add('foyer.north|stair.foot');
      if (c['seam-hall'] === 1 && c['seam-landing'] === 2) want.add('landing.west|stair.head');
      if (c['seam-landing'] === 2 && c['seam-rotunda'] === 0) want.add('landing.east|turn.f0');
      if (c['seam-landing'] === 2 && c['seam-rotunda'] === 1) want.add('landing.east|turn.f3');
      if (c['seam-rotunda'] === 1) want.add('c-west.mouth|turn.f1');
      if (c['seam-bridge'] === 0) want.add('bridge.free|c-west.end');
      if (c['seam-bridge'] === 1) want.add('bridge.free|dead-letter.door');
      if (c['seam-lift'] === 1) want.add('c-east.end|lift.near');
      if (c['seam-lift'] === 1 && c['seam-arm'] === 1) want.add('lift.far|zero.door');
      expect(new Set(ids(c)), JSON.stringify(c)).toEqual(want);
    }
  });

  it('UT-CONN-06d no near-miss: sockets are either mated or clearly apart', () => {
    for (const c of house.configurations()) {
      for (const r of chapterOne.pairs) {
        if (r.permanent) continue;
        const pa = house.pose(house.socketById.get(r.a)!.module.id, c);
        const pb = house.pose(house.socketById.get(r.b)!.module.id, c);
        const a = house.socketWorld(r.a, pa).pose;
        const b = house.socketWorld(r.b, pb).pose;
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        expect(d <= 0.05 || d >= 0.5, `${r.a}/${r.b} at ${d.toFixed(3)} m`).toBe(true);
      }
    }
  });
});

describe('graph', () => {
  it('UT-GRAPH-01 the initial graph has only the permanent connections and the lift', () => {
    expect(ids(INIT)).toEqual(['bridge.free|c-west.end', 'bridge.pivot|c-east.west', 'c-east.end|lift.near', 'c-east.north|den.door', 'dead-letter.back|den.side'].sort());
  });

  it('UT-GRAPH-02 edges join two different modules and each socket is used once', () => {
    for (const c of house.configurations()) {
      const es = house.computeGraph(c, {}).edges;
      const sockets = es.flatMap((e) => [e.a, e.b]);
      expect(new Set(sockets).size).toBe(sockets.length);
      for (const e of es) expect(e.ma).not.toBe(e.mb);
    }
  });

  it('UT-GRAPH-03 traversal flags, locks and suspension', () => {
    const g = house.computeGraph({ ...INIT, 'seam-bridge': 1 }, {});
    const office = g.edges.find((e) => e.id === 'bridge.free|dead-letter.door')!;
    expect([office.player, office.enemy]).toEqual([false, true]);
    expect(g.edges.find((e) => e.id === 'dead-letter.back|den.side')!.locked).toBe(true);
    expect(house.computeGraph(INIT, { houseClosing: true }).edges.find((e) => e.id === 'dead-letter.back|den.side')!.locked).toBe(false);
    const moving = house.computeGraph(INIT, {}, new Set(['seam-bridge']));
    expect(moving.edges.filter((e) => e.suspended).map((e) => e.id)).toEqual(['bridge.free|c-west.end', 'bridge.pivot|c-east.west']);
    const zero = house.computeGraph({ ...INIT, 'seam-arm': 1 }, {}).edges.find((e) => e.id === 'lift.far|zero.door')!;
    expect([zero.player, zero.enemy]).toEqual([true, false]);
  });
});

describe('connection rule', () => {
  const p = (x: number, yaw = 0) => ({ x, y: 6, z: -23, yaw });
  it('UT-CONN-01 position tolerance is 0.05 m', () => {
    const landing = house.pose('landing', { ...INIT, 'seam-landing': 2 });
    const turn = house.pose('turn', INIT);
    expect(house.mate('landing.east', 'turn.f0', landing, turn)).toBe('mated');
    expect(house.mate('landing.east', 'turn.f0', { ...landing, x: landing.x - 0.04 }, turn)).toBe('mated');
    expect(house.mate('landing.east', 'turn.f0', { ...landing, x: landing.x - 0.06 }, turn)).toBe('apart');
  });
  it('UT-CONN-02 normals must be opposed within 2 degrees', () => {
    const landing = house.pose('landing', { ...INIT, 'seam-landing': 2 });
    expect(house.mate('landing.east', 'turn.f0', landing, p(18.5, (1.5 * Math.PI) / 180))).toBe('apart'); // position moves out of tolerance too
    const c = house.pose('c-west', INIT);
    const spun = { ...c, yaw: (3 * Math.PI) / 180 };
    expect(house.mate('c-west.end', 'bridge.free', spun, house.pose('bridge', INIT))).toBe('apart');
  });
  it('UT-CONN-03 only like profiles mate; unlike profiles in the same place are refused', () => {
    const r3 = { ...INIT, 'seam-landing': 2, 'seam-rotunda': 3 };
    const g = house.computeGraph(r3, {});
    expect(g.edges.some((e) => e.ma === 'landing' && e.mb === 'turn')).toBe(false);
    expect(g.refused).toContainEqual(['landing.east', 'turn.f1']);
    expect(g.refused).toContainEqual(['c-west.mouth', 'turn.f3']);
  });
});

describe('blocking', () => {
  it('UT-SEAM-04 the arm is blocked by the lift at corridor level and free otherwise', () => {
    expect(house.firstBlock('seam-arm', 0, 1, INIT)?.by).toBe('lift');
    expect(house.firstBlock('seam-arm', 0, 1, { ...INIT, 'seam-lift': 0 })).toBeUndefined();
    expect(house.firstBlock('seam-arm', 0, 1, { ...INIT, 'seam-lift': 2 })).toBeUndefined();
    expect(house.firstBlock('seam-lift', 0, 0.5, { ...INIT, 'seam-lift': 0, 'seam-arm': 1 })).toBeUndefined();
  });
  it('UT-CONN-05 no other seam is blocked anywhere along its path in any configuration', () => {
    const blocked: string[] = [];
    for (const c of house.configurations()) {
      for (const sm of chapterOne.seams) {
        if (sm.id === 'seam-arm') continue;
        const b = house.firstBlock(sm.id, 0, sm.path.kind === 'rotary' && sm.path.cyclic ? 1 : sm.detents[sm.detents.length - 1], c);
        if (b) blocked.push(`${sm.id} by ${b.by} at ${b.at.toFixed(2)} ${JSON.stringify(c)}`);
      }
    }
    expect([...new Set(blocked.map((b) => b.split(' {')[0]))]).toEqual([]);
  });
});

describe('routing', () => {
  const e = (id: string, ma: string, mb: string): Edge => ({ id, a: id, b: id, ma, mb, player: true, enemy: true, locked: false, suspended: false, dependsOn: [] });
  it('UT-SURV-02 uniform-cost search takes the cheaper route, not the one with fewer doorways', () => {
    const edges = [e('1', 'A', 'B'), e('2', 'B', 'D'), e('3', 'A', 'C'), e('4', 'C', 'E'), e('5', 'E', 'D')];
    const cost: Record<string, number> = { A: 1, B: 100, C: 1, E: 1 };
    expect(findRoute(edges, 'A', 'D', () => true, (r) => cost[r])).toEqual(['3', '4', '5']);
  });
  it('UT-SURV-02b ties go to the lexically smaller edge sequence, and unusable edges are never used', () => {
    const edges = [e('b', 'A', 'B'), e('a', 'A', 'C'), e('c', 'B', 'D'), e('d', 'C', 'D')];
    expect(findRoute(edges, 'A', 'D', () => true, () => 1)).toEqual(['a', 'd']);
    expect(findRoute(edges, 'A', 'D', (x) => x.id !== 'a', () => 1)).toEqual(['b', 'c']);
    expect(findRoute(edges, 'A', 'Z', () => true, () => 1)).toBeUndefined();
  });
});
