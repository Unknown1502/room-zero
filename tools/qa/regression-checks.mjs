// Numeric regression checks for the defects found by visual QA (qa/visual-audit/report.md), run against the live IWER page.
// Each check fails on the pre-fix code. Usage: node tools/qa/regression-checks.mjs  -> qa/visual-audit/regression-results.json
import fs from 'node:fs';
import path from 'node:path';
import { ensureImmersive, page, parkHands, root, setup, sleep, stablePage } from '../rt/lib.mjs';

const results = [];
const check = (id, name, ok, detail) => { results.push({ id, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name} - ${detail}`); };

// V1: on the flat page (no XR session) the headset-only letter and seals are hidden; in the session they are shown.
await stablePage(15000);
const flat = page(`const g = __rz; g.step(0); g.view(0.05, []); return { session: !!g.world.session, letter: g.letter.visible, seals: [...g.seals.values()].some((s) => s.mesh.visible) }`);
check('V1', 'flat page: letter and seals hidden', !flat.session && !flat.letter && !flat.seals, JSON.stringify(flat));
await ensureImmersive(); await sleep(1500); parkHands();
const inXr = page(`const g = __rz; g.command({ type: 'EndSession' }); g.step(0); g.view(0.5, []); return { session: !!g.world.session, letter: g.letter.visible, begin: g.seals.get('begin').mesh.visible }`);
check('V1', 'in the session at the title: letter and begin seal shown', inXr.session && inXr.letter && inXr.begin, JSON.stringify(inXr));

// V2 and V3 at Room Zero
setup('cp-docked');
const zero = page(`const g = __rz; g.session.vantage = 'v-zero'; g.placeRig(); g.view(0.016, []); g.fade = g.fadeTarget = 0;
  const T = g.built.titleCard, C = g.built.card, V = T.position.constructor, Q = T.quaternion.constructor;
  g.built.titleCard.visible = true; g.world.scene.updateMatrixWorld(true);
  const pos = T.getWorldPosition(new V()), q = T.getWorldQuaternion(new Q()), n = new V(0, 0, 1).applyQuaternion(q);
  const head = g.world.camera.getWorldPosition(new V()); const dir = head.sub(pos).normalize();
  const cv = C.material.map.image, cx = cv.getContext('2d'), d = cx.getImageData(0, 0, cv.width, cv.height).data;
  let min = 255, max = 0; for (let i = 0; i < d.length; i += 4) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; if (l < min) min = l; if (l > max) max = l; }
  return { facing: +n.dot(dir).toFixed(3), upright: +Math.abs(n.y).toFixed(3), cardWidth: C.geometry.parameters.width, ink: Math.round(min), paper: Math.round(max) }`);
check('V2', 'closing title card is upright and faces the seat', zero.facing > 0.7 && zero.upright < 0.3, `facing ${zero.facing}, |normal.y| ${zero.upright}`);
check('V3', 'ending card is at least 0.3 m wide with dark ink on light paper', zero.cardWidth >= 0.3 && zero.ink < 70 && zero.paper > 200, `width ${zero.cardWidth}, ink ${zero.ink}, paper ${zero.paper}`);

// V4: nothing is drawn on the error card under the RETRY seal
const err = page(`const g = __rz, cv = g.errorCard.material.map.image, cx = cv.getContext('2d');
  const sw = 512 * (0.052 / 0.46), sh = 256 * (0.052 / 0.28); const cxp = 256, cyp = 128 + (0.084 / 0.28) * 256;
  const d = cx.getImageData(Math.round(cxp - sw), Math.round(cyp - sh), Math.round(2 * sw), Math.round(2 * sh)).data;
  let bright = 0; for (let i = 0; i < d.length; i += 4) if (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] > 110) bright++;
  return { bright, area: [Math.round(2 * sw), Math.round(2 * sh)] }`);
check('V4', 'error card: no text pixels under the RETRY seal', err.bright === 0, `bright pixels under the seal: ${err.bright} (area ${err.area.join('x')})`);

// V5: the lift's port wall is not on the plane Room Zero docks against
const lift = page(`const g = __rz, m = g.built.modules.get('lift'); return m.children.filter((c) => c.isMesh && Math.abs(Math.abs(c.position.z) - 2) < 0.02 && c.geometry.type === 'ShapeGeometry').map((c) => +c.position.z.toFixed(3))`);
check('V5', 'lift port wall is 1 cm off the docking plane', lift.length === 1 && Math.abs(lift[0] + 2) >= 0.005, `port wall z: ${JSON.stringify(lift)}`);

// V8: a seam that joins something makes the newly reachable lamp pulse; a plain hop does not
setup('cp-arrival'); parkHands();
const pulse = page(`const g = __rz, s = g.session, sleep = (m) => new Promise((r) => setTimeout(r, m));
  const until = async (f, ms) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await sleep(30); } return true; };
  g.requestHop('v-foyer-door'); await until(() => s.vantage === 'v-foyer-door' && g.fade < 0.05, 6000); g.lampPulse.clear(); await sleep(300); // a real hop, so the game knows where the player is
  const none = g.lampPulse.size;
  g.command({ type: 'GripTake', seam: 'seam-hall', role: 'travel', hand: 'right' }); g.command({ type: 'GripDrag', seam: 'seam-hall', u: 1 }); await sleep(200);
  g.command({ type: 'GripRelease', seam: 'seam-hall', role: 'travel', reason: 'open' });
  const rested = await until(() => s.seams['seam-hall'].committed === 1 && s.seams['seam-hall'].phase === 'rest', 6000); await sleep(150);
  const after = g.lampPulse.get('v-stair-head') ?? 0; g.lampPulse.clear();
  g.requestHop('v-stair-head'); await until(() => s.vantage === 'v-stair-head' && g.fade < 0.05, 6000); await sleep(200);
  return { none, rested, after: +after.toFixed(2), afterHop: g.lampPulse.size };`);
check('V8', 'seam joins: the new lamp pulses; a hop starts no pulse', pulse.none === 0 && pulse.rested && pulse.after > 1 && pulse.afterHop === 0, JSON.stringify(pulse));

// V9 and V10: rooms have their own wall colour; the Surveyor's ring glows and the shared brass does not
const look = page(`const g = __rz; const wallColour = (id) => { let c; g.built.modules.get(id).traverse((o) => { if (o.isMesh && o.material && o.material.map && o.material.roughness === 0.95 && o.material.color.getHex() !== 0xffffff && !c && o.name === 'merged-static') c = o.material.color.getHex(); }); return c; };
  let brass; g.built.modules.get('foyer').traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x7a6233) brass = o.material; });
  return { foyer: wallColour('foyer'), east: wallColour('c-east'), ring: g.figure.ring.material.emissive.getHex() === 0 ? 0 : g.figure.ring.material.emissiveIntensity,brassEmissive: brass ? brass.emissive.getHex() : null };`);
check('V9', 'rooms have different wall colours (foyer warm, east corridor cold)', look.foyer !== undefined && look.east !== undefined && look.foyer !== look.east, JSON.stringify({ foyer: look.foyer?.toString(16), east: look.east?.toString(16) }));
check('V10', "the Surveyor's ring glows; the shared brass does not", look.ring > 0.5 && look.brassEmissive === 0, JSON.stringify({ ring: look.ring, brassEmissive: look.brassEmissive }));

fs.writeFileSync(path.join(root, 'qa', 'visual-audit', 'regression-results.json'), JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2));
const bad = results.filter((r) => !r.ok).length;
console.log(`${results.length - bad} passed, ${bad} failed`);
process.exitCode = bad ? 1 : 0;
