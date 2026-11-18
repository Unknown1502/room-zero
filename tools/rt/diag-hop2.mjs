// Why does a ray hop right after a scripted seam move lose its first press? Moves seam-hall with both hands as the chapter
// does, then tries the hop with growing "reset" variants until one works. Usage: node tools/rt/diag-hop2.mjs
import { ensureImmersive, grabSteps, hand, moveSteps, page, parkHands, pointAndPinch, rail, releaseSteps, seq, setup, sleep, specs, stablePage, waitIn, xr } from './lib.mjs';

await stablePage(15000);
await ensureImmersive();
setup('cp-arrival'); parkHands(); await sleep(1500);
const all = specs();
page(`const g = __rz; window.__hopCalls = []; if (!window.__hopWrapped) { window.__hopWrapped = true; const o = g.requestHop.bind(g); g.requestHop = (v) => { window.__hopCalls.push({ v, fade: +g.fade.toFixed(3), reachable: g.session.reachable().includes(v) }); return o(v); }; } return 1`);
// Inside the game: every beacon press the SDK reports, and what the near-grip rule answered.
page(`const g = __rz; window.__seen = []; const H = g.world.systems.find((x) => x.constructor.name === 'HandInputSystem'), Pt = g.world.systems.find((x) => x.constructor.name === 'PointerInputSystem');
  if (!window.__ngWrapped) { window.__ngWrapped = true; const o = H.nearGrip.bind(H); H.nearGrip = (gg) => { const r = o(gg); window.__seen.push({ ev: 'nearGrip', r, hands: H.hands.map((h) => ({ p: h.pinch, hold: !!h.hold })) }); return r; };
    Pt.queries.beacons.subscribe('qualify', (e) => window.__seen.push({ ev: 'Pressed on a beacon', entity: e.index })); } return 1`);
const worked = (v) => { try { waitIn(`__rz.session.vantage === '${v}' && __rz.fade < 0.05`, 4000, v); return true; } catch { return false; } };
const calls = () => page('return window.__hopCalls.splice(0)');
const tryHop = (label, v) => { page('window.__hopCalls.length = 0; window.__seen.length = 0; return 1'); pointAndPinch(process.env.RZ_SIDE === 'left' && label.startsWith('A') ? 'left' : 'right', `__rz.beacons.get('${v}').glass`); const ok = worked(v); console.log(`${label.padEnd(46)} ${ok ? 'HOP OK' : 'no hop'}  requestHop calls: ${JSON.stringify(calls())}  game saw: ${JSON.stringify(page('return window.__seen.slice(0, 6)'))}`); return ok; };

// Distance from the point where the test's right hand points from, to the nearest grip of this vantage. The game ignores a pinch within 0.2 m of a grip (NEAR_GRIP).
const gripDist = () => page(`const g = __rz, P = g.world.player, V = P.position.constructor; const o = P.localToWorld(new V(0.22, 1.3, -0.3)); const t = new V();
  return g.stations.filter((st) => st.spec.vantage === g.session.vantage).map((st) => ({ seam: st.spec.seam, travel: +st.travel.getWorldPosition(t).distanceTo(o).toFixed(3), anchor: st.anchor ? +st.anchor.getWorldPosition(t).distanceTo(o).toFixed(3) : null }))`);
console.log('hop 1 to foyer door (hands parked first):', tryHop('hop to v-foyer-door', 'v-foyer-door'));
console.log('grip distances from the pointing hand BEFORE the seam move:', JSON.stringify(gripDist()));
// the chapter's seam move
const r = rail(all, 'seam-hall', 'v-foyer-door');
parkHands();
seq(hand('right'), [...grabSteps(r.at(0)), ...moveSteps([r.at(1)], 0.8), ...releaseSteps(0.25)]);
waitIn(`__rz.session.seams['seam-hall'].committed === 1 && __rz.session.seams['seam-hall'].phase === 'rest'`, 8000, 'seam seated');
const settle = Number(process.env.SETTLE_MS ?? 0);
if (settle) await sleep(settle);
console.log(`seam-hall seated; waited ${settle} ms; now the hop with no reset in between`);
console.log('grip distances from the pointing hand AFTER the seam move:', JSON.stringify(gripDist()));
if (process.env.RZ_FLUSH) { xr('set-transform', { device: hand('right'), position: { x: 0.25, y: 1.0, z: -0.15 } }); xr('select', { device: hand('right') }); await sleep(500); console.log('flush select sent (hand at rest)'); }
const pose = process.env.RZ_POSE;
if (pose) { xr('set-hand-pose', { device: hand('right'), poseId: pose }); await sleep(400); console.log(`right hand pose set to ${pose} before pointing`); }
if (!tryHop('A: plain pointAndPinch right after the seam', 'v-stair-head')) {
  if (!tryHop('B: the same again, nothing changed in between', 'v-stair-head')) {
    parkHands();
    tryHop('D: + parkHands (both)', 'v-stair-head');
  }
}
