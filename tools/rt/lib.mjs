// Shared helpers for the runtime (RT) tests: drive the live IWER session through the IWSDK CLI and read
// the game's state from the page. Every hand movement goes through IWER's hand devices, as a player's would.
// Setup (jumping to a checkpoint) is done in-page and reported as a precondition; the action under test never is.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cli = path.join(root, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');
export const evidenceDir = path.join(root, 'evidence', 'rt');
fs.mkdirSync(evidenceDir, { recursive: true });

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run one CLI command and return its `data`. Throws with the CLI's own message on failure. */
export function cliRun(args, env = {}) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', windowsHide: true, env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  let out;
  try { out = JSON.parse(r.stdout); } catch { throw new Error(`CLI said: ${(r.stderr || r.stdout || '').slice(0, 400)}`); }
  if (!out.ok) throw new Error(out.error?.message ?? 'CLI command failed');
  return out.data;
}

export const xr = (action, input = {}, timeout = 90000) => { const d = cliRun(['xr', action, '--input-json', JSON.stringify(input), '--timeout', String(timeout)]); return d.result ?? d; };

/** Evaluate JS in the page. The snippet is the body of an async function; `return` its result. */
export function page(js, timeout = 60000) {
  const data = cliRun(['browser', 'run', 'tests/runtime/eval.mjs', '--timeout', String(timeout)], { RZ_JS: js });
  return data.result;
}

/** Wait inside the page, polling the running game, so no CLI latency is added. Returns the truthy value or throws. */
export function waitIn(js, ms = 60000, label = js) {
  ms = Math.min(ms, 95000);
  const v = page(`const t0 = performance.now(); for (;;) { const v = (${js}); if (v) return v; if (performance.now() - t0 > ${ms}) return null; await new Promise(r => setTimeout(r, 40)); }`, ms + 30000);
  if (!v) throw new Error(`timed out (${ms} ms) waiting for: ${label}`);
  return v;
}

export function screenshot(name) {
  const file = path.join(evidenceDir, `${name}.png`);
  cliRun(['browser', 'screenshot', '--output-file', file]);
  return path.relative(root, file).replace(/\\/g, '/');
}

export async function ensureImmersive() {
  const s = xr('status');
  if (!s.sessionActive) xr('enter');
  waitIn('!!__rz.world.session', 20000, 'immersive session');
  xr('set-input-mode', { mode: 'hand' });
  for (const d of ['hand-left', 'hand-right']) xr('set-connected', { device: d, connected: true });
}

/** The parts of the game state that tests assert on. */
export const state = () => page(`
  const g = __rz, s = g.session;
  return { game: s.game, vantage: s.vantage, checkpoint: s.checkpoint, postmarks: s.postmarks, letter: s.letter,
    seams: Object.fromEntries(Object.entries(s.seams).map(([k, v]) => [k, { c: v.committed, phase: v.phase, p: +v.param.toFixed(3), travel: v.travelHand ?? null, anchor: v.anchorHand ?? null }])),
    edges: s.edges.map(e => e.id), reachable: s.reachable(), solved: [...s.solved], flags: s.flags,
    sv: { state: s.surveyor.state, room: s.surveyor.room, armed: s.surveyor.armed, crossing: !!s.surveyor.crossing, fresh: s.surveyor.fresh.length, walk: s.surveyor.walk },
    catches: s.catches, settings: s.settings, hint: s.hint?.text ?? null, failed: g.failed, tick: s.tickCount,
    blocked: s.blockedBy ?? null, session: !!g.world.session, vis: g.world.visibilityState.value, fade: +g.fade.toFixed(2) };`);

