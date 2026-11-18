// IWER desktop-emulator performance baseline. These are NOT Quest measurements.
// Measured per scenario while the real game runs in the managed headless Chromium (software GL):
// frame interval p50/p95/p99, CPU time per system, renderer.render CPU time, draw calls, triangles, programs,
// texture count and estimated texture memory, JS heap and heap drops (a GC proxy), long tasks.
// Usage: node tools/rt/perf.mjs [label]   -> artifacts/perf-<label>.json
import fs from 'node:fs';
import path from 'node:path';
import { cliRun, ensureImmersive, parkHands, root, setup, sleep, stablePage, page } from './lib.mjs';

const label = process.argv[2] ?? 'baseline';

const INSTALL = `
  const g = __rz; if (window.__perf) return 'already installed';
  const sysByName = (n) => g.world.systems.find((x) => x.constructor.name === n);
  const P = window.__perf = { on: false, f: [], t: {}, calls: [], tris: [], heap: [], long: [] };
  const rec = (k, v) => { if (P.on) (P.t[k] ??= []).push(v); };
  const wrap = (o, n, key) => { const orig = o[n].bind(o); o[n] = (...a) => { const t = performance.now(); const r = orig(...a); rec(key, performance.now() - t); return r; }; };
  wrap(g.world, 'update', 'world.update (all systems)');
  const rd = g.world.renderer; const orender = rd.render.bind(rd);
  rd.render = (...a) => { const t = performance.now(); const r = orender(...a); rec('renderer.render (CPU submit)', performance.now() - t); if (P.on) { P.calls.push(rd.info.render.calls); P.tris.push(rd.info.render.triangles); } return r; };
  for (const n of ['HandInputSystem', 'PointerInputSystem', 'LifecycleSystem', 'GameDirectorSystem', 'PresentationSystem']) { const s = sysByName(n); if (s) wrap(s, 'update', n); }
  wrap(g.session, 'tick', 'domain tick');
  let last = 0; const ov = g.view.bind(g); g.view = (...a) => { const now = performance.now(); if (P.on && last) P.f.push(now - last); last = now; return ov(...a); };
  setInterval(() => { if (P.on && performance.memory) P.heap.push(performance.memory.usedJSHeapSize); }, 250);
  try { new PerformanceObserver((l) => { if (P.on) for (const e of l.getEntries()) P.long.push(e.duration); }).observe({ type: 'longtask', buffered: false }); } catch { /* unsupported */ }
  return 'installed';`;

const STATS = `
  const P = window.__perf; const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3); };
  const sum = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = { n: v.length, p50: pct(v, 0.5), p95: pct(v, 0.95), max: +Math.max(...v).toFixed(3) }; return r; };
  const g = __rz, rd = g.world.renderer; const tex = new Set(); let bytes = 0;
  const seen = (m) => { for (const v of Object.values(m)) if (v && v.isTexture && !tex.has(v)) { tex.add(v); const im = v.image; const w = im?.width ?? im?.videoWidth ?? 0, h = im?.height ?? 0; bytes += w * h * 4 * (v.generateMipmaps ? 1.333 : 1); } };
  const scan = (o) => { o.traverse((n) => { const ms = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : []; ms.forEach(seen); }); };
  scan(g.world.scene); scan(g.world.camera);
  const heapDrops = P.heap.filter((v, i) => i && P.heap[i - 1] - v > 512 * 1024).length;
  const dt = P.f; const total = dt.reduce((a, b) => a + b, 0);
  return { frames: dt.length, seconds: +(total / 1000).toFixed(1), fps: dt.length ? +(1000 * dt.length / total).toFixed(1) : null,
    frameMs: { p50: pct(dt, 0.5), p95: pct(dt, 0.95), p99: pct(dt, 0.99), max: dt.length ? +Math.max(...dt).toFixed(1) : null },
    cpuMs: sum(P.t), drawCalls: { p50: pct(P.calls, 0.5), max: P.calls.length ? Math.max(...P.calls) : null }, triangles: { p50: pct(P.tris, 0.5), max: P.tris.length ? Math.max(...P.tris) : null },
    programs: rd.info.programs?.length ?? null, geometries: rd.info.memory.geometries, textures: rd.info.memory.textures, textureObjectsInScene: tex.size, textureMB: +(bytes / 1048576).toFixed(1),
    heapMB: P.heap.length ? { first: +(P.heap[0] / 1048576).toFixed(1), last: +(P.heap[P.heap.length - 1] / 1048576).toFixed(1), max: +(Math.max(...P.heap) / 1048576).toFixed(1) } : null, heapDropsOver512KB: heapDrops,
    longTasks: { n: P.long.length, maxMs: P.long.length ? +Math.max(...P.long).toFixed(0) : 0 } };`;

