// Technical audit of every generated sound: format, duration, level, clipping, silence, DC offset, and which game events use it.
// This is analysis of the files, NOT listening: nothing here says how a sound sounds. Usage: node tools/audio-audit.mjs
// -> qa/experience-polish/reports/audio-audit.json and .md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'audio');
const outDir = path.join(root, 'qa', 'experience-polish', 'reports');
fs.mkdirSync(outDir, { recursive: true });
const src = fs.readFileSync(path.join(root, 'src', 'app', 'game.ts'), 'utf8');
const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const uses = (name) => {
  const rx = new RegExp(`(play|playAt|setLoop|loopAt)\\(\\s*'${name}'`, 'g');
  const lines = [];
  src.split('\n').forEach((l, i) => { if (rx.test(l)) lines.push(i + 1); rx.lastIndex = 0; });
  const named = new RegExp(`'${name}'`).test(src);
  return { calls: lines.length, lines: lines.slice(0, 6), mentioned: named };
};

const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.wav')).sort()) {
  const b = fs.readFileSync(path.join(dir, f));
  const ok = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE';
  const channels = b.readUInt16LE(22), rate = b.readUInt32LE(24), bits = b.readUInt16LE(34);
  let off = 12, dataAt = 0, dataLen = 0;
  while (off + 8 <= b.length) { const id = b.toString('ascii', off, off + 4), n = b.readUInt32LE(off + 4); if (id === 'data') { dataAt = off + 8; dataLen = n; break; } off += 8 + n; }
  const n = Math.floor(dataLen / 2 / channels);
  let peak = 0, sumSq = 0, sum = 0, clipped = 0;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = b.readInt16LE(dataAt + i * 2 * channels) / 32768; s[i] = v; const a = Math.abs(v); if (a > peak) peak = a; sumSq += v * v; sum += v; if (a >= 0.999) clipped++; }
  const thresh = Math.pow(10, -50 / 20);
  let lead = 0; while (lead < n && Math.abs(s[lead]) < thresh) lead++;
  let tail = 0; while (tail < n && Math.abs(s[n - 1 - tail]) < thresh) tail++;
  // loop seam: jump between the last and first sample, relative to peak (a click when a loop restarts)
  const seam = n > 1 ? Math.abs(s[n - 1] - s[0]) : 0;
  const name = f.replace(/\.wav$/, '');
  const u = uses(name);
  const issues = [];
  if (!ok || bits !== 16) issues.push('not 16-bit PCM WAV');
  if (n === 0 || peak === 0) issues.push('empty or silent file');
  if (clipped > 0) issues.push(`${clipped} clipped samples`);
  if (db(peak) > -0.5) issues.push(`peak ${db(peak).toFixed(1)} dBFS (very hot)`);
  if (lead / rate > 0.15) issues.push(`${(lead / rate).toFixed(2)} s of silence at the start`);
  if (Math.abs(sum / n) > 0.01) issues.push(`DC offset ${(sum / n).toFixed(3)}`);
  if (!u.mentioned) issues.push('never referenced by the game');
  rows.push({ name, bytes: b.length, format: `${bits}-bit ${rate} Hz ${channels === 1 ? 'mono' : channels + ' ch'}`, seconds: +(n / rate).toFixed(2), peakDb: +db(peak).toFixed(1), rmsDb: +db(Math.sqrt(sumSq / n)).toFixed(1), clipped, leadSilenceS: +(lead / rate).toFixed(2), tailSilenceS: +(tail / rate).toFixed(2), loopSeamJump: +seam.toFixed(3), dc: +(sum / n).toFixed(4), gameCalls: u.calls, gameLines: u.lines, referenced: u.mentioned, issues });
}
const total = rows.reduce((a, r) => a + r.bytes, 0);
const flagged = rows.filter((r) => r.issues.length);
const levels = rows.map((r) => r.rmsDb).filter(Number.isFinite);
const spread = Math.max(...levels) - Math.min(...levels);
fs.writeFileSync(path.join(outDir, 'audio-audit.json'), JSON.stringify({ capturedAt: new Date().toISOString(), note: 'File analysis only. Not auditioned by a person or by the assistant: no playback capability was used.', files: rows.length, totalBytes: total, rmsSpreadDb: +spread.toFixed(1), flagged: flagged.map((r) => ({ name: r.name, issues: r.issues })), rows }, null, 2));
let md = `# Audio audit (file analysis only)\n\n**Auditioned by a person: no. Auditioned by the assistant: no (no audio playback was available or used).** Everything below is measured from the WAV files. Nothing says how any sound sounds.\n\n${rows.length} files, ${(total / 1024).toFixed(0)} KB, RMS spread across files ${spread.toFixed(1)} dB.\n\n| Sound | Format | s | Peak dBFS | RMS dBFS | Clipped | Lead silence s | Game calls (lines) | Flags |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) md += `| ${r.name} | ${r.format} | ${r.seconds} | ${r.peakDb} | ${r.rmsDb} | ${r.clipped} | ${r.leadSilenceS} | ${r.gameCalls} (${r.gameLines.join(', ')}) | ${r.issues.join('; ') || 'none'} |\n`;
fs.writeFileSync(path.join(outDir, 'audio-audit.md'), md);
console.log(`${rows.length} files; flagged ${flagged.length}; RMS spread ${spread.toFixed(1)} dB`);
for (const r of flagged) console.log(`  ${r.name}: ${r.issues.join('; ')}`);