export class Report {
  constructor(file) { this.file = file; try { this.rows = JSON.parse(fs.readFileSync(file, 'utf8')).rows ?? []; } catch { this.rows = []; } }
  add(id, row) {
    this.rows = this.rows.filter((r) => r.id !== id); this.rows.push({ id, ...row }); this.rows.sort((a, b) => a.id.localeCompare(b.id));
    console.log(`${row.result.padEnd(8)} ${id} ${row.title}${row.note ? ' - ' + row.note : ''}`);
    this.save();
  }
  save() { fs.writeFileSync(this.file, JSON.stringify({ capturedAt: new Date().toISOString(), environment: 'IWER desktop emulator, Quest 3 profile, IWSDK 1.1.0, headless Chromium', rows: this.rows }, null, 2)); }
}

/** Position of a scene object in XR-origin metres (the player rig's frame), where IWER hands live. */
export const rigPos = (expr) => page(`const P = __rz.world.player, v = P.position.clone(); (${expr}).getWorldPosition(v); P.worldToLocal(v); return [v.x, v.y, v.z];`);
export const xyz = ([x, y, z]) => ({ x, y, z });
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

// ---- hands ----------------------------------------------------------------------------------------
export const specs = () => page('return __rz.stations.map(s => s.spec)');
/** The rail of a seam at a vantage, from the game's own station data. The station frame is the rig frame. */
export function rail(all, seam, vantage) {
  const spec = all.find((s) => s.seam === seam && s.vantage === vantage);
  if (!spec) throw new Error(`no station for ${seam} at ${vantage}`);
  const at = (u, back = 0) => add(spec.origin, spec.dir, spec.length * u).map((v, i) => (i === 2 ? v + back : v));
  return { spec, at, anchor: spec.anchor };
}
const pose = (p, extra = {}) => ({ position: xyz(p), anchor: 'grasp', ...extra });

/** Reach to a point and pinch. Further steps may carry the hold. */
export const grabSteps = (p, label = 'grab') => [
  { label: 'reach', position: xyz(add(p, [0, 0.02, 0.14])), anchor: 'grasp', orientation: 'auto' },
  { label, ...pose(p, { pinch: { value: 1, at: 'arrival' }, duration: 0.5 }) },
];
export const moveSteps = (points, each = 0.45) => points.map((p, i) => ({ label: `move ${i + 1}`, ...pose(p, { duration: each }) }));
export const releaseSteps = (settle = 0.2) => [{ label: 'release', pinch: 0, duration: settle }];
export const seq = (device, steps) => xr('run-sequence', { device, steps });

export const hand = (side) => `hand-${side}`;
export const other = (side) => (side === 'left' ? 'right' : 'left');
export const parkHands = () => { for (const s of ['left', 'right']) xr('set-select-value', { device: hand(s), value: 0 }); for (const s of ['left', 'right']) xr('set-transform', { device: hand(s), position: { x: s === 'left' ? -0.25 : 0.25, y: 1.0, z: -0.15 } }); };

// ---- setup (preconditions, reported as such) ---------------------------------------------------------------
/** Put the game at a checkpoint of the reference solution, with default settings. */
export function setup(cp, settings = {}) {
  return page(`
    const g = __rz;
    const { replayReference } = await import('/src/domain/reference.ts');
    g.command({ type: 'SetSettings', settings: { snapTurn: 0, intensity: 'standard', hands: 'two', volume: 1, ...${JSON.stringify(settings)} } });
    g.restart(); g.step(0); g.view(2.1, []);
    // The chapter intro needs its timer to run out before the session is playing; a second pass settles it when the first lands mid-fade.
    for (let k = 0; k < 4 && !g.session.playing(); k++) { g.step(0); g.view(2.1, []); }
    if (${JSON.stringify(cp)} !== 'cp-arrival') replayReference(g.session, ${JSON.stringify(cp)});
    g.step(0); g.snapDrawn(); g.placeRig(); // step(0) dispatches the replay's events, so the game writes its checkpoint saves as it would in play
    g.fade = 0; g.fadeTarget = 0;
    for (const h of g.world.systems.find((x) => x.constructor.name === 'HandInputSystem').hands) h.hold = undefined;
    return { game: g.session.game, vantage: g.session.vantage, checkpoint: g.session.checkpoint };`);
}

