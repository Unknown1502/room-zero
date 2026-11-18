// GameSession: the single entry point to the rules. apply(command), tick(), drainEvents(), view.
// See docs/04-engineering/domain-model.md. Fixed 50 ms step; deterministic; no SDK, no DOM.
import { House, doorwaysBetween, findRoute } from './house.js';
import { fnv1a } from './math.js';
import { newSurveyor, sealed, tickSurveyor, type SurveyorWorld } from './surveyor.js';
import {
  ticks, type ChapterContent, type Command, type CommandResult, type DomainEvent, type Edge, type GameStateId,
  type Hand, type Reason, type SaveData, type SeamDef, type SeamState, type Settings, type SurveyorState,
} from './types.js';

export const SCHEMA_VERSION = 1;
export const DEFAULT_SETTINGS: Settings = { snapTurn: 0, intensity: 'standard', hands: 'two', volume: 1 };
const PLAYING: GameStateId[] = ['Exploration', 'PuzzleActive', 'SeamInteraction', 'ThreatEncounter'];
const SETTLE_MAX = 16;
const FROZEN_LIMIT = ticks(1.5);
const LATCH_PIN = ticks(6);
const HINT_TICKS = [ticks(40), ticks(80), ticks(120)];
const RECOVER_TICKS = ticks(2);
const ENDING_SEC = [0, 2, 5, 10, 15, 20, 26];

interface Core {
  seams: Record<string, number>;
  flags: Record<string, boolean>;
  solved: string[];
  vantage: string;
  letter: 'held' | 'strap' | 'delivered';
  checkpoint: string;
  postmarks: string[];
  surveyor: SurveyorState;
}

export class GameSession {
  readonly house: House;
  game: GameStateId = 'Boot';
  seams: Record<string, SeamState> = {};
  edges: Edge[] = [];
  flags: Record<string, boolean> = {};
  solved = new Set<string>();
  vantage: string;
  letter: 'held' | 'strap' | 'delivered' = 'held';
  checkpoint = 'cp-arrival';
  postmarks: string[] = [];
  catches = 0;
  complete = false;
  surveyor: SurveyorState;
  tickCount = 0;
  settings: Settings;
  hint: { objective: string; tier: number; text: string } | undefined;
  preview: { seam: string; detent: number; pairs: string[]; strength: number } | undefined;
  blockedBy: { seam: string; by: string } | undefined;
  ending: { ticks: number; step: number; gate: number } | undefined;
  private hands: Partial<Record<Hand, string>> = {};
  private hintIdle: Record<string, number> = {};
  private resume: GameStateId = 'Exploration';
  private recover = 0;
  private snapshots: Record<string, string> = {};
  private events: DomainEvent[] = [];
  private hasSave: boolean;
  private pendingSave: SaveData | undefined;

  constructor(readonly content: ChapterContent, settings: Settings = DEFAULT_SETTINGS, save?: SaveData) {
    this.house = new House(content);
    this.settings = { ...settings };
    this.vantage = content.startVantage;
    this.surveyor = newSurveyor(content);
    this.hasSave = !!save && !save.complete;
    this.pendingSave = save;
    this.reset();
    this.setGame('Title');
  }