const window_ = (ms, drive = '') => page(`const P = window.__perf; P.f = []; P.t = {}; P.calls = []; P.tris = []; P.heap = []; P.long = []; P.on = true;
  const g = __rz, s = g.session, sleep = (m) => new Promise(r => setTimeout(r, m)); const t0 = performance.now();
  const until = async (f, m) => { const a = performance.now(); while (!f()) { if (performance.now() - a > m) return false; await sleep(40); } return true; };
  ${drive}
  const left = ${ms} - (performance.now() - t0); if (left > 0) await sleep(left); P.on = false; return (() => { ${STATS} })();`, 100000);

const results = {};
const run = async (name, prep, ms = 8000, drive = '') => {
  if (prep) prep();
  await sleep(1500);
  results[name] = window_(ms, drive);
  const r = results[name];
  console.log(`${name.padEnd(28)} ${String(r.fps).padStart(5)} fps  frame p50 ${r.frameMs.p50} p95 ${r.frameMs.p95} ms  calls ${r.drawCalls.p50}  tris ${r.triangles.p50}  heap ${r.heapMB?.last} MB`);
};

// ---- startup, measured on a cold page load -------------------------------------------------------------------
console.log('page stable after', await stablePage(20000), 'extra reloads');
cliRun(['browser', 'reload']);
const t0 = Date.now(); let startup;
for (let k = 0; k < 120; k++) { try { const v = page('return window.__rz ? { msSincePageLoad: Math.round(performance.now()), nav: Math.round(performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd) } : null'); if (v) { startup = v; break; } } catch { /* loading */ } await sleep(250); }
results.startup = { ...startup, note: 'time from page load to the game object existing, polled every 250 ms (an upper bound), dev server with source modules' };
console.log('startup', JSON.stringify(results.startup));

await ensureImmersive();
console.log(page(INSTALL));
await sleep(1000);

await run('title', () => { page(`const g = __rz; g.command({ type: 'EndSession' }); g.step(0); g.view(0.5, []); return 1`); });
await run('foyer (idle)', () => setup('cp-arrival'));
await run('seam manipulation', () => { setup('cp-arrival'); page(`const g = __rz; g.session.vantage = 'v-foyer-door'; g.placeRig(); g.view(0.016, []); return 1`); }, 10000,
  `g.command({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' }); let u = 0, d = 1; const id = setInterval(() => { u += d * 0.012; if (u >= 1 || u <= 0) d = -d; g.command({ type: 'GripDrag', seam: 'seam-hall', u: Math.max(0, Math.min(1, u)) }); }, 16); await sleep(9500); clearInterval(id); g.command({ type: 'GripRelease', seam: 'seam-hall', role: 'travel', reason: 'forced' });`);
await run('room transition (hops)', () => setup('cp-stairhead'), 12000,
  `for (const v of ['v-foyer-door', 'v-stair-head', 'v-foyer-door', 'v-stair-head', 'v-foyer-door', 'v-stair-head']) { g.requestHop(v); await sleep(1700); }`);
await run('surveyor listening', () => setup('cp-corridor'), 7000);
await run('surveyor approaching', () => setup('cp-corridor'), 14000, `await until(() => s.surveyor.state === 'Approaching', 20000);`);
await run('surveyor encounter (swing)', () => setup('cp-corridor'), 40000,
  `await until(() => s.surveyor.room === 'bridge' && !s.surveyor.crossing, 45000); g.command({ type: 'GripTake', seam: 'seam-bridge', role: 'travel', hand: 'right' }); g.command({ type: 'GripDrag', seam: 'seam-bridge', u: 1 }); await sleep(150); g.command({ type: 'GripRelease', seam: 'seam-bridge', role: 'travel', reason: 'open' });`);
