// Visual QA capture: puts the running game (IWER session, managed Playwright browser) into named states and screenshots each.
// Preconditions (a checkpoint, a vantage) are set through the game's own checkpoint replay and rig placement and are recorded
// beside each shot; the action shown in a shot is never faked. Head is turned forward only so the shot shows what a seated
// player faces. Usage: node tools/qa/capture-states.mjs <before|after>   -> qa/visual-audit/<phase>/*.png and <phase>.json
import fs from 'node:fs';
import path from 'node:path';
import { cliRun, ensureImmersive, page, parkHands, rigPos, root, setup, sleep, stablePage, waitIn, xr } from '../rt/lib.mjs';

const phase = process.argv[2] ?? 'before';
const only = process.argv.slice(3);
const base = process.env.QA_DIR ?? 'visual-audit';
const dir = path.join(root, 'qa', base, phase);
fs.mkdirSync(dir, { recursive: true });
const shots = [];
const snap = (id, title, steps) => {
  if (only.length && !only.some((o) => id.startsWith(o))) return;
  const file = path.join(dir, `${id}.png`);
  cliRun(['browser', 'screenshot', '--output-file', file]);
  shots.push({ id, title, steps, file: path.relative(root, file).replace(/\\/g, '/') });
  console.log('shot', id);
  if (only.length && only.every((o) => shots.some((s) => s.id.startsWith(o)))) finish(); // a partial run stops once it has what it asked for
};
const look = (pitch = -8, yaw = 0) => xr('set-transform', { device: 'headset', orientation: { pitch, yaw, roll: 0 } });
const goto = (v) => page(`const g = __rz; g.session.vantage = ${JSON.stringify(v)}; g.placeRig(); g.view(0.016, []); g.fade = g.fadeTarget = 0; return g.session.vantage;`);
const rest = async (ms = 900) => { await sleep(ms); };

await stablePage(15000);
// ---- 1 startup page (desktop view of the page and the preview behind it) -------------------------------------------
snap('01-startup-page', 'Page before entering VR (desktop view of the page and the 3D preview behind it)', ['load the page, wait until it is stable']);
const startup = page(`return { status: document.getElementById('status').textContent, enter: !document.getElementById('enter').disabled }`);

await ensureImmersive(); await sleep(1500); parkHands();
page(`window.__errs = []; if (!window.__errWrapped) { window.__errWrapped = true; const o = console.error.bind(console); console.error = (...a) => { window.__errs.push(a.map((x) => String(x && x.stack ? x.stack : x)).join(' ').slice(0, 200)); o(...a); }; window.addEventListener('error', (e) => window.__errs.push('window error: ' + String(e.message).slice(0, 160))); } return 1`);

// ---- 2 title in VR ----------------------------------------------------------------------------------------------------
page(`const g = __rz; g.command({ type: 'EndSession' }); g.step(0); g.view(0.5, []); return 1`); look(-12); await rest(1500);
snap('02-xr-title', 'Title in VR: the envelope, the begin seal', ['enter the session', 'EndSession to the title', 'face forward']);
look(-50); await rest();
snap('03-xr-title-letter', 'Title in VR looking down at the letter and seals', ['title', 'look down']);

// ---- 3 first room and the letter ---------------------------------------------------------------------------------------
setup('cp-arrival'); look(-8); await rest(1500);
snap('04-foyer-start', 'First playable view: the Entrance Hall seat', ['checkpoint cp-arrival', 'face forward']);
look(-55); await rest();
snap('05-letter-settings-seals', 'The letter at the chest with the four settings seals', ['cp-arrival', 'look down at the letter']);
look(-8);

// ---- 4 every vantage, final configuration -------------------------------------------------------------------------------
const vantages = page('return __rz.content.vantages.map((v) => v.id)');
setup('cp-docked'); await rest(1200);
vantages.forEach(() => {});
for (const [i, v] of vantages.entries()) {
  goto(v); look(-8); await rest(900);
  snap(`10-vantage-${String(i + 1).padStart(2, '0')}-${v}`, `Seat ${v} (final house configuration)`, ['checkpoint cp-docked (every seam in its final place)', `rig placed at ${v}`, 'face forward']);
}

// ---- 5 closed and open seam, grips and a hand on a grip -----------------------------------------------------------------
setup('cp-arrival'); goto('v-foyer-door'); look(-14); await rest(1200);
snap('20-seam-hall-closed', 'Foyer door seat, seam-hall not yet moved (doorway closed, grips at rest)', ['cp-arrival', 'v-foyer-door']);
const grip = rigPos(`__rz.stations.find((s) => s.spec.seam === 'seam-hall').travel`);
xr('set-hand-pose', { device: 'hand-right', poseId: 'pinch' });
xr('set-transform', { device: 'hand-right', position: { x: grip[0], y: grip[1], z: grip[2] }, anchor: 'grasp' });
await rest(900);
snap('21-hand-on-grip', 'A hand on the seam-hall grip (the affordance a player reaches for)', ['cp-arrival', 'v-foyer-door', 'right hand placed on the travel grip']);
parkHands(); xr('set-hand-pose', { device: 'hand-right', poseId: 'default' });
setup('cp-stairhead'); goto('v-foyer-door'); look(-14); await rest(1200);
snap('22-seam-hall-open', 'Foyer door seat after seam-hall is seated (doorway joined, next lamp lit)', ['cp-stairhead (seam-hall seated)', 'v-foyer-door']);

setup('cp-stairhead'); goto('v-stair-head'); look(-14); await rest(1500);
snap('23-stair-head-brace', 'Stair head seat, seam-landing not yet moved (the first seam that needs a brace hand)', ['cp-stairhead', 'v-stair-head']);