  // ---------------------------------------------------------------- commands
  apply(c: Command): CommandResult {
    switch (c.type) {
      case 'Begin': {
        if (c.mode === 'continue') {
          if (!this.hasSave || !this.pendingSave) return no('NoSave');
          this.reset();
          this.loadSave(this.pendingSave);
        } else {
          this.reset();
          this.reach(this.content.checkpoints[0].id);
        }
        this.setGame('ChapterIntro');
        return ok;
      }
      case 'IntroDone':
        if (this.game !== 'ChapterIntro') return no('NotPlaying');
        this.setGame('Exploration');
        this.emit({ type: 'VantagesChanged', reachable: this.reachable() });
        return ok;
      case 'Restart':
        this.reset();
        this.reach(this.content.checkpoints[0].id);
        this.setGame('ChapterIntro');
        return ok;
      case 'EndSession': // the XR session ended: back to the title; continue resumes from the last postmark
        this.releaseAll();
        this.setGame('Title');
        return ok;
      case 'AckEnding':
        if (this.game !== 'ChapterComplete') return no('NotComplete');
        this.reset();
        if (c.choice === 'again') {
          this.reach(this.content.checkpoints[0].id);
          this.setGame('ChapterIntro');
        } else this.setGame('Title');
        return ok;
      case 'SetVisibility':
        if (!c.visible && (this.playing() || this.game === 'ChapterIntro' || this.game === 'FailureRecovery')) {
          this.releaseAll();
          this.resume = this.game;
          this.setGame('Pause');
        } else if (c.visible && this.game === 'Pause') this.setGame(this.resume);
        return ok;
      case 'SetSettings':
        this.settings = { ...this.settings, ...c.settings };
        this.emit({ type: 'SettingsChanged', settings: { ...this.settings } });
        return ok;
      default:
        break;
    }
    if (!this.playing()) return no('NotPlaying');
    switch (c.type) {
      case 'GripTake': return this.gripTake(c.seam, c.role, c.hand);
      case 'GripDrag': return this.gripDrag(c.seam, c.u);
      case 'GripRelease': return this.gripRelease(c.seam, c.role, c.reason);
      case 'LatchPinPress': {
        const sm = this.house.seamById.get(c.seam);
        if (!sm || !sm.stations.includes(this.vantage)) return no('NotAtStation');
        if (this.settings.hands !== 'one') return no('NotOneHanded');
        this.seams[c.seam].latchOpenTicks = LATCH_PIN;
        this.emit({ type: 'LatchChanged', seam: c.seam, open: true });
        return ok;
      }
      case 'Hop': return this.hop(c.vantage);
      case 'LetterTake':
        if (this.hands[c.hand]) return no('HandBusy');
        if (this.letter === 'delivered') return no('Unknown');
        this.hands[c.hand] = 'letter';
        this.setLetter('held');
        return ok;
      case 'LetterRelease': {
        for (const h of ['left', 'right'] as Hand[]) if (this.hands[h] === 'letter') delete this.hands[h];
        if (c.atSlot && this.vantage === 'v-zero' && this.letter !== 'delivered') {
          this.setLetter('delivered');
          this.ending = { ticks: 0, step: 0, gate: -1 };
        } else if (c.atSlot) {
          this.setLetter('strap');
          return no('NotAtSlot');
        } else if (this.letter !== 'delivered') this.setLetter('strap');
        return ok;
      }
      default:
        return no('Unknown');
    }
  }

  private gripTake(seamId: string, role: 'travel' | 'anchor', hand: Hand): CommandResult {
    const sm = this.house.seamById.get(seamId);
    if (!sm) return no('Unknown');
    const st = this.seams[seamId];
    const refuse = (reason: Reason): CommandResult => {
      this.emit({ type: 'GripRefused', seam: seamId, reason });
      return no(reason);
    };
    if (!sm.stations.includes(this.vantage)) return refuse('NotAtStation');
    if (this.house.moduleById.get(sm.moves)!.id === this.vantageModule()) return refuse('PlayerInside');
    if (this.hands[hand]) return refuse('HandBusy');
    if (role === 'anchor') {
      if (st.anchorHand) return refuse('Busy');
      st.anchorHand = hand;
      this.hands[hand] = `${seamId}:anchor`;
      this.emit({ type: 'GripTaken', seam: seamId, role, hand });
      this.emit({ type: 'LatchChanged', seam: seamId, open: true });
      if (st.phase === 'frozen') st.phase = 'held';
      return ok;
    }
    if (st.phase !== 'rest') return refuse('Busy');
    const sv = this.surveyor;
    if (sv.crossing && this.edges.find((e) => e.id === sv.crossing!.edge)?.dependsOn.includes(seamId)) return refuse('HeldBySurveyor');
    if (sm.latched && !st.anchorHand && st.latchOpenTicks <= 0) return refuse('Latched');
    st.phase = 'held';
    st.station = this.vantage;
    st.travelHand = hand;
    st.lastParam = st.param;
    this.hands[hand] = `${seamId}:travel`;
    this.emit({ type: 'GripTaken', seam: seamId, role, hand });
    return ok;
  }

