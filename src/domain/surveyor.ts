// The Surveyor: a deterministic state machine on the house graph.
// Rules: docs/01-game-design/enemy-surveyor.md. No randomness, no clock but the tick, no geometry.
import { findRoute } from './house.js';
import { ticks, type ChapterContent, type DomainEvent, type Edge, type SurveyorState, type SurveyorStateId } from './types.js';

export interface SurveyorWorld {
  content: ChapterContent;
  edges: readonly Edge[];
  playerRoom: string;
  /** Is the seam that moves this room out of rest? */
  roomMoving(room: string): boolean;
  emit(e: DomainEvent): void;
  slow: number;
}

export function newSurveyor(content: ChapterContent): SurveyorState {
  return { state: 'Dormant', room: content.den, walk: 0, route: [], stateTicks: 0, measuring: false, fresh: [], inPlayerRoom: 0, idle: 0, brace: 0, armed: false };
}

const MOVING: SurveyorStateId[] = ['Investigating', 'Approaching', 'Hunting', 'Searching', 'Retreating'];
const usable = (e: Edge) => e.enemy && !e.locked;
const other = (e: Edge, room: string) => (e.ma === room ? e.mb : e.ma);

function setState(sv: SurveyorState, w: SurveyorWorld, to: SurveyorStateId): void {
  if (sv.state === to) return;
  w.emit({ type: 'SurveyorStateChanged', from: sv.state, to });
  sv.state = to;
  sv.stateTicks = 0;
}

function crossTicks(w: SurveyorWorld, room: string): number {
  return ticks(w.content.modules.find((m) => m.id === room)!.crossSec * w.slow);
}

function route(sv: SurveyorState, w: SurveyorWorld, to: string): string[] | undefined {
  const t = w.content.surveyor;
  return findRoute(w.edges, sv.room, to, usable, (room, first) =>
    (first ? Math.max(0, crossTicks(w, room) - sv.walk) : crossTicks(w, room)) + ticks(t.thresholdSec * w.slow));
}

type Target = NonNullable<SurveyorState['target']>;
const keyOf = (t?: Target) => (t ? `${t.kind}:${t.edge ?? ''}:${t.room}` : 'none');

/** Newest reachable fresh joint, then the letter, then nothing (REQ-ENEMY-004). */
export function chooseTarget(sv: SurveyorState, w: SurveyorWorld): Target | undefined {
  // The letter is somewhere it cannot follow. If it is standing at that room's door with nothing
  // left to measure there, it stays: it will not leave the letter for an older joint elsewhere.
  const refuge = w.content.noEnemy.includes(w.playerRoom);
  const door = refuge ? w.edges.find((e) => !e.locked && (e.ma === w.playerRoom || e.mb === w.playerRoom)) : undefined;
  const doorRoom = door ? other(door, w.playerRoom) : undefined;
  if (doorRoom === sv.room && !sv.fresh.some((j) => j.measureIn === sv.room)) return { kind: 'letter', room: sv.room };
  for (let i = sv.fresh.length - 1; i >= 0; i--) {
    const j = sv.fresh[i];
    if (route(sv, w, j.measureIn)) return { kind: 'joint', edge: j.edge, room: j.measureIn };
  }
  if (!refuge && route(sv, w, w.playerRoom)) return { kind: 'letter', room: w.playerRoom };
  if (doorRoom && route(sv, w, doorRoom)) return { kind: 'letter', room: doorRoom };
  return undefined;
}

function plan(sv: SurveyorState, w: SurveyorWorld, target: Target | undefined): void {
  const cap = w.content.surveyor.countCap;
  sv.measuring = false;
  if (!target) {
    sv.target = undefined;
    sv.route = [];
    if (sv.room === w.content.den) {
      setState(sv, w, 'Dormant');
    } else {
      w.emit({ type: 'SurveyorNoRoute' });
      setState(sv, w, 'Searching');
    }
    return;
  }
  sv.target = target;
  sv.route = route(sv, w, target.room) ?? [];
  sv.idle = 0;
  setState(sv, w, target.kind === 'joint' ? 'Investigating' : sv.route.length <= 1 ? 'Hunting' : 'Approaching');
  w.emit({ type: 'SurveyorCount', n: Math.min(cap, sv.route.length), kind: 'plan' });
}