// ---- 6 Surveyor ----------------------------------------------------------------------------------------------------------
setup('cp-corridor'); goto('v-cwest-end'); look(-4); await rest(900);
snap('30-corridor-armed', 'West corridor end, Surveyor armed but not yet seen', ['cp-corridor', 'v-cwest-end']);
page(`const g = __rz; g.command({ type: 'GripTake', seam: 'seam-bridge', role: 'travel', hand: 'right' }); return g.session.surveyor.state`);
let seen = true; try { waitIn(`__rz.session.surveyor.room === 'c-east' && !__rz.session.surveyor.crossing`, 70000, 'Surveyor in the East Corridor'); } catch { seen = false; }
look(-4); await rest(1200);
snap('31-surveyor-east-corridor', `Surveyor in the East Corridor, seen from the west end${seen ? '' : ' (NOT reached within 70 s)'}`, ['cp-corridor', 'v-cwest-end', 'bridge lever taken so the Surveyor wakes', 'wait until it stands in c-east']);
page(`const g = __rz; g.command({ type: 'GripDrag', seam: 'seam-bridge', u: 1 }); return 1`); await sleep(300);
page(`const g = __rz; g.command({ type: 'GripRelease', seam: 'seam-bridge', role: 'travel', reason: 'open' }); return 1`);
try { waitIn(`__rz.session.surveyor.crossing || __rz.session.surveyor.room === 'bridge' || __rz.session.surveyor.room === 'dead-letter'`, 20000, 'Surveyor turns to the new joint'); } catch { /* reported by the picture */ }
await rest(600);
snap('32-surveyor-new-joint', 'After the bridge swing: the Surveyor turning to the new joint', ['as 31', 'bridge swung to the office and released']);

// ---- 7 final puzzle and ending --------------------------------------------------------------------------------------------
setup('cp-east'); goto('v-ceast-end'); look(-14); await rest(1200);
snap('40-final-station', 'East corridor end: the lift and the crane arm (final puzzle station)', ['cp-east', 'v-ceast-end']);
setup('cp-docked'); goto('v-zero'); look(-10); await rest(1200);
snap('41-room-zero', 'Room Zero', ['cp-docked', 'v-zero']);
page(`const g = __rz; g.command({ type: 'LetterTake', hand: 'right' }); g.command({ type: 'LetterRelease', atSlot: true }); return g.session.letter`);
try { waitIn(`__rz.session.ending && __rz.session.ending.step >= 3`, 40000, 'card'); } catch { /* reported by the picture */ }
look(-30); await rest(1200);
snap('42-ending-card', 'The card: You are the return address', ['cp-docked', 'v-zero', 'letter placed in pigeonhole 0 through the game command']);
try { waitIn(`__rz.session.game === 'ChapterComplete'`, 60000, 'ChapterComplete'); } catch { /* reported by the picture */ }
look(-12); await rest(1500);
snap('43-chapter-complete', 'Chapter complete: begin again or leave', ['as 42', 'wait for ChapterComplete']);

// ---- 8 settings, pause, failure, no hands --------------------------------------------------------------------------------
setup('cp-landing', { snapTurn: 30 }); look(-8); await rest(1200);
snap('50-snap-turn-markers', 'Snap turn on: the turn markers', ['cp-landing', 'snap turn set to 30 degrees']);
setup('cp-landing'); look(-8);
page(`const g = __rz; g.command({ type: 'SetVisibility', visible: false }); g.step(0); g.view(0.05, []); return g.session.game`); await rest(900);
snap('51-pause', 'Paused (session hidden)', ['cp-landing', 'visibility hidden']);
page(`const g = __rz; g.command({ type: 'SetVisibility', visible: true }); g.step(0); g.view(0.05, []); return g.session.game`);
setup('cp-landing'); look(-8);
page(`const g = __rz; window.__origTick = g.session.tick; g.session.tick = () => { throw new Error('QA injected failure'); }; return 1`);
try { waitIn('__rz.failed', 6000, 'error boundary'); } catch { /* reported by the picture */ }
look(-6); await rest(1500);
snap('52-error-card', 'Error card after an injected tick failure', ['cp-landing', 'session tick made to throw']);
page(`const g = __rz; delete g.session.tick; delete window.__origTick; g.restart(); g.step(0); g.view(2.1, []); return 1`);
setup('cp-landing'); look(-8);
for (const d of ['hand-left', 'hand-right']) xr('set-connected', { device: d, connected: false });
try { waitIn('__rz.handsCard.visible', 12000, 'no-hands card'); } catch { /* reported by the picture */ }
look(-4); await rest(900);
snap('53-no-hands-card', 'No tracked hands for 5 s: the NO HANDS FOUND card', ['cp-landing', 'both hands disconnected']);
for (const d of ['hand-left', 'hand-right']) xr('set-connected', { device: d, connected: true });
await sleep(800);

finish();

// ---- console and network -------------------------------------------------------------------------------------------------
function finish() {
  const errs = page('return window.__errs.slice()');
  const failedRes = page(`return performance.getEntriesByType('resource').filter((r) => r.responseStatus >= 400).map((r) => r.name + ' ' + r.responseStatus)`);
  fs.writeFileSync(path.join(root, 'qa', base, only.length ? `${phase}-partial.json` : `${phase}.json`), JSON.stringify({ capturedAt: new Date().toISOString(), environment: 'IWER Quest 3 emulator, managed Chromium (Playwright), desktop', phase, startup, consoleErrors: errs, failedResources: failedRes, shots }, null, 2));
  console.log(`wrote ${shots.length} shots; console errors ${errs.length}; failed resources ${failedRes.length}`);
  process.exit(0);
}