  private gripDrag(seamId: string, u: number): CommandResult {
    const sm = this.house.seamById.get(seamId);
    const st = this.seams[seamId];
    if (!sm || !st || st.phase !== 'held') return no('NotHeld');
    const uu = Math.max(0, Math.min(1, Number.isFinite(u) ? u : 0));
    const base = sm.detents[st.committed];
    let want = sm.ratchet ? base + uu * spacing(sm) : sm.detents[0] + uu * (sm.detents[sm.detents.length - 1] - sm.detents[0]);
    const block = this.house.firstBlock(seamId, st.param, want, this.committed());
    if (block) {
      want = block.at;
      if (!this.blockedBy) this.emit({ type: 'SeamBlocked', seam: seamId, by: block.by });
      this.blockedBy = { seam: seamId, by: block.by };
    } else {
      this.blockedBy = undefined;
      if ((uu === 0 || uu === 1) && want !== st.param) this.emit({ type: 'SeamLimit', seam: seamId });
    }
    st.lastParam = st.param;
    st.param = want;
    this.updatePreview(sm, st);
    this.refreshSuspension();
    return ok;
  }

  private gripRelease(seamId: string, role: 'travel' | 'anchor', reason: 'open' | 'lost' | 'leftRail' | 'forced'): CommandResult {
    const sm = this.house.seamById.get(seamId);
    const st = this.seams[seamId];
    if (!sm || !st) return no('Unknown');
    if (role === 'anchor') {
      if (!st.anchorHand) return no('NotHeld');
      delete this.hands[st.anchorHand];
      st.anchorHand = undefined;
      this.emit({ type: 'LatchChanged', seam: seamId, open: false });
      if (st.phase === 'held' && sm.latched && st.latchOpenTicks <= 0) {
        st.phase = 'frozen';
        st.frozenTicks = 0;
        this.emit({ type: 'SeamFrozen', seam: seamId });
      }
      return ok;
    }
    if (st.phase !== 'held' && st.phase !== 'frozen') return no('NotHeld');
    if (st.travelHand) delete this.hands[st.travelHand];
    st.travelHand = undefined;
    this.beginSettle(sm, st, reason);
    return ok;
  }

  /** Choose snap or return and start the settle. Loss uses the last good value; forced always returns. */
  private beginSettle(sm: SeamDef, st: SeamState, reason: 'open' | 'lost' | 'leftRail' | 'forced'): void {
    const p = reason === 'lost' ? st.lastParam : st.param;
    let to = st.committed;
    if (reason !== 'forced') {
      if (sm.ratchet) {
        if ((p - sm.detents[st.committed]) / spacing(sm) >= 0.85) to = (st.committed + 1) % sm.detents.length;
      } else {
        let best = 0;
        sm.detents.forEach((d, i) => { if (Math.abs(d - p) < Math.abs(sm.detents[best] - p)) best = i; });
        if (Math.abs(sm.detents[best] - p) <= this.content.tolerances.snapWindow * spacing(sm)) to = best;
      }
      const target = sm.ratchet && to !== st.committed ? sm.detents[st.committed] + spacing(sm) : sm.detents[to];
      if (to !== st.committed && this.house.firstBlock(sm.id, sm.detents[st.committed], target, this.committed())) to = st.committed;
    }
    const goal = sm.ratchet && to !== st.committed ? sm.detents[st.committed] + spacing(sm) : sm.detents[to];
    st.phase = 'settling';
    st.settleFrom = st.param;
    st.settleTo = to;
    st.settleTotal = Math.max(2, Math.min(SETTLE_MAX, Math.ceil((Math.abs(goal - st.param) / Math.max(1e-6, spacing(sm))) * SETTLE_MAX)));
    st.settleTicks = 0;
    this.preview = undefined;
    this.blockedBy = undefined;
    this.emit({ type: 'SeamReleased', seam: sm.id, kind: to === st.committed ? 'return' : 'snap', toDetent: to });
    this.refreshSuspension();
  }

