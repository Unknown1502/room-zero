// Verifies the fault-injection tests (RT-23, RT-24) leave no trace, that a normal session with nothing injected is clean, that the
// game's failure policy releases what it holds, and that the production build carries none of it.
// Usage: node tools/qa/fault-injection-verify.mjs <before|after>   -> qa/runtime-investigation/<phase>-results.json and screenshots
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { cliRun, ensureImmersive, page, parkHands, root, setup, sleep, stablePage, waitIn, xr } from '../rt/lib.mjs';
import { playChapter } from '../rt/chapter.mjs';

const phase = process.argv[2] ?? 'before';
const outDir = path.join(root, 'qa', 'runtime-investigation');
const shotDir = path.join(outDir, phase);
fs.mkdirSync(shotDir, { recursive: true });
const results = [];
const check = (id, name, ok, detail = '') => { results.push({ id, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? ' - ' + detail : ''}`); };
const shot = (name) => { const f = path.join(shotDir, `${name}.png`); cliRun(['browser', 'screenshot', '--output-file', f]); return path.relative(root, f).replace(/\\/g, '/'); };
const look = () => xr('set-transform', { device: 'headset', orientation: { pitch: -8, yaw: 0, roll: 0 } });
const recorder = `window.__errs = window.__errs || []; if (!window.__errWrapped) { window.__errWrapped = true; const o = console.error.bind(console); console.error = (...a) => { window.__errs.push(a.map((x) => String(x && x.message ? x.message : x)).join(' ').slice(0, 160)); o(...a); }; window.addEventListener('error', (e) => window.__errs.push('window error: ' + String(e.message).slice(0, 120))); } return 1`;
const stopped = () => page(`return window.__errs.filter((m) => m.startsWith('Room Zero stopped')).length`);

// ---- A. clean normal session: nothing injected --------------------------------------------------------------------------
await stablePage(15000);
const fresh = page(`const g = __rz; return { origTick: typeof window.__origTick, origReq: typeof window.__origReq, ownTick: Object.prototype.hasOwnProperty.call(g.session, 'tick'), rz: typeof window.__rz }`);
check('A0', 'fresh page: no injection state present', fresh.origTick === 'undefined' && fresh.origReq === 'undefined' && !fresh.ownTick, JSON.stringify(fresh));
await ensureImmersive(); await sleep(1500); parkHands(); page(recorder);
const evidence = [];
const clean = await playChapter({ log: () => {}, stopAfter: 'stair', beat: async (n) => { try { look(); evidence.push(shot(`clean-${n}`)); } catch { /* ignore */ } } });
const cleanErrs = page('return window.__errs.slice()');
const cleanState = page(`const g = __rz, s = g.session; return { game: s.game, vantage: s.vantage, postmarks: s.postmarks, failed: g.failed, ownTick: Object.prototype.hasOwnProperty.call(s, 'tick') }`);
check('A1', 'clean session from the title to the stair head (title, begin, first room, letter, first seam, room transitions) with hands only', clean.end.vantage === 'v-stair-head' && cleanState.postmarks.includes('STAIR') && !cleanState.failed, `${clean.seconds} s; ${JSON.stringify(cleanState)}`);
check('A2', 'clean session logged no console errors and nothing was injected', cleanErrs.length === 0 && !cleanState.ownTick, `errors: ${JSON.stringify(cleanErrs)}`);

// ---- B. RT-23: refused XR session ----------------------------------------------------------------------------------------
try { xr('exit'); } catch { /* not in a session */ }
waitIn('!__rz.world.session', 15000, 'out of the session'); await sleep(1500);
page(`const proto = Object.getPrototypeOf(navigator.xr); window.__origReq = proto.requestSession; proto.requestSession = () => Promise.reject(new DOMException('refused for RT-23', 'NotAllowedError')); document.getElementById('page').style.display = 'flex'; return 1`);
page(`document.getElementById('enter').click(); return 1`); await sleep(2500);
const refused = page(`return { status: document.getElementById('status').textContent, enterDisabled: document.getElementById('enter').disabled, session: !!__rz.world.session, failed: __rz.failed }`);
const refusedShot = shot('rt23-refused');
check('B1', 'refusal is handled: message shown, Enter VR usable again, no session left, game not failed', /did not start/i.test(refused.status) && !refused.enterDisabled && !refused.session && !refused.failed, JSON.stringify(refused));
const restored = page(`const proto = Object.getPrototypeOf(navigator.xr); proto.requestSession = window.__origReq; return { same: proto.requestSession === window.__origReq }`);
page(`document.getElementById('enter').click(); return 1`);
let started = true; try { waitIn('!!__rz.world.session', 15000, 'session after the refusal is lifted'); } catch { started = false; }
check('B2', 'after the injection is removed a session starts', restored.same && started, `restored: ${restored.same}; started: ${started}`);
xr('set-input-mode', { mode: 'hand' }); for (const d of ['hand-left', 'hand-right']) xr('set-connected', { device: d, connected: true });
page(`delete window.__origReq; return 1`);

// ---- C. RT-24: a tick that throws ---------------------------------------------------------------------------------------
setup('cp-arrival'); parkHands(); look(); await sleep(1500);
const e0 = stopped();
// A seam is being dragged back and forth when the failure comes, so the grinding loop is genuinely running (the game sets its
// loops every frame, so a loop set by hand would be overwritten before the failure).
page(`const g = __rz; g.session.vantage = 'v-foyer-door'; g.placeRig(); g.view(0.016, []); g.fade = g.fadeTarget = 0;
  g.command({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' }); let u = 0, d = 1;
  window.__wiggle = setInterval(() => { u += d * 0.05; if (u >= 1 || u <= 0) d = -d; g.command({ type: 'GripDrag', seam: 'seam-hall', u: Math.max(0, Math.min(1, u)) }); }, 16); return 1`);
await sleep(1500);
const grindBefore = page('return __rz.loops.get("grind") ?? 0');
check('C0', 'precondition: the grinding loop is running when the failure is injected', grindBefore > 0.02, `grind ${grindBefore}`);
page(`const g = __rz; window.__origTick = g.session.tick; g.session.tick = () => { throw new Error('verify injected failure'); }; return 1`);
waitIn('__rz.failed', 6000, 'error boundary');
page(`clearInterval(window.__wiggle); return 1`);
const t0 = page('return __rz.session.tickCount'); await sleep(1500);
const f1 = page(`const g = __rz; return { card: g.errorCard.visible, ticks: g.session.tickCount, failed: g.failed, loops: Object.fromEntries([...g.loops.entries()].filter(([, v]) => v > 0)) }`);
look(); const failShot = shot('rt24-error-card');
check('C1', 'the failure is logged exactly once and ticking stops', stopped() - e0 === 1 && f1.failed && f1.card && f1.ticks === t0, `new "Room Zero stopped" messages: ${stopped() - e0}; ${JSON.stringify({ card: f1.card, ticks: f1.ticks, before: t0 })}`);
const loud = Object.entries(f1.loops).filter(([k]) => k !== 'tone');
check('C2', 'the failure policy releases the loops that were running (only the ambient tone may remain)', loud.length === 0, `loops still audible under the error card: ${JSON.stringify(f1.loops)}`);
// Removing the hook means deleting the own property: assigning the saved method back leaves an own property that shadows the prototype's.
page(`const g = __rz; delete g.session.tick; delete window.__origTick; return 1`);
page(`const g = __rz; g.restart(); g.step(0); g.view(2.1, []); return 1`); await sleep(2500);
const rec = page(`const g = __rz, s = g.session; return { failed: g.failed, card: g.errorCard.visible, ownTick: Object.prototype.hasOwnProperty.call(s, 'tick'), game: s.game, cp: s.checkpoint, postmarks: s.postmarks, solved: [...s.solved], seams: Object.values(s.seams).map((x) => x.committed + ':' + x.phase).join(','), ticks: s.tickCount, tone: g.loops.get('tone') }`);
await sleep(1200); const ticksLater = page('return __rz.session.tickCount');
check('C3', 'recovery: failure cleared, card hidden, hook removed, the chapter is back at its opening, ticking again', !rec.failed && !rec.card && !rec.ownTick && rec.cp === 'cp-arrival' && rec.postmarks.length <= 1 && rec.solved.length === 0 && ticksLater > rec.ticks, JSON.stringify(rec));
check('C4', 'the ambient tone is playing again after recovery', rec.tone > 0, `tone ${rec.tone}`);
// a second injection: no leakage from the first, one message again
const e1 = stopped();
page(`const g = __rz; window.__origTick = g.session.tick; g.session.tick = () => { throw new Error('verify injected failure 2'); }; return 1`);
waitIn('__rz.failed', 6000, 'second failure'); await sleep(1200);
const second = stopped() - e1;
page(`const g = __rz; delete g.session.tick; delete window.__origTick; g.restart(); g.step(0); g.view(2.1, []); return 1`); await sleep(1500);
const after2 = page(`const g = __rz; return { failed: g.failed, ownTick: Object.prototype.hasOwnProperty.call(g.session, 'tick'), leftovers: [typeof window.__origTick, typeof window.__origReq] }`);
check('C5', 'a second injection logs once and leaves nothing behind', second === 1 && !after2.failed && !after2.ownTick && after2.leftovers.every((t) => t === 'undefined'), `messages ${second}; ${JSON.stringify(after2)}`);
const noise = page(`return window.__errs.filter((m) => !/verify injected failure|refused for RT-23|Room Zero stopped|Failed to start XR session/.test(m))`);
check('C6', 'no console errors other than the ones injected on purpose', noise.length === 0, JSON.stringify(noise));

// ---- D. the production build -----------------------------------------------------------------------------------------------
const dist = path.join(root, 'dist');
const files = fs.readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.js'));
const hits = [];
for (const f of files) { const t = fs.readFileSync(path.join(dist, 'assets', f), 'utf8'); for (const s of ['injected failure', 'refused for RT', 'QA injected', 'verify injected', '__origTick', '__origReq', 'IWER_DEVICE', '__rz']) if (t.includes(s)) hits.push(`${f}: ${s}`); }
check('D1', 'no injection strings, test hooks or emulator globals in the production bundle', hits.length === 0, hits.join('; ') || `${files.length} JS files scanned`);
let prod;
try {
  const browser = await chromium.launch({ headless: true });
  const pg = await browser.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 120))); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await pg.goto('http://127.0.0.1:4173/?inject=1&fail=1&debug=1');
  await pg.waitForFunction(() => document.getElementById('status') && !/Preparing/.test(document.getElementById('status').textContent), null, { timeout: 60000 });
  prod = await pg.evaluate(() => ({ rz: typeof window.__rz, iwer: typeof window.IWER_DEVICE, status: document.getElementById('status').textContent }));
  await pg.evaluate(() => { localStorage.setItem('rz.inject', '1'); localStorage.setItem('rz.debug', '1'); });
  await pg.reload(); await pg.waitForTimeout(1500);
  prod.errors = errs; await browser.close();
} catch (e) { prod = { error: String(e.message).slice(0, 160) }; }
check('D2', 'production page ignores failure and debug flags in the URL and storage; no test hooks; loads without errors', prod && prod.rz === 'undefined' && prod.iwer === 'undefined' && (prod.errors ?? []).length === 0, JSON.stringify(prod));

fs.writeFileSync(path.join(outDir, `${phase}-results.json`), JSON.stringify({ capturedAt: new Date().toISOString(), phase, results, screenshots: { clean: evidence, refused: refusedShot, errorCard: failShot } }, null, 2));
const bad = results.filter((r) => !r.ok).length;
console.log(`${results.length - bad} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
