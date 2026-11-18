// Runs chosen RT rows several times and keeps the counts, so a result can be reported as "k of n".
// Usage: node tools/rt/repeat-rt.mjs <times> RT-02 RT-05 ...   -> artifacts/rt-repeats.json (written after every pass)
// Note: run-rt.mjs also merges the latest result of each row into artifacts/rt-matrix.json; the counts here are the record.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const times = Number(process.argv[2] ?? 3);
const ids = process.argv.slice(3);
const out = path.join(root, 'artifacts', 'rt-repeats.json');
const tally = Object.fromEntries(ids.map((id) => [id, { pass: 0, fail: 0, results: [] }]));
for (let n = 1; n <= times; n++) {
  const r = spawnSync('node', [path.join('tools', 'rt', 'run-rt.mjs'), ...ids], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const text = (r.stdout ?? '') + (r.stderr ?? '');
  for (const id of ids) {
    const m = text.match(new RegExp(`^(Pass|Fail|Blocked)\\s+${id}\\b`, 'm'));
    const res = m ? m[1] : 'no result';
    tally[id].results.push(res);
    if (res === 'Pass') tally[id].pass++; else tally[id].fail++;
  }
  fs.writeFileSync(out, JSON.stringify({ capturedAt: new Date().toISOString(), environment: 'IWER desktop emulator', passes: n, of: times, tally }, null, 2));
  console.log(`pass ${n}/${times}: ${ids.map((id) => `${id}=${tally[id].results[n - 1]}`).join(' ')}`);
}
console.log('wrote artifacts/rt-repeats.json');
