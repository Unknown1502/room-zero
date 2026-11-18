// Versioned local save: codec, validation, migration and the recovery ladder.
// See docs/04-engineering/save-schema.md. Pure: storage is injected. Saved data is untrusted input.
import { House } from '../domain/house.js';
import { DEFAULT_SETTINGS, GameSession, SCHEMA_VERSION } from '../domain/session.js';
import type { ChapterContent, SaveData, Settings } from '../domain/types.js';

export interface Storage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const KEYS = { pointer: 'rz.save.pointer', a: 'rz.save.A', b: 'rz.save.B', settings: 'rz.settings' };
const MAX_BYTES = 8 * 1024;
const TOP = ['schemaVersion', 'contentVersion', 'chapter', 'checkpoint', 'seams', 'flags', 'solved', 'edges', 'surveyor', 'catches', 'complete', 'settings'];
const STATES = ['Dormant', 'Listening', 'Replanning', 'Investigating', 'Approaching', 'Hunting', 'Blocked', 'Searching', 'Retreating'];

/** Version-to-version migrations. Key n upgrades a record from version n to n + 1. None exist yet. */
export const MIGRATIONS: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {};

export type Verdict = { ok: true; data: SaveData } | { ok: false; reason: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = 64): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

export function validateSettings(v: unknown): Settings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS };
  return {
    snapTurn: v.snapTurn === 30 || v.snapTurn === 45 ? v.snapTurn : 0,
    intensity: v.intensity === 'reduced' ? 'reduced' : 'standard',
    hands: v.hands === 'one' ? 'one' : 'two',
    volume: typeof v.volume === 'number' && v.volume >= 0 && v.volume <= 1 ? v.volume : 1,
  };
}

/** The eight checks of save-schema.md section 4. */
export function validate(raw: unknown, content: ChapterContent): Verdict {
  const bad = (reason: string): Verdict => ({ ok: false, reason });
  if (!isObj(raw)) return bad('not an object');
  if (raw.schemaVersion !== SCHEMA_VERSION) return bad('schema version');
  for (const k of Object.keys(raw)) if (!TOP.includes(k)) return bad(`unknown field ${k.slice(0, 20)}`);
  for (const k of TOP) if (!(k in raw)) return bad(`missing ${k}`);
  if (raw.chapter !== 'chapter-one' || raw.contentVersion !== content.version) return bad('content version');
  const cp = content.checkpoints.find((c) => c.id === raw.checkpoint);
  if (!cp) return bad('checkpoint');
  if (!isObj(raw.seams) || !isObj(raw.flags) || !isObj(raw.surveyor)) return bad('shape');
  if (!Array.isArray(raw.solved) || !Array.isArray(raw.edges) || raw.solved.length > 16 || raw.edges.length > 32) return bad('shape');
  if (typeof raw.catches !== 'number' || raw.catches < 0 || raw.catches > 1e6 || typeof raw.complete !== 'boolean') return bad('shape');

  const seams: Record<string, number> = {};
  if (Object.keys(raw.seams).length !== content.seams.length) return bad('seams');
  for (const sm of content.seams) {
    const d = raw.seams[sm.id];
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d >= sm.detents.length) return bad(`seam ${sm.id}`);
    seams[sm.id] = d;
  }
  const flags: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw.flags)) {
    if (!['houseClosing', 'surveyorSealed'].includes(k) || typeof v !== 'boolean') return bad('flag');
    flags[k] = v;
  }
  const solved: string[] = [];
  for (const o of raw.solved) {
    if (!isStr(o) || !content.objectives.some((x) => x.id === o)) return bad('objective');
    solved.push(o);
  }

  // Graph equality: the stored edge list must be what the rules compute from the stored seams and flags.
  const house = new House(content);
  const computed = house.computeGraph(seams, flags).edges.map((e) => e.id);
  const stored = raw.edges.filter((e): e is string => isStr(e, 80));
  if (stored.length !== raw.edges.length || computed.length !== stored.length || computed.some((id, i) => id !== [...stored].sort()[i])) return bad('edges do not match seams');
  if (house.restOverlaps(seams).length > 0) return bad('modules overlap');

  const sv = raw.surveyor;
  if (!isStr(sv.state) || !STATES.includes(sv.state) || !isStr(sv.room) || !house.moduleById.has(sv.room) || typeof sv.armed !== 'boolean' || !Array.isArray(sv.fresh) || sv.fresh.length > 16) return bad('surveyor');
  if (content.noEnemy.includes(sv.room) || (!sv.armed && sv.state !== 'Dormant')) return bad('surveyor');
  const fresh = [];
  for (const f of sv.fresh) {
    if (!isObj(f) || !isStr(f.edge, 80) || !isStr(f.measureIn) || !house.moduleById.has(f.measureIn)) return bad('fresh joint');
    fresh.push({ edge: f.edge, measureIn: f.measureIn });
  }

  // Plausibility: the checkpoint's own trigger must hold for the record.
  if (cp.edge && !computed.includes(cp.edge)) return bad('checkpoint trigger');
  if (cp.surveyorSealedIn && sv.room !== cp.surveyorSealedIn) return bad('checkpoint trigger');
  const order = content.checkpoints.findIndex((c) => c.id === cp.id);
  if (order >= content.checkpoints.findIndex((c) => c.id === 'cp-corridor') !== sv.armed) return bad('surveyor arming');

  return {
    ok: true,
    data: {
      schemaVersion: SCHEMA_VERSION, contentVersion: content.version, chapter: 'chapter-one', checkpoint: cp.id, seams, flags, solved, edges: computed,
      surveyor: { state: sv.state as SaveData['surveyor']['state'], room: sv.room, armed: sv.armed, fresh },
      catches: Math.floor(raw.catches), complete: raw.complete, settings: validateSettings(raw.settings),
    },
  };
}

