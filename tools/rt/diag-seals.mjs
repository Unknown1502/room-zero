// Do the settings seals fire when a hand merely passes by or carries the letter? Plays the letter step of the chapter
// with IWER hands and reports every settings change. Usage: node tools/rt/diag-seals.mjs  -> console + artifacts/diag-seals.json
import fs from 'node:fs';
import path from 'node:path';
import { ensureImmersive, grabSteps, hand, moveSteps, page, parkHands, releaseSteps, rigPos, root, seq, setup, sleep, stablePage, waitIn } from './lib.mjs';

await stablePage(20000);
await ensureImmersive();
const log = [];
const snap = (label) => { const s = page('return __rz.session.settings'); log.push({ label, settings: s }); console.log(label.padEnd(44), JSON.stringify(s)); };

setup('cp-docked');
page(`const g = __rz; g.session.vantage = 'v-zero'; g.placeRig(); g.view(0.016, []); return 1`);
parkHands(); await sleep(2500);
snap('start (setup sets two/standard/off)');
const edge = () => page(`const g = __rz, e = g.session.edges.find((x) => x.id === 'lift.far|zero.door'); return { e: e && { locked: e.locked, suspended: e.suspended, player: e.player }, reach: g.session.reachable(), seams: Object.fromEntries(Object.entries(g.session.seams).map(([k, v]) => [k, v.phase + ':' + v.committed])) }`);
console.log('edge at v-zero start', JSON.stringify(edge()));
page(`const g = __rz; g.session.vantage = 'v-lift'; g.placeRig(); g.view(0.016, []); return 1`); await sleep(1500);
console.log('edge at v-lift +1.5 s', JSON.stringify(edge())); await sleep(6000);
console.log('edge at v-lift +7.5 s', JSON.stringify(edge()));
page(`const g = __rz; g.session.vantage = 'v-zero'; g.placeRig(); g.view(0.016, []); return 1`); await sleep(1500);

// A resting hand where a seated player's left hand rests, near the letter's strap position.
const letterAt = rigPos('__rz.letter');
snap('letter at ' + letterAt.map((v) => v.toFixed(2)).join(','));
seq(hand('left'), [...moveSteps([[letterAt[0] + 0.02, letterAt[1] + 0.02, letterAt[2]]], 0.6), { label: 'rest 3 s next to the letter', duration: 3 }]);
snap('left hand rested at the letter');
parkHands();

// The chapter's own letter step.
const slot = rigPos('__rz.built.pigeonhole');
seq(hand('right'), grabSteps(letterAt));
waitIn(`__rz.session.letter === 'held'`, 4000, 'letter held');
snap('letter taken');
seq(hand('right'), [...moveSteps([[slot[0] * 0.5 + letterAt[0] * 0.5, slot[1], slot[2] * 0.5 + letterAt[2] * 0.5], slot], 0.9), { label: 'hold at pigeonhole 0', duration: 0.5 }, ...releaseSteps(0.3)]);
snap('letter released at the pigeonhole');
waitIn(`__rz.session.letter === 'delivered'`, 6000, 'delivered');
parkHands(); await sleep(3000);
snap('after delivery, hands parked');
fs.writeFileSync(path.join(root, 'artifacts', 'diag-seals.json'), JSON.stringify(log, null, 2));