  private hop(to: string): CommandResult {
    const here = this.content.vantages.find((v) => v.id === this.vantage)!;
    const dest = this.content.vantages.find((v) => v.id === to);
    if (!dest || !here.adjacent.includes(to)) return no('NotAdjacent');
    if (!this.reachable().includes(to)) return no('EdgeNotUsable');
    this.releaseAll();
    const from = this.vantage;
    this.vantage = to;
    if (this.letter === 'held') this.setLetter('strap');
    this.emit({ type: 'PlayerHopped', from, to });
    if (to === this.content.armAtVantage && !this.surveyor.armed) this.surveyor.armed = true;
    this.afterChange();
    return ok;
  }

  // ---------------------------------------------------------------- tick
  tick(): void {
    if (this.game === 'FailureRecovery') {
      if (--this.recover <= 0) {
        const cp = this.checkpoint;
        this.restore(JSON.parse(this.snapshots[cp]) as Core);
        this.emit({ type: 'CheckpointRestored', checkpoint: cp });
        this.setGame('ChapterIntro');
      }
      return;
    }
    if (!this.playing()) return;
    this.tickCount++;

    for (const sm of this.content.seams) {
      const st = this.seams[sm.id];
      // One-handed mode: the latch pin stays open while the travel grip is held, then runs down.
      if (st.latchOpenTicks > 0 && st.phase !== 'held' && --st.latchOpenTicks === 0 && !st.anchorHand) this.emit({ type: 'LatchChanged', seam: sm.id, open: false });
      if (st.phase === 'frozen' && ++st.frozenTicks >= FROZEN_LIMIT) {
        if (st.travelHand) delete this.hands[st.travelHand];
        st.travelHand = undefined;
        this.beginSettle(sm, st, 'open');
      }
      if (st.phase === 'settling') {
        const goal = sm.ratchet && st.settleTo !== st.committed ? sm.detents[st.committed] + spacing(sm) : sm.detents[st.settleTo!];
        st.settleTicks!++;
        const k = st.settleTicks! / st.settleTotal!;
        st.param = st.settleFrom! + (goal - st.settleFrom!) * Math.min(1, k);
        if (k >= 1) this.rest(sm, st);
      }
    }

    const world: SurveyorWorld = {
      content: this.content, edges: this.edges, playerRoom: this.vantageModule(),
      roomMoving: (room) => { const sm = this.house.seamOfModule.get(room); return !!sm && this.seams[sm.id].phase !== 'rest' && this.displaced(sm); },
      emit: (e) => this.emit(e), slow: this.settings.intensity === 'reduced' ? 1.25 : 1,
    };
    if (tickSurveyor(this.surveyor, world) && !this.ending) {
      this.catches++;
      this.releaseAll();
      this.emit({ type: 'PlayerCaught', room: this.surveyor.room });
      this.recover = RECOVER_TICKS;
      this.setGame('FailureRecovery');
      return;
    }
    if (this.surveyor.state === 'Searching' && sealed(this.surveyor, this.edges) && !this.flags.surveyorSealed) this.setFlag('surveyorSealed');
    if (this.flags.surveyorSealed && !sealed(this.surveyor, this.edges)) this.flags.surveyorSealed = false;

    this.checkProgress();
    this.tickHints();
    this.tickEnding();
    if (this.playing()) this.setGame(this.subState());
  }

