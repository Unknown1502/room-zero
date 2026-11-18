// N fresh-profile, hands-only, full-chapter playthroughs under IWER. Each starts with empty site storage (no save, no settings).
// A run that fails is recorded as failed, with the reason, and the next one still runs. Usage: node tools/rt/playthroughs.mjs [N]
// -> artifacts/playthroughs.json (written after every run)
import fs from 'node:fs';
import path from 'node:path';
import { ensureImmersive, page, parkHands, root, sleep, stablePage } from './lib.mjs';
import { playChapter } from './chapter.mjs';

const N = Number(process.argv[2] ?? 3);
const out = path.join(root, 'artifacts', 'playthroughs.json');
const runs = [];
for (let i = 1; i <= N; i++) {
  const rec = { run: i, startedAt: new Date().toISOString() };
  try {
    page(`localStorage.clear(); sessionStorage.clear(); return 1`);
    await stablePage(15000); // reload: the game boots with nothing stored
    const stored = page(`return Object.keys(localStorage).filter((k) => k.startsWith('rz.'))`);
    rec.storedKeysAtStart = stored;
    await ensureImmersive(); await sleep(1500); parkHands();
    page(`window.__errs = []; if (!window.__errWrapped) { window.__errWrapped = true; const o = console.error.bind(console); console.error = (...a) => { window.__errs.push(a.map((x) => String(x && x.stack ? x.stack : x)).join(' ').slice(0, 200)); o(...a); }; window.addEventListener('error', (e) => window.__errs.push('window error: ' + String(e.message).slice(0, 160))); } return 1`);
    const r = await playChapter({ log: () => {} });
    rec.result = 'completed';
    rec.seconds = r.seconds; rec.endGame = r.end.game; rec.postmarks = r.end.postmarks; rec.objectives = r.end.solved.length; rec.catches = r.end.catches; rec.settingsAtEnd = r.end.settings;
    rec.interactionFailures = r.failures.map((f) => `${f.label}: ${f.note}`.slice(0, 140));
    rec.consoleErrors = page('return window.__errs.slice()');
    if (r.end.game !== 'ChapterComplete' || r.end.solved.length !== 5) rec.result = 'ended without the full chapter';
  } catch (e) { rec.result = 'failed'; rec.reason = String(e.message).slice(0, 600); }
  rec.finishedAt = new Date().toISOString();
  runs.push(rec);
  fs.writeFileSync(out, JSON.stringify({ environment: 'IWER desktop emulator, hands only, fresh profile (storage cleared and page reloaded before each run)', runs }, null, 2));
  console.log(`run ${i}/${N}: ${rec.result}${rec.seconds ? ` in ${rec.seconds} s, caught ${rec.catches}, ${rec.interactionFailures.length} retried interactions, ${rec.consoleErrors.length} console errors` : ` ${rec.reason ?? ''}`}`);
}
console.log(`wrote artifacts/playthroughs.json: ${runs.filter((r) => r.result === 'completed').length}/${N} completed`);