await run('multiple effects (finale)', () => { setup('cp-docked'); }, 16000,
  `g.command({ type: 'GripTake', seam: 'seam-lift', role: 'anchor', hand: 'left' }); g.command({ type: 'GripTake', seam: 'seam-lift', role: 'travel', hand: 'right' }); let u = 0.5, d = 1; const id = setInterval(() => { u += d * 0.01; if (u >= 0.95 || u <= 0.5) d = -d; g.command({ type: 'GripDrag', seam: 'seam-lift', u }); }, 16); await sleep(14000); clearInterval(id); g.command({ type: 'GripRelease', seam: 'seam-lift', role: 'travel', reason: 'forced' });`);
await run('final sequence (ending)', () => { setup('cp-docked'); page(`const g = __rz; g.session.vantage = 'v-zero'; g.placeRig(); g.view(0.016, []); g.command({ type: 'LetterTake', hand: 'right' }); g.command({ type: 'LetterRelease', atSlot: true }); return 1`); }, 30000);

// ---- interaction latency: IWER hand moves; frames until the grip is drawn at the new place --------------------------
setup('cp-arrival'); page(`const g = __rz; g.session.vantage = 'v-foyer-door'; g.placeRig(); g.view(0.016, []); return 1`); parkHands();
results.interactionLatency = page(`const g = __rz, D = window.IWER_DEVICE, Rh = D.hands.right, sleep = (m) => new Promise(r => setTimeout(r, m));
  const st = g.stations.find((x) => x.spec.seam === 'seam-hall'); const o = st.spec.origin; const P = g.world.player;
  Rh.connected = true; Rh.setPinchValueImmediate(0); Rh.position.set(o[0], o[1], o[2] + 0.03); await sleep(400); Rh.setPinchValueImmediate(1); await sleep(600);
  const held = g.session.seams['seam-hall'].phase === 'held'; if (!held) return { error: 'grip not taken', phase: g.session.seams['seam-hall'].phase };
  const out = []; for (let i = 0; i < 12; i++) {
    const before = st.travel.position.x; const target = o[0] + 0.05 + 0.02 * i; const t0 = performance.now(); let frames = 0;
    Rh.position.set(target, o[1], o[2] + 0.03);
    await new Promise((res) => { const f = () => { frames++; if (Math.abs(st.travel.position.x - before) > 1e-4 || frames > 30) return res(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
    out.push({ frames, ms: +(performance.now() - t0).toFixed(1) }); await sleep(250); }
  Rh.setPinchValueImmediate(0); const ms = out.map((x) => x.ms).sort((a, b) => a - b), fr = out.map((x) => x.frames).sort((a, b) => a - b);
  return { samples: out.length, framesMedian: fr[Math.floor(fr.length / 2)], framesMax: fr[fr.length - 1], msMedian: ms[Math.floor(ms.length / 2)], msMax: ms[ms.length - 1], note: 'window.requestAnimationFrame ticks while the XR session is active; ms includes up to one rAF interval of measurement granularity' };`);
console.log('interaction latency', JSON.stringify(results.interactionLatency));
parkHands();

const caps = page(`const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown', gpuTimerQuery: !!gl.getExtension('EXT_disjoint_timer_query_webgl2') || !!gl.getExtension('EXT_disjoint_timer_query'), preciseMemory: typeof performance.memory?.usedJSHeapSize === 'number', userAgent: navigator.userAgent, cores: navigator.hardwareConcurrency };`);
const out = { label, capturedAt: new Date().toISOString(), environment: 'IWER desktop emulator (Quest 3 profile), managed headless Chromium, software or desktop GL. NOT a Quest measurement.', build: label.includes('prod') ? 'production' : 'development server (unbundled source modules)', capabilities: caps, results };
fs.writeFileSync(path.join(root, 'artifacts', `perf-${label}.json`), JSON.stringify(out, null, 2));
console.log(`GPU timer query available: ${caps.gpuTimerQuery}; renderer: ${caps.renderer}`);
console.log(`wrote artifacts/perf-${label}.json`);
