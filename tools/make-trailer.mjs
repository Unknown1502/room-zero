// Cuts a trailer of under three minutes from one genuine recording (tools/rt/record.mjs). Real footage only: segments are
// trimmed and captioned, never generated, retimed or re-staged. The footage has no sound (the page canvas was recorded, not the audio).
// Usage: node tools/make-trailer.mjs take4        -> artifacts/recordings/trailer-<name>.mp4 and trailer-<name>-cuts.json
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'artifacts', 'recordings');
const name = process.argv[2] ?? 'take4';
const src = path.join(dir, `${name}-raw.mp4`);
const OFFSET = 3.3; // the recorder started about 3 s before the chapter clock; chapter seconds + OFFSET = video seconds
const FONT = 'C\\:/Windows/Fonts/georgia.ttf';
const FONT_I = 'C\\:/Windows/Fonts/georgiai.ttf';
const work = path.join(dir, `.trailer-${name}`);
fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });

// [chapter start s, chapter end s, caption]. Times are from artifacts/recordings/<name>-timeline.json.
const cuts = [
  [6, 14.5, 'Seated. Hands only. Pinch the brass seal to begin.'],
  [29, 40, 'A tiny courier, an enormous house, and a letter for a room that no longer exists.'],
  [53, 66, 'Pinch a brass grip and slide it. The house reconnects.'],
  [96, 112, 'Some seams need a brace hand and a pull hand.'],
  [150, 164, 'Turn the Turning Room to open the Wrong Door.'],
  [198, 234, 'The Surveyor walks the same doorways you open. Swing the bridge and its route changes.', 'take7'],
  [312, 322, 'Make room for Room Zero.'],
  [329, 340, 'Lower the lift. The round doors meet.'],
  [361, 372, 'Into Room Zero.'],
  [375, 392, 'Deliver the letter.'],
  [398, 410, 'YOU ARE THE RETURN ADDRESS.'],
];
const FOOT = 'Real gameplay from the IWER Quest 3 emulator on a desktop (two runs). Scripted hand input. Not recorded on a headset. No sound.';

const run = (args) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8', cwd: dir }); if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`); };
const textFile = (n, s) => { const f = path.join(work, n); fs.writeFileSync(f, s); return path.relative(dir, f).replace(/\\/g, '/'); };
const parts = [];
const draw = (file, size, y, font = FONT) => `drawtext=fontfile='${font}':textfile='${file}':fontcolor=white:fontsize=${size}:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.55:boxborderw=12`;

// title card
run(['-f', 'lavfi', '-i', 'color=c=0x0b0e13:s=1280x720:r=20:d=3.5', '-vf',
  `${draw(textFile('t1.txt', 'ROOM ZERO'), 84, 250)},${draw(textFile('t2.txt', 'The Unreturned Letter'), 40, 360, FONT_I)}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(work, 'p00.mp4')], { cwd: dir });
parts.push('p00.mp4');
cuts.forEach(([a, b, cap, from], i) => {
  const out = `p${String(i + 1).padStart(2, '0')}.mp4`;
  const input = from ? path.join(dir, `${from}-raw.mp4`) : src;
  const vf = [`scale=-2:720:flags=lanczos`, `pad=1280:720:(ow-iw)/2:0:black`, draw(textFile(`c${i}.txt`, cap), 30, 600), draw(textFile('foot.txt', FOOT), 17, 692)].join(',');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(a + OFFSET), '-t', String(b - a), '-i', input, '-vf', vf, '-r', '20', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-an', path.join(work, out)], { encoding: 'utf8', cwd: dir });
  if (r.status !== 0) throw new Error(`segment ${i}: ${r.stderr}`);
  parts.push(out);
});
// end card
run(['-f', 'lavfi', '-i', 'color=c=0x0b0e13:s=1280x720:r=20:d=5', '-vf',
  `${draw(textFile('e1.txt', 'ROOM ZERO: THE UNRETURNED LETTER'), 52, 240)},${draw(textFile('e2.txt', 'A seated, hands-only VR puzzle chapter for Meta Quest 3 and 3S (WebXR, IWSDK)'), 28, 340, FONT_I)},${draw(textFile('e3.txt', 'The Surveyor follows the same doorways you open.'), 28, 395, FONT_I)}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(work, 'pEnd.mp4')], { cwd: dir });
parts.push('pEnd.mp4');

const list = path.join(work, 'list.txt');
fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
const out = path.join(dir, `trailer-${name}.mp4`);
run(['-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out]);
const total = 3.5 + cuts.reduce((s, [a, b]) => s + (b - a), 0) + 5;
fs.writeFileSync(path.join(dir, `trailer-${name}-cuts.json`), JSON.stringify({ source: `${name}-raw.mp4 (from ${name}.webm)`, offsetSeconds: OFFSET, totalSeconds: total, cuts: cuts.map(([a, b, caption, from]) => ({ source: from ?? name, chapterStart: a, chapterEnd: b, videoStart: +(a + OFFSET).toFixed(1), videoEnd: +(b + OFFSET).toFixed(1), caption })), note: 'Footage is unretimed and unedited apart from trimming, captions and cards. No sound.' }, null, 2));
console.log(`wrote ${out}  (${total.toFixed(1)} s)`);
