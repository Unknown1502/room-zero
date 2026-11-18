// The house: module poses from seam parameters, the connection rule, the graph, and blocking.
// Pure functions. Connectivity is computed here and nowhere else (REQ-GRAPH-001, REQ-GRAPH-005).
import { angleDeg, boxesOverlap, compose, distance, rotY, rotateAbout, type Pose } from './math.js';
import type { ChapterContent, Edge, ModuleDef, SeamDef, SocketDef } from './types.js';

export class House {
  readonly moduleById = new Map<string, ModuleDef>();
  readonly seamById = new Map<string, SeamDef>();
  readonly seamOfModule = new Map<string, SeamDef>();
  readonly socketById = new Map<string, { socket: SocketDef; module: ModuleDef }>();
  private blockCache = new Map<string, boolean[]>();
  private blockWho = new Map<string, string[]>();

  constructor(readonly content: ChapterContent) {
    for (const m of content.modules) {
      this.moduleById.set(m.id, m);
      for (const sk of m.sockets) this.socketById.set(sk.id, { socket: sk, module: m });
    }
    for (const sm of content.seams) {
      this.seamById.set(sm.id, sm);
      this.seamOfModule.set(sm.moves, sm);
    }
  }

  static edgeId(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  /** Pose of a module when its seam is at path parameter p. */
  poseAt(moduleId: string, p: number): Pose {
    const m = this.moduleById.get(moduleId)!;
    const seam = this.seamOfModule.get(moduleId);
    if (!seam) return m.base;
    if (seam.path.kind === 'linear') {
      const d = seam.path.length * p;
      return { x: m.base.x + seam.path.ax * d, y: m.base.y + seam.path.ay * d, z: m.base.z + seam.path.az * d, yaw: m.base.yaw };
    }
    return rotateAbout(m.base, seam.path.px, seam.path.pz, seam.path.angle * p);
  }

  /** Pose of a module given every seam's committed detent index. */
  pose(moduleId: string, detents: Record<string, number>): Pose {
    const seam = this.seamOfModule.get(moduleId);
    return this.poseAt(moduleId, seam ? seam.detents[detents[seam.id]] : 0);
  }

  socketWorld(socketId: string, modulePose: Pose): { pose: Pose; nx: number; nz: number } {
    const { socket } = this.socketById.get(socketId)!;
    const [nx, nz] = rotY(socket.nx, socket.nz, modulePose.yaw);
    return { pose: compose(modulePose, socket.x, socket.y, socket.z), nx, nz };
  }

  /** Why two sockets do or do not mate at the given module poses. */
  mate(a: string, b: string, pa: Pose, pb: Pose): 'mated' | 'apart' | 'profile' {
    const tol = this.content.tolerances;
    const wa = this.socketWorld(a, pa);
    const wb = this.socketWorld(b, pb);
    if (distance(wa.pose, wb.pose) > tol.positionM) return 'apart';
    if (angleDeg(wa.nx, wa.nz, -wb.nx, -wb.nz) > tol.angleDeg) return 'apart';
    return this.socketById.get(a)!.socket.profile === this.socketById.get(b)!.socket.profile ? 'mated' : 'profile';
  }

  /**
   * The graph for a set of committed detents and flags. `moving` lists seams that are not at rest:
   * edges depending on them keep their committed state and are marked suspended (REQ-SEAM-006).
   */
  computeGraph(detents: Record<string, number>, flags: Record<string, boolean>, moving: ReadonlySet<string> = new Set()): { edges: Edge[]; refused: [string, string][] } {
    const edges: Edge[] = [];
    const refused: [string, string][] = [];
    const used = new Set<string>();
    for (const rule of this.content.pairs) {
      const ma = this.socketById.get(rule.a)!.module.id;
      const mb = this.socketById.get(rule.b)!.module.id;
      const verdict = rule.permanent ? 'mated' : this.mate(rule.a, rule.b, this.pose(ma, detents), this.pose(mb, detents));
      if (verdict === 'profile') refused.push([rule.a, rule.b]);
      if (verdict !== 'mated' || used.has(rule.a) || used.has(rule.b)) continue;
      used.add(rule.a);
      used.add(rule.b);
      const dependsOn = [this.seamOfModule.get(ma)?.id, this.seamOfModule.get(mb)?.id].filter((x): x is string => !!x);
      edges.push({
        id: House.edgeId(rule.a, rule.b), a: rule.a, b: rule.b, ma, mb,
        player: rule.player, enemy: rule.enemy,
        locked: !!rule.lockedUntilFlag && !flags[rule.lockedUntilFlag],
        suspended: dependsOn.some((sid) => moving.has(sid)),
        dependsOn,
      });
    }
    edges.sort((x, y) => (x.id < y.id ? -1 : 1));
    return { edges, refused };
  }

  /** Socket pairs that would mate if `seamId` were committed at `detent`, everything else as is. */
  previewPairs(seamId: string, detent: number, detents: Record<string, number>, flags: Record<string, boolean>): string[] {
    const seam = this.seamById.get(seamId)!;
    const g = this.computeGraph({ ...detents, [seamId]: detent }, flags);
    return g.edges.filter((e) => e.ma === seam.moves || e.mb === seam.moves).map((e) => e.id);
  }

  /**
   * Is the stretch of a seam's path between two parameters free of other modules?
   * Sampled; other modules are taken at their committed poses (REQ-SEAM-004).
   */
  firstBlock(seamId: string, from: number, to: number, detents: Record<string, number>): { at: number; by: string } | undefined {
    const seam = this.seamById.get(seamId)!;
    const key = `${seamId}:${Object.keys(detents).sort().filter((k) => k !== seamId).map((k) => detents[k]).join('')}`;
    const steps = 96;
    let table = this.blockCache.get(key);
    let who = this.blockWho.get(key);
    if (!table || !who) {
      table = [];
      who = [];
      const mover = this.moduleById.get(seam.moves)!;
      const others = this.content.modules.filter((m) => m.id !== mover.id).map((m) => ({ m, p: this.pose(m.id, detents) }));
      for (let i = 0; i <= steps; i++) {
        const mp = this.poseAt(mover.id, i / steps);
        const hit = others.find((o) => boxesOverlap(mp, mover.box, o.p, o.m.box));
        table.push(!!hit);
        who.push(hit ? hit.m.id : '');
      }
      this.blockCache.set(key, table);
      this.blockWho.set(key, who);
    }
    const wrap = (i: number) => ((i % steps) + steps) % steps;
    const cyclic = seam.path.kind === 'rotary' && seam.path.cyclic;
    const i0 = Math.round(from * steps);
    const i1 = Math.round(to * steps);
    const dir = i1 >= i0 ? 1 : -1;
    for (let i = i0 + dir; dir > 0 ? i <= i1 : i >= i1; i += dir) {
      const idx = cyclic ? wrap(i) : Math.max(0, Math.min(steps, i));
      if (table[idx]) return { at: (i - dir) / steps, by: who[idx] };
    }
    return undefined;
  }

  /** Any two modules overlapping at rest? Used by content validation. */
  restOverlaps(detents: Record<string, number>): [string, string][] {
    const out: [string, string][] = [];
    const ms = this.content.modules;
    for (let i = 0; i < ms.length; i++)
      for (let j = i + 1; j < ms.length; j++)
        if (boxesOverlap(this.pose(ms[i].id, detents), ms[i].box, this.pose(ms[j].id, detents), ms[j].box)) out.push([ms[i].id, ms[j].id]);
    return out;
  }

  /** Every combination of committed detents. Enumerated, not assumed. */
  *configurations(): Generator<Record<string, number>> {
    const seams = this.content.seams;
    const idx = seams.map(() => 0);
    for (;;) {
      yield Object.fromEntries(seams.map((sm, i) => [sm.id, idx[i]]));
      let k = seams.length - 1;
      while (k >= 0 && ++idx[k] === seams[k].detents.length) idx[k--] = 0;
      if (k < 0) return;
    }
  }
}

/** Uniform-cost search over usable edges. Deterministic: ties go to the lexically smaller edge sequence. */
export function findRoute(
  edges: readonly Edge[], from: string, to: string,
  usable: (e: Edge) => boolean, costOfLeaving: (room: string, first: boolean) => number,
): string[] | undefined {
  if (from === to) return [];
  const done = new Set<string>();
  let frontier: { room: string; cost: number; path: string[] }[] = [{ room: from, cost: 0, path: [] }];
  while (frontier.length) {
    frontier.sort((p, q) => p.cost - q.cost || (p.path.join(',') < q.path.join(',') ? -1 : 1));
    const cur = frontier.shift()!;
    if (done.has(cur.room)) continue;
    done.add(cur.room);
    if (cur.room === to) return cur.path;
    for (const e of edges) {
      if (!usable(e)) continue;
      const next = e.ma === cur.room ? e.mb : e.mb === cur.room ? e.ma : undefined;
      if (!next || done.has(next)) continue;
      frontier.push({ room: next, cost: cur.cost + costOfLeaving(cur.room, cur.path.length === 0), path: [...cur.path, e.id] });
    }
  }
  return undefined;
}

/** Fewest doorways between two rooms over open edges, whoever may use them. For audio. */
export function doorwaysBetween(edges: readonly Edge[], from: string, to: string): number | undefined {
  const r = findRoute(edges, from, to, (e) => !e.locked, () => 1);
  return r?.length;
}