  private rest(sm: SeamDef, st: SeamState): void {
    const to = st.settleTo!;
    const changed = to !== st.committed;
    st.phase = 'rest';
    st.param = sm.detents[to];
    st.lastParam = st.param;
    st.settleTo = st.settleFrom = st.settleTicks = st.settleTotal = undefined;
    st.station = undefined;
    let opened = 0;
    if (changed) {
      const before = new Set(this.edges.map((e) => e.id));
      st.committed = to;
      this.emit({ type: 'SeamCommitted', seam: sm.id, detent: to });
      const g = this.recompute();
      const openedIds = this.edges.filter((e) => !before.has(e.id)).map((e) => e.id);
      const closed = [...before].filter((id) => !this.edges.some((e) => e.id === id));
      opened = openedIds.length;
      this.emit({ type: 'GraphChanged', opened: openedIds, closed });
      for (const [a, b] of g.refused) {
        const ma = this.house.socketById.get(a)!.module.id;
        const mb = this.house.socketById.get(b)!.module.id;
        if (ma === sm.moves || mb === sm.moves) this.emit({ type: 'PairRefused', a, b });
      }
      if (this.surveyor.armed) {
        for (const id of openedIds) {
          const e = this.edges.find((x) => x.id === id)!;
          const still = e.ma === sm.moves ? e.mb : e.ma;
          this.surveyor.fresh.push({ edge: id, measureIn: this.content.noEnemy.includes(still) ? sm.moves : still });
        }
      } else if (opened > 0) this.emit({ type: 'SurveyorLoggedJoint' });
    } else this.refreshSuspension();
    this.emit({ type: 'SeamRested', seam: sm.id, detent: to, opened });
    if (changed) this.afterChange();
  }

  /** Objectives, flags, checkpoints, lamps: after any commit or hop, in this order. */
  private afterChange(): void {
    this.checkProgress();
    this.emit({ type: 'VantagesChanged', reachable: this.reachable() });
  }

  private checkProgress(): void {
    const closing = this.content.checkpoints.find((c) => c.id === 'cp-docked')?.edge;
    if (closing && !this.flags.houseClosing && this.edges.some((e) => e.id === closing)) {
      this.setFlag('houseClosing');
      this.recompute();
      for (const e of this.edges) if (this.content.pairs.some((p) => p.lockedUntilFlag === 'houseClosing' && House.edgeId(p.a, p.b) === e.id)) this.emit({ type: 'EdgeUnlocked', edge: e.id });
    }
    for (const o of this.content.objectives) {
      if (this.solved.has(o.id)) continue;
      if ((o.edge && this.edges.some((e) => e.id === o.edge)) || (o.flag && this.flags[o.flag])) {
        this.solved.add(o.id);
        if (this.hint?.objective === o.id) this.hint = undefined;
        this.emit({ type: 'ObjectiveSolved', objective: o.id });
      }
    }
    for (const cp of this.content.checkpoints) {
      if (this.postmarks.includes(cp.postmark) || (!cp.vantage && !cp.edge)) continue;
      if (cp.vantage && this.vantage !== cp.vantage) continue;
      if (cp.edge && !this.edges.some((e) => e.id === cp.edge)) continue;
      if (cp.surveyorSealedIn && !(this.surveyor.room === cp.surveyorSealedIn && this.flags.surveyorSealed)) continue;
      this.reach(cp.id);
    }
  }

  private reach(id: string): void {
    const cp = this.content.checkpoints.find((c) => c.id === id)!;
    this.checkpoint = id;
    if (!this.postmarks.includes(cp.postmark)) this.postmarks.push(cp.postmark);
    this.snapshots[id] = JSON.stringify(this.core());
    const was = this.game;
    if (this.playing()) {
      this.setGame('Checkpoint');
      this.setGame(was);
    }
    this.emit({ type: 'CheckpointReached', checkpoint: id, postmark: cp.postmark });
    this.pendingSave = this.snapshot();
    this.hasSave = true;
    this.emit({ type: 'SaveRequested', data: this.pendingSave });
  }