/** A known-good save for a checkpoint, made by replaying the reference solution up to it. */
export function canonicalSave(content: ChapterContent, checkpoint: string, settings: Settings, replay: (s: GameSession, until: string) => void): SaveData | undefined {
  if (!content.checkpoints.some((c) => c.id === checkpoint)) return undefined;
  const s = new GameSession(content, settings);
  s.apply({ type: 'Begin', mode: 'new' });
  s.apply({ type: 'IntroDone' });
  replay(s, checkpoint);
  return s.checkpoint === checkpoint ? s.snapshot() : undefined;
}

export interface LoadResult {
  save: SaveData | undefined;
  settings: Settings;
  /** True when stored progress existed and could not be used as stored (REQ-ERR-004). */
  notice: boolean;
}

function readSlot(storage: Storage, slot: string | null, content: ChapterContent): { verdict: Verdict; checkpoint?: string } | undefined {
  if (slot !== 'A' && slot !== 'B') return undefined;
  let text: string | null = null;
  try { text = storage.get(slot === 'A' ? KEYS.a : KEYS.b); } catch { return undefined; }
  if (text === null) return undefined;
  if (text.length > MAX_BYTES) return { verdict: { ok: false, reason: 'too large' } };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { verdict: { ok: false, reason: 'not JSON' } }; }
  if (isObj(raw) && typeof raw.schemaVersion === 'number' && raw.schemaVersion < SCHEMA_VERSION) {
    let cur: Record<string, unknown> = raw;
    for (let v = raw.schemaVersion as number; v < SCHEMA_VERSION; v++) {
      const step = MIGRATIONS[v];
      if (!step) return { verdict: { ok: false, reason: 'no migration' }, checkpoint: isStr(raw.checkpoint) ? raw.checkpoint : undefined };
      cur = step(cur);
    }
    raw = cur;
  }
  return { verdict: validate(raw, content), checkpoint: isObj(raw) && isStr(raw.checkpoint) ? raw.checkpoint : undefined };
}

/** The recovery ladder: stored record, other slot, canonical snapshot of its checkpoint, new game. Never throws. */
export function load(storage: Storage, content: ChapterContent, replay: (s: GameSession, until: string) => void): LoadResult {
  let settings = { ...DEFAULT_SETTINGS };
  let stored = false;
  try { const s = storage.get(KEYS.settings); if (s) { settings = validateSettings(JSON.parse(s)); stored = true; } } catch { /* defaults */ }
  // rz.settings is written on every change, so it is newer than the copy inside a checkpoint record.
  const pick = (record: Settings): Settings => (stored ? settings : record);
  let pointer: string | null = null;
  try { pointer = storage.get(KEYS.pointer); } catch { return { save: undefined, settings, notice: false }; }
  const first = readSlot(storage, pointer, content);
  if (!first) return { save: undefined, settings, notice: pointer !== null };
  if (first.verdict.ok) return { save: first.verdict.data, settings: pick(first.verdict.data.settings), notice: false };
  if (first.checkpoint) {
    const canon = canonicalSave(content, first.checkpoint, settings, replay);
    if (canon) return { save: canon, settings, notice: true };
  }
  const other = readSlot(storage, pointer === 'A' ? 'B' : 'A', content);
  if (other?.verdict.ok) return { save: other.verdict.data, settings: pick(other.verdict.data.settings), notice: true };
  return { save: undefined, settings, notice: true };
}

/** Write to the slot that is not current, read it back, then switch the pointer (REQ-SAVE-006). */
export function write(storage: Storage, data: SaveData): boolean {
  try {
    const text = JSON.stringify(data);
    if (text.length > MAX_BYTES) return false;
    const next = storage.get(KEYS.pointer) === 'A' ? 'B' : 'A';
    const key = next === 'A' ? KEYS.a : KEYS.b;
    storage.set(key, text);
    if (storage.get(key) !== text) return false;
    storage.set(KEYS.pointer, next);
    storage.set(KEYS.settings, JSON.stringify(data.settings));
    return true;
  } catch {
    return false;
  }
}

export function writeSettings(storage: Storage, settings: Settings): void {
  try { storage.set(KEYS.settings, JSON.stringify(settings)); } catch { /* play continues without saving */ }
}

export class MemoryStorage implements Storage {
  readonly map = new Map<string, string>();
  get(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  set(k: string, v: string) { this.map.set(k, v); }
  remove(k: string) { this.map.delete(k); }
}