/** Advance the Surveyor by one tick. Returns true if it has reached the player. */
export function tickSurveyor(sv: SurveyorState, w: SurveyorWorld): boolean {
  if (!sv.armed) return false;
  const t = w.content.surveyor;

  if (sv.crossing) {
    if (--sv.crossing.left <= 0) {
      sv.room = sv.crossing.to;
      sv.crossing = undefined;
      sv.walk = 0;
      sv.inPlayerRoom = 0;
      sv.route.shift();
      w.emit({ type: 'SurveyorEnteredRoom', room: sv.room });
      if (sv.route.length > 0) w.emit({ type: 'SurveyorCount', n: Math.min(t.countCap, sv.route.length), kind: 'enter' });
    }
    return false;
  }

  sv.fresh = sv.fresh.filter((j) => w.edges.some((e) => e.id === j.edge));

  if (w.roomMoving(sv.room) && sv.brace < ticks(t.braceLimitSec)) {
    if (sv.brace++ === 0) w.emit({ type: 'SurveyorBracing', room: sv.room });
    return false;
  }
  if (!w.roomMoving(sv.room)) sv.brace = 0;

  const target = chooseTarget(sv, w);
  const pace = sv.state === 'Hunting' ? t.huntPace : 1;

  switch (sv.state) {
    case 'Dormant':
      if (target) setState(sv, w, 'Listening');
      return false;
    case 'Listening':
      if (++sv.stateTicks >= ticks(t.wakeSec * w.slow)) setState(sv, w, 'Replanning');
      return false;
    case 'Replanning':
      if (++sv.stateTicks >= ticks(t.replanSec)) plan(sv, w, target);
      return caught(sv, w, 1);
    case 'Blocked':
      if (++sv.stateTicks >= ticks(t.blockSec)) setState(sv, w, 'Replanning');
      return caught(sv, w, 1);
    default:
      break;
  }
  if (!MOVING.includes(sv.state)) return false;

  if (sv.measuring) {
    const gone = !w.edges.some((e) => e.id === sv.target?.edge);
    if (gone || ++sv.stateTicks >= ticks(t.measureSec)) {
      sv.fresh = sv.fresh.filter((j) => {
        const e = w.edges.find((x) => x.id === j.edge);
        return e && e.ma !== sv.room && e.mb !== sv.room;
      });
      sv.measuring = false;
      setState(sv, w, 'Replanning');
    }
    return caught(sv, w, 1);
  }

  if (sv.state === 'Searching' || sv.state === 'Retreating') {
    // A patrol or retreat route can lose its doorway when the house changes around it.
    // Do not keep animating toward an edge that no longer exists or can no longer be used.
    if (sv.route.length > 0) {
      const next = w.edges.find((e) => e.id === sv.route[0]);
      if (!next || !usable(next)) {
        sv.route = [];
        sv.target = undefined;
        if (sv.state === 'Retreating') setState(sv, w, 'Searching');
      }
    }
    if (target) {
      setState(sv, w, 'Replanning');
      return caught(sv, w, 1);
    }
    sv.idle = Math.min(sv.idle + 1, ticks(t.retreatSec));
    const exits = w.edges.filter((e) => usable(e) && (e.ma === sv.room || e.mb === sv.room));
    if (sv.state === 'Searching' && sv.idle >= ticks(t.retreatSec) && sv.room !== w.content.den && route(sv, w, w.content.den)) {
      sv.target = { kind: 'home', room: w.content.den };
      sv.route = route(sv, w, w.content.den)!;
      setState(sv, w, 'Retreating');
    } else if (sv.state === 'Searching' && sv.route.length === 0 && exits.length > 0) {
      // Patrol: the reachable neighbour through the lowest-numbered doorway that is not where it just came from.
      const pick = exits.find((e) => other(e, sv.room) !== sv.target?.room) ?? exits[0];
      sv.target = { kind: 'patrol', room: sv.room };
      sv.route = [pick.id];
    }
    if (sv.state === 'Retreating' && sv.route.length === 0) {
      setState(sv, w, 'Dormant');
      return false;
    }
  } else {
    // Investigating, Approaching, Hunting: keep the plan honest against the current graph.
    const next = sv.route[0];
    const nextEdge = next ? w.edges.find((e) => e.id === next) : undefined;
    if (next && (!nextEdge || !usable(nextEdge))) {
      setState(sv, w, 'Blocked');
      return caught(sv, w, 1);
    }
    if (keyOf(target) !== keyOf(sv.target)) {
      setState(sv, w, 'Replanning');
      return caught(sv, w, 1);
    }
    const fresh = route(sv, w, sv.target!.room) ?? [];
    if (fresh[0] !== next) {
      setState(sv, w, 'Replanning');
      return caught(sv, w, 1);
    }
    sv.route = fresh;
    if (sv.target!.kind === 'letter') setState(sv, w, sv.route.length <= 1 ? 'Hunting' : 'Approaching');
    if (sv.route.length === 0 && sv.target!.kind === 'joint') {
      sv.measuring = true;
      sv.stateTicks = 0;
      w.emit({ type: 'SurveyorMeasuring', room: sv.room });
      return caught(sv, w, 1);
    }
  }

  if (sv.route.length > 0) {
    sv.walk += pace;
    const e = w.edges.find((x) => x.id === sv.route[0]);
    if (e && usable(e) && !e.suspended && sv.walk >= crossTicks(w, sv.room)) {
      const to = other(e, sv.room);
      sv.crossing = { edge: e.id, to, left: ticks(t.thresholdSec * w.slow) };
      w.emit({ type: 'SurveyorCrossingStarted', edge: e.id, from: sv.room, to });
      if (sv.target?.kind === 'patrol') sv.target = { kind: 'patrol', room: sv.room };
      return false;
    }
  }
  return caught(sv, w, pace);
}

/** REQ-ENEMY-009: in the player's room for that room's reach time. */
function caught(sv: SurveyorState, w: SurveyorWorld, pace: number): boolean {
  if (sv.room !== w.playerRoom) {
    sv.inPlayerRoom = 0;
    return false;
  }
  const m = w.content.modules.find((x) => x.id === sv.room)!;
  if (m.reachSec === undefined) return false;
  sv.inPlayerRoom += pace;
  return sv.inPlayerRoom >= ticks(m.reachSec * w.slow);
}

/** Does the Surveyor have no way out of its room? */
export function sealed(sv: SurveyorState, edges: readonly Edge[]): boolean {
  return !sv.crossing && !edges.some((e) => usable(e) && (e.ma === sv.room || e.mb === sv.room));
}