  private tickHints(): void {
    const o = this.content.objectives.find((x) => x.station === this.vantage && !this.solved.has(x.id));
    if (!o || Object.keys(this.hands).length > 0) return;
    const toPlayer = this.surveyor.armed && this.surveyor.state !== 'Dormant' ? this.surveyor.route.length : 99;
    if (this.surveyor.target?.kind === 'letter' && toPlayer <= 1) return;
    const idle = (this.hintIdle[o.id] = (this.hintIdle[o.id] ?? 0) + 1);
    const tier = HINT_TICKS.filter((t) => idle >= t).length;
    if (tier > 0 && (this.hint?.objective !== o.id || this.hint.tier !== tier)) {
      this.hint = { objective: o.id, tier, text: o.hints[tier - 1] };
      this.emit({ type: 'HintShown', objective: o.id, tier, text: o.hints[tier - 1] });
    }
  }

  private tickEnding(): void {
    const en = this.ending;
    if (!en) return;
    en.ticks++;
    // Steps 1 to 3 run on the clock. Step 4, the ring at the round door, waits for the Surveyor
    // to be measuring at the lift, or 40 s, whichever is first, and never before 10 s.
    const arrived = this.surveyor.room === 'lift' && !this.surveyor.crossing;
    if (en.gate < 0 && en.ticks >= ticks(ENDING_SEC[3]) && (arrived || en.ticks >= ticks(40))) en.gate = en.ticks;
    const at = (i: number) => (i < 3 ? ticks(ENDING_SEC[i] || 0.05) : en.gate < 0 ? Infinity : en.gate + ticks(ENDING_SEC[i] - ENDING_SEC[3] || 0.05) - 1);
    while (en.step < ENDING_SEC.length && en.ticks >= at(en.step)) {
      en.step++;
      this.emit({ type: 'EndingStep', step: en.step });
    }
    if (en.step >= ENDING_SEC.length && en.ticks >= at(ENDING_SEC.length - 1) + ticks(4)) {
      this.complete = true;
      this.ending = undefined;
      this.setGame('ChapterComplete');
      this.emit({ type: 'SaveRequested', data: this.snapshot() });
    }
  }

  // ---------------------------------------------------------------- helpers
  playing(): boolean {
    return PLAYING.includes(this.game);
  }

  private subState(): GameStateId {
    if (this.content.seams.some((sm) => this.seams[sm.id].phase !== 'rest')) return 'SeamInteraction';
    const sv = this.surveyor;
    if (sv.armed && sv.state !== 'Dormant' && !(sv.state === 'Searching' && sealed(sv, this.edges))) return 'ThreatEncounter';
    if (this.content.objectives.some((o) => o.station === this.vantage && !this.solved.has(o.id))) return 'PuzzleActive';
    return 'Exploration';
  }

  private setGame(to: GameStateId): void {
    if (this.game === to) return;
    this.emit({ type: 'GameStateChanged', from: this.game, to });
    this.game = to;
  }

  private setFlag(flag: string): void {
    this.flags[flag] = true;
    this.emit({ type: 'FlagSet', flag });
  }

  private setLetter(s: 'held' | 'strap' | 'delivered'): void {
    if (this.letter === s) return;
    this.letter = s;
    this.emit({ type: 'LetterStateChanged', state: s });
  }

  private emit(e: DomainEvent): void {
    this.events.push(e);
  }

  drainEvents(): DomainEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  committed(): Record<string, number> {
    return Object.fromEntries(this.content.seams.map((sm) => [sm.id, this.seams[sm.id].committed]));
  }

  private displaced(sm: SeamDef): boolean {
    const st = this.seams[sm.id];
    return st.phase === 'settling' || Math.abs(st.param - sm.detents[st.committed]) > 0.01 * spacing(sm);
  }

  private moving(): Set<string> {
    return new Set(this.content.seams.filter((sm) => this.seams[sm.id].phase !== 'rest' && this.displaced(sm)).map((sm) => sm.id));
  }

  private recompute() {
    const g = this.house.computeGraph(this.committed(), this.flags, this.moving());
    this.edges = g.edges;
    return g;
  }

  private refreshSuspension(): void {
    const mv = this.moving();
    for (const e of this.edges) e.suspended = e.dependsOn.some((id) => mv.has(id));
  }