// ---- pointing, fingertips, in-page IWER device, event log ------------------------------------------------------
/** Point a hand's ray at an object and pinch-select, the way a player picks a lamp. Returns the ray length. */
export const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/** Where a hand must be, and how turned, for its ray to hit an object now (XR-origin space). One page call. */
export const aimAt = (side, targetExpr) => page(`const P = __rz.world.player, V = P.position.constructor, Q = P.quaternion.constructor;
    const t = P.position.clone(); (${targetExpr}).getWorldPosition(t); P.worldToLocal(t);
    const s = new V(${side === 'right' ? 0.22 : -0.22}, 1.3, -0.3), d = t.clone().sub(s).normalize();
    const q = new Q().setFromUnitVectors(new V(0, 0, -1), d); return { s: [s.x, s.y, s.z], q: [q.x, q.y, q.z, q.w], dist: t.distanceTo(s) };`);
/**
 * Hold a hand on a prepared aim and pinch-select. A player points before pinching: with no hover the SDK ray has not
 * registered the target and the press is lost (hop-trial: 11/18 first attempts at 0 ms, 18/18 at 400 ms; artifacts/hop-trial.json).
 * `setPose` shapes the hand as pinch-ready (IWER's SDK pointer misses far targets when a default-shaped hand closes);
 * the pose stays until changed, so a second press from the same hand can skip it.
 * Known emulator quirk: the first ray press by a hand that has just run a scripted run-sequence (a seam move) never reaches
 * the game (no Pressed event at all); the identical second press does. A rest pose, select reset, settle time, longer hover,
 * re-aim and a flush select before it changed nothing; a press from the other hand works at once.
 */
export function pointWith(side, q, hoverMs = Number(process.env.RZ_HOVER ?? 400), setPose = true) {
  if (setPose) xr('set-hand-pose', { device: hand(side), poseId: 'pinch' });
  xr('set-transform', { device: hand(side), position: xyz(q.s), orientation: { x: q.q[0], y: q.q[1], z: q.q[2], w: q.q[3] } });
  if (hoverMs) sleepSync(hoverMs);
  xr('select', { device: hand(side) });
  return q.dist;
}
/** Point a hand's ray at an object and pinch-select, the way a player picks a lamp. Returns the ray length. */
export function pointAndPinch(side, targetExpr, hoverMs = Number(process.env.RZ_HOVER ?? 400)) {
  const d = pointWith(side, aimAt(side, targetExpr), hoverMs);
  xr('set-hand-pose', { device: hand(side), poseId: 'default' });
  return d;
}
/** Steps that bring an index fingertip onto an object's centre. */
export const fingertip = (expr) => {
  const seal = rigPos(expr);
  return [
    { label: 'reach', position: { x: seal[0], y: seal[1] + 0.07, z: seal[2] + 0.02 }, anchor: 'index-tip', poseId: 'point', orientation: 'auto' },
    { label: 'touch', position: xyz(seal), anchor: 'index-tip', poseId: 'point', duration: 0.4 },
  ];
};
/** Run JS in the page with the IWER device and its two hands in scope. */
export const iwer = (js) => page(`const D = window.IWER_DEVICE, L = D.hands.left, Rh = D.hands.right, sleep = (ms) => new Promise(r => setTimeout(r, ms)); ${js}`);

/** Reload the page, then wait until it has stayed loaded for `quietMs` (Vite can re-optimise dependencies and reload shortly after boot). */
export async function stablePage(quietMs = 30000) {
  cliRun(['browser', 'reload']);
  for (let round = 0; round < 8; round++) {
    let origin;
    for (let k = 0; k < 60; k++) { try { origin = page('return performance.timeOrigin'); if (origin) break; } catch { /* loading */ } await sleep(1000); }
    await sleep(quietMs);
    let again; try { again = page('return performance.timeOrigin'); } catch { again = null; }
    if (again === origin) return round;
  }
  throw new Error('the page kept reloading');
}
