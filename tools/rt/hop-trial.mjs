// Ray-hop reliability trial under IWER: first-attempt success counts, with and without a hover before the pinch.
// Usage: node tools/rt/hop-trial.mjs [hoverMs ...]   (default 0 400)   -> artifacts/hop-trial.json (written after every block)
// IWER evidence only. For every attempt it records whether the game's requestHop was even called (the ray press arrived)
// and, if so, why the gate said no. A failed attempt is retried until it works, and counted.
import fs from 'node:fs';
import path from 'node:path';
import { ensureImmersive, page, parkHands, pointAndPinch, root, setup, sleep, stablePage, waitIn } from './lib.mjs';

const hovers = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
if (!hovers.length) hovers.push(0, 400);
const route = ['v-lift', 'v-zero', 'v-lift', 'v-ceast-end'];
const N = 24;
const out = [];

for (const hover of hovers) {
  await stablePage(15000);
  await ensureImmersive();
  setup('cp-docked');
  page(`const g = __rz; g.session.vantage = 'v-ceast-end'; g.placeRig(); g.view(0.016, []); g.fade = g.fadeTarget = 0;
    window.__hopCalls = []; if (!window.__hopWrapped) { window.__hopWrapped = true; const o = g.requestHop.bind(g);
      g.requestHop = (v) => { window.__hopCalls.push({ v, fade: +g.fade.toFixed(3), pending: !!g.pending, reachable: g.session.reachable().includes(v) }); return o(v); }; } return 1`);
  parkHands(); await sleep(1500);
  const rows = []; let first = 0;
  for (let i = 0; i < N; i++) {
    const to = route[i % route.length];
    const from = page('return __rz.session.vantage');
    let tries = 0; let moved = false; const calls = [];
    while (!moved && tries < 4) {
      tries++;
      page('window.__hopCalls.length = 0; return 1');
      pointAndPinch('right', `__rz.beacons.get('${to}').glass`, hover);
      try { waitIn(`__rz.session.vantage === '${to}' && __rz.fade < 0.02`, 3500, to); moved = true; } catch { /* retry */ }
      calls.push(page('return window.__hopCalls.slice()'));
      if (!moved) { parkHands(); await sleep(600); }
    }
    if (moved && tries === 1) first++;
    rows.push({ i, from, to, tries, moved, requestHopCalls: calls });
    parkHands(); await sleep(400);
  }
  out.push({ hoverMs: hover, attempts: N, firstAttemptOk: first, rows });
  console.log(`hover ${hover} ms: ${first}/${N} first-attempt hops moved the player`);
  fs.writeFileSync(path.join(root, 'artifacts', 'hop-trial.json'), JSON.stringify({ capturedAt: new Date().toISOString(), environment: 'IWER desktop emulator', out }, null, 2));
}
console.log('wrote artifacts/hop-trial.json');