  private updatePreview(sm: SeamDef, st: SeamState): void {
    const win = this.content.tolerances.previewWindow * spacing(sm);
    let best = -1;
    let bestD = Infinity;
    const n = sm.detents.length;
    for (let i = 0; i < n; i++) {
      const d = sm.ratchet && i === (st.committed + 1) % n ? Math.abs(sm.detents[st.committed] + spacing(sm) - st.param) : Math.abs(sm.detents[i] - st.param);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0 || bestD > win || best === st.committed) { this.preview = undefined; return; }
    const pairs = this.house.previewPairs(sm.id, best, this.committed(), this.flags);
    const snap = this.content.tolerances.snapWindow * spacing(sm);
    this.preview = { seam: sm.id, detent: best, pairs, strength: Math.max(0, Math.min(1, (win - bestD) / Math.max(1e-6, win - snap))) };
  }

  private releaseAll(): void {
    for (const sm of this.content.seams) {
      const st = this.seams[sm.id];
      if (st.anchorHand) { st.anchorHand = undefined; this.emit({ type: 'LatchChanged', seam: sm.id, open: false }); }
      if (st.phase === 'held' || st.phase === 'frozen') { st.travelHand = undefined; this.beginSettle(sm, st, 'forced'); }
    }
    if (this.letter === 'held' && (this.hands.left === 'letter' || this.hands.right === 'letter')) this.setLetter('strap');
    this.hands = {};
  }

  vantageModule(): string {
    return this.content.vantages.find((v) => v.id === this.vantage)!.module;
  }

  /** Vantages the player may hop to now (REQ-UX-004). */
  reachable(): string[] {
    const here = this.content.vantages.find((v) => v.id === this.vantage)!;
    return here.adjacent.filter((id) => {
      const m = this.content.vantages.find((v) => v.id === id)!.module;
      return m === here.module || this.edges.some((e) => e.player && !e.locked && !e.suspended && ((e.ma === m && e.mb === here.module) || (e.mb === m && e.ma === here.module)));
    });
  }

  /** Is a grip available, and if not, why? For affordance display. */
  gripRefusal(seamId: string): Reason | undefined {
    const sm = this.house.seamById.get(seamId)!;
    const st = this.seams[seamId];
    const sv = this.surveyor;
    if (sv.crossing && this.edges.find((e) => e.id === sv.crossing!.edge)?.dependsOn.includes(seamId)) return 'HeldBySurveyor';
    if (sm.latched && !st.anchorHand && st.latchOpenTicks <= 0) return 'Latched';
    return undefined;
  }

  /** Doorways between a room and the player, over open edges. For audio attenuation. */
  audioDoorways(room: string): number | undefined {
    return doorwaysBetween(this.edges, room, this.vantageModule());
  }

  /** Edges to the player along the Surveyor's legal routes. */
  surveyorDoorwaysToPlayer(): number | undefined {
    return findRoute(this.edges, this.surveyor.room, this.vantageModule(), (e) => e.enemy && !e.locked, () => 1)?.length;
  }

  surveyorWalkProgress(): number {
    const m = this.house.moduleById.get(this.surveyor.room)!;
    const slow = this.settings.intensity === 'reduced' ? 1.25 : 1;
    return Math.min(1, this.surveyor.walk / ticks(m.crossSec * slow));
  }

  canContinue(): boolean {
    return this.hasSave;
  }

  // ---------------------------------------------------------------- state in and out
  private reset(): void {
    this.seams = {};
    for (const sm of this.content.seams) this.seams[sm.id] = { committed: sm.initial, phase: 'rest', param: sm.detents[sm.initial], frozenTicks: 0, latchOpenTicks: 0, lastParam: sm.detents[sm.initial] };
    this.flags = {};
    this.solved = new Set();
    this.vantage = this.content.startVantage;
    this.letter = 'held';
    this.checkpoint = this.content.checkpoints[0].id;
    this.postmarks = [];
    this.catches = 0;
    this.complete = false;
    this.surveyor = newSurveyor(this.content);
    this.hands = {};
    this.hintIdle = {};
    this.hint = this.preview = this.blockedBy = this.ending = undefined;
    this.snapshots = {};
    this.tickCount = 0;
    this.recompute();
  }

