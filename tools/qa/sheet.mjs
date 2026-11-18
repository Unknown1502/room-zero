// Labeled contact sheets of a capture phase, for review. Usage: node tools/qa/sheet.mjs <before|after> [perSheet=6]
// -> qa/visual-audit/<phase>/sheet-N.png (needs ffmpeg on PATH)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const phase = process.argv[2] ?? 'before';
const per = Number(process.argv[3] ?? 6);
const dir = path.join(root, 'qa', 'visual-audit', phase);
const files = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.png$/.test(f)).sort();
for (let s = 0; s * per < files.length; s++) {
  const group = files.slice(s * per, (s + 1) * per);
  const inputs = group.flatMap((f) => ['-i', f]);
  const labels = group.map((f, i) => `[${i}:v]scale=640:412:force_original_aspect_ratio=decrease,pad=640:412:(ow-iw)/2:(oh-ih)/2,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${f.replace(/\.png$/, '').replace(/:/g, '')}':x=6:y=6:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}]`).join(';');
  const layout = group.map((_, i) => `${(i % 3) * 640}_${Math.floor(i / 3) * 412}`).join('|');
  const filter = `${labels};${group.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${group.length}:layout=${layout}[out]`;
  const out = `sheet-${s + 1}.png`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', out], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  console.log(`${out}: ${group.join(', ')}`);
}