  private core(): Core {
    return JSON.parse(JSON.stringify({
      seams: this.committed(), flags: this.flags, solved: [...this.solved].sort(), vantage: this.vantage,
      letter: this.letter === 'delivered' ? 'delivered' : 'strap', checkpoint: this.checkpoint, postmarks: this.postmarks,
      surveyor: this.surveyor,
    })) as Core;
  }

  private restore(c: Core): void {
    for (const sm of this.content.seams) this.seams[sm.id] = { committed: c.seams[sm.id], phase: 'rest', param: sm.detents[c.seams[sm.id]], frozenTicks: 0, latchOpenTicks: 0, lastParam: sm.detents[c.seams[sm.id]] };
    this.flags = { ...c.flags };
    this.solved = new Set(c.solved);
    this.vantage = c.vantage;
    this.letter = c.letter;
    this.checkpoint = c.checkpoint;
    this.postmarks = [...c.postmarks];
    this.surveyor = JSON.parse(JSON.stringify(c.surveyor)) as SurveyorState;
    this.hands = {};
    this.hintIdle = {};
    this.hint = this.preview = this.blockedBy = this.ending = undefined;
    this.recompute();
  }

  /** Persisted form (REQ-SAVE-002). Always describes the last checkpoint, never a moment mid-pursuit. */
  snapshot(): SaveData {
    const c = this.snapshots[this.checkpoint] ? (JSON.parse(this.snapshots[this.checkpoint]) as Core) : this.core();
    const edges = this.house.computeGraph(c.seams, c.flags).edges.map((e) => e.id);
    return {
      schemaVersion: SCHEMA_VERSION, contentVersion: this.content.version, chapter: 'chapter-one', checkpoint: this.checkpoint,
      seams: c.seams, flags: c.flags, solved: c.solved, edges,
      surveyor: { state: c.surveyor.state, room: c.surveyor.room, armed: c.surveyor.armed, fresh: c.surveyor.fresh },
      catches: this.catches, complete: this.complete, settings: { ...this.settings },
    };
  }

  /** Load a validated save. The Surveyor re-derives its plan from where it was. */
  private loadSave(s: SaveData): void {
    const cps = this.content.checkpoints;
    const upTo = cps.findIndex((c) => c.id === s.checkpoint);
    const cp = cps[upTo];
    const sv = newSurveyor(this.content);
    sv.armed = s.surveyor.armed;
    sv.room = s.surveyor.room;
    sv.fresh = s.surveyor.fresh.map((f) => ({ ...f }));
    sv.state = s.surveyor.state === 'Dormant' ? 'Dormant' : 'Replanning';
    this.restore({
      seams: { ...s.seams }, flags: { ...s.flags }, solved: [...s.solved],
      vantage: cp.vantage ?? (cp.edge ? 'v-ceast-end' : this.content.startVantage), letter: 'strap', checkpoint: s.checkpoint,
      postmarks: cps.slice(0, upTo + 1).map((c) => c.postmark), surveyor: sv,
    });
    this.catches = s.catches;
    // Settings are not progress: the player's current choices (read from rz.settings, which is newer than the
    // copy inside a checkpoint record) are kept, never replaced by what the record held when it was written.
    this.snapshots[s.checkpoint] = JSON.stringify(this.core());
  }

  /** Canonical state hash, for determinism tests (REQ-GRAPH-008). */
  hash(): string {
    return fnv1a(JSON.stringify({ g: this.game, c: this.core(), s: this.seams, e: this.edges.map((e) => [e.id, e.suspended, e.locked]), t: this.tickCount, k: this.catches }));
  }
}

const ok: CommandResult = { ok: true };
const no = (reason: Reason): CommandResult => ({ ok: false, reason });
function spacing(sm: SeamDef): number {
  if (sm.path.kind === 'rotary' && sm.path.cyclic) return 1 / sm.detents.length;
  return sm.detents.length > 1 ? sm.detents[1] - sm.detents[0] : 1;
}
