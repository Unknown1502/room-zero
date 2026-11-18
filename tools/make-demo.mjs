// Cuts the final demo from two genuine recordings of the final build (tools/rt/record.mjs): take10 (the whole chapter) and take11
// (the same chapter to the sealed office, with the head turned down the corridor so the Surveyor is in view). Segments are trimmed and
// captioned only: no retiming, nothing generated in the picture. The audio is a synthetic narration (offline Windows voice via
// tools/tts.ps1), one line per shot, fitted to the shot's length; no gameplay sound was captured and the narration was not listened to
// by the author (checked by duration and level only).
// Usage: node tools/make-demo.mjs   -> artifacts/recordings/ROOM-ZERO-final-demo.mp4 and ROOM-ZERO-final-demo-cuts.json
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'artifacts', 'recordings');
const OFFSET = 3.3; // chapter seconds + OFFSET = video seconds (the recorder started about 3 s before the chapter clock)
const FONT = 'C\\:/Windows/Fonts/georgia.ttf', FONT_I = 'C\\:/Windows/Fonts/georgiai.ttf';
const work = path.join(dir, '.demo'); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });

// [source, start, end, caption, 'chapter' | 'video' times]. Wider than what ends up on screen: dead time is cut out of each window below.
const cuts = [
  ['take10', 2, 34, 'An ordinary letter, addressed to a room that no longer exists.', 'chapter'],
  ['take10', 33, 56, 'Seated. Hands only. Point at a lamp and pinch to go there.', 'chapter'],
  ['take10', 56, 70, 'Pinch the brass grip and slide it. The house reconnects.', 'chapter'],
  ['take10', 94, 120, 'Some seams need a brace hand and a pull hand.', 'chapter'],
  ['take10', 150, 175, 'Turn the room to open the Wrong Door.', 'chapter'],
  ['take10', 330, 352, 'Every room of the house has its own colour and its own light.', 'chapter'],
  ['take11', 222, 262, 'The Surveyor walks the same doorways you open.', 'video'],
  ['take10', 354, 396, 'Lift away. Room in. Lift back.', 'chapter'],
  ['take10', 396, 430, 'Make room for Room Zero.', 'chapter'],
  ['take10', 432, 460, 'Deliver the letter.', 'chapter'],
  ['take10', 462, 477, 'YOU ARE THE RETURN ADDRESS.', 'chapter'],
];
// Dead time: the emulator is driven by slow commands, so the picture often does not change for seconds. In each window, every still
// stretch longer than 1.2 s keeps only its first 0.8 s. Nothing is slowed, sped up or generated; moving footage is untouched.
const freezeCache = {};
function freezes(src) {
  if (freezeCache[src]) return freezeCache[src];
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', path.join(dir, `${src}-raw.mp4`), '-vf', 'freezedetect=n=-50dB:d=1.2', '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  const out = r.stderr; const s = [...out.matchAll(/freeze_start: ([0-9.]+)/g)].map((m) => +m[1]); const e = [...out.matchAll(/freeze_end: ([0-9.]+)/g)].map((m) => +m[1]);
  return (freezeCache[src] = s.map((a, i) => [a, e[i] ?? Infinity]));
}
const FOOT = 'Real gameplay from the IWER Quest 3 emulator on a desktop (two runs). Scripted hand input. Not recorded on a headset. Synthetic AI narration.';
const TITLE = 7, END = 8;
const VOICE = process.env.RZ_VOICE ?? 'Microsoft Zira Desktop';
// One narration line per slot: the title card, each cut (same order as `cuts`), the end card. Claims stay to what the shot shows.
const narration = [
  'Room Zero. The Unreturned Letter. A seated, hands only puzzle chapter for Meta Quest three.',
  'You are holding an ordinary letter, addressed to a room that no longer exists. Someone has to carry it there.',
  'You stay seated. Point at a lit lamp and pinch, to move there.',
  'The house has seams. Pinch the brass grip and slide it, and the rooms reconnect.',
  'Heavier seams need two hands. One hand braces, while the other pulls. Short prompts teach this in the room, right when you need it.',
  'Turn the room itself to open the Wrong Door. The house is a graph of doorways, and every seam you move rewires it.',
  'Each room has its own colour, and its own light.',
  'Then you are not alone. The Surveyor walks the same doorways you open. It plans its route through the same house graph that you are rewiring.',
  'To finish, work the lift with both hands. One hand anchors, the other pulls. Lift away, bring the room in, and lift back.',
  'Make room for Room Zero. Meanwhile the Surveyor is already on its way, so the last moves are a race.',
  'Pick up the letter, and place it in its slot. Delivering it ends the chapter.',
  'You are the return address.',
  'This is real gameplay from the emulator, with scripted hands. It was not recorded on a headset. The narration is a synthetic voice.',
];

const ff = (args, opts = {}) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8', cwd: dir, ...opts }); if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`); };
const textFile = (n, s) => { const f = path.join(work, n); fs.writeFileSync(f, s); return path.relative(dir, f).replace(/\\/g, '/'); };
const draw = (file, size, y, font = FONT) => `drawtext=fontfile='${font}':textfile='${file}':fontcolor=white:fontsize=${size}:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.55:boxborderw=12`;
const parts = [];
ff(['-f', 'lavfi', '-i', 'color=c=0x0b0e13:s=1280x720:r=20:d=' + TITLE, '-vf', `${draw(textFile('t1.txt', 'ROOM ZERO'), 84, 250)},${draw(textFile('t2.txt', 'The Unreturned Letter'), 40, 360, FONT_I)}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(work, 'p00.mp4')]);
parts.push('p00.mp4');
const log = [];
cuts.forEach(([src, a, b, cap, kind], i) => {
  const start = kind === 'chapter' ? a + OFFSET : a, dur = (kind === 'chapter' ? b + OFFSET : b) - start;
  // intervals to drop, relative to the start of this window
  const drop = freezes(src).map(([a, b]) => [Math.max(a, start) - start, Math.min(b, start + dur) - start]).filter(([a, b]) => b - a > 1.2).map(([a, b]) => [a + 0.8, b]);
  const keepSec = dur - drop.reduce((s, [a, b]) => s + (b - a), 0);
  const sel = drop.length ? `select='not(${drop.map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`).join('+')})',setpts=N/(20*TB),` : '';
  const vf = [`${sel}scale=-2:720:flags=lanczos`, `pad=1280:720:(ow-iw)/2:0:black`, draw(textFile(`c${i}.txt`, cap), 30, 600), draw(textFile('foot.txt', FOOT), 17, 692)].join(',');
  const out = `p${String(i + 1).padStart(2, '0')}.mp4`;
  ff(['-ss', String(start), '-t', String(dur), '-i', path.join(dir, `${src}-raw.mp4`), '-vf', vf, '-r', '20', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-an', path.join(work, out)]);
  parts.push(out); log.push({ source: `${src}.webm`, videoStart: +start.toFixed(1), videoEnd: +(start + dur).toFixed(1), seconds: +keepSec.toFixed(1), windowSeconds: +dur.toFixed(1), stillStretchesShortened: drop.length, caption: cap });
});
ff(['-f', 'lavfi', '-i', 'color=c=0x0b0e13:s=1280x720:r=20:d=' + END, '-vf', `${draw(textFile('e1.txt', 'ROOM ZERO: THE UNRETURNED LETTER'), 52, 240)},${draw(textFile('e2.txt', 'A seated, hands-only VR puzzle chapter for Meta Quest 3 and 3S (WebXR, IWSDK)'), 28, 340, FONT_I)},${draw(textFile('e3.txt', 'The Surveyor follows the same doorways you open.'), 28, 395, FONT_I)}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(work, 'pEnd.mp4')]);
parts.push('pEnd.mp4');
fs.writeFileSync(path.join(work, 'list.txt'), parts.map((p) => `file '${p}'`).join('\n'));
const silent = path.join(work, 'silent.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', silent]);
const probe = (f) => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim();
// Narration: one wav per slot, spoken with the offline voice, sped up only as far as needed to fit the slot, then padded with silence to
// the slot's exact length, so every line starts with its shot.
const slots = parts.map((p) => probe(path.join(work, p)));
const tts = (txt, out, rate) => { const r = spawnSync('powershell', ['-NoProfile', '-File', path.join(root, 'tools', 'tts.ps1'), '-TextFile', txt, '-Out', out, '-Rate', String(rate), '-Voice', VOICE], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`tts: ${r.stderr}`); };
const narLog = []; const wavs = [];
narration.forEach((line, i) => {
  const txt = path.join(work, `n${i}.txt`); fs.writeFileSync(txt, line);
  const raw = path.join(work, `n${i}-raw.wav`), padded = path.join(work, `n${String(i).padStart(2, '0')}.wav`);
  const room = slots[i] - 0.5; // leave half a second of air at the end of every slot
  let rate = 0, spoken;
  for (; rate <= 4; rate++) { tts(txt, raw, rate); spoken = probe(raw); if (spoken <= room) break; }
  if (spoken > room) console.warn(`WARNING: narration ${i} is ${spoken.toFixed(1)} s in a ${slots[i].toFixed(1)} s slot (rate ${rate}); it will be cut`);
  ff(['-i', raw, '-af', `adelay=250|250,apad=whole_dur=${slots[i].toFixed(3)}`, '-t', slots[i].toFixed(3), '-ar', '44100', '-ac', '1', padded]);
  wavs.push(padded); narLog.push({ slot: i, startSeconds: +slots.slice(0, i).reduce((s, x) => s + x, 0).toFixed(1), slotSeconds: +slots[i].toFixed(1), spokenSeconds: +spoken.toFixed(1), voiceRate: rate, text: line });
});
fs.writeFileSync(path.join(work, 'nlist.txt'), wavs.map((w) => `file '${path.basename(w)}'`).join('\n'));
const narration_wav = path.join(work, 'narration.wav');
ff(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'nlist.txt'), '-c', 'copy', narration_wav]);
const total = slots.reduce((s, x) => s + x, 0);
const out = path.join(dir, 'ROOM-ZERO-final-demo.mp4');
ff(['-i', silent, '-i', narration_wav, '-filter_complex', `[1:a]loudnorm=I=-18:TP=-2:LRA=7,afade=t=out:st=${(total - 1.5).toFixed(1)}:d=1.5[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', total.toFixed(2), '-movflags', '+faststart', out]);
fs.writeFileSync(path.join(dir, 'ROOM-ZERO-final-demo-narration.txt'), narLog.map((n) => `[${n.startSeconds.toFixed(1)} s] ${n.text}`).join('\n\n') + '\n');
fs.writeFileSync(path.join(dir, 'ROOM-ZERO-final-demo-cuts.json'), JSON.stringify({ totalSeconds: +total.toFixed(1), offsetSeconds: OFFSET, audio: { kind: 'synthetic narration, offline Windows voice (tools/tts.ps1), loudness-normalised', voice: VOICE, backgroundMusicOrTone: 'none', gameplaySoundCaptured: false, listenedToByAuthor: false, lines: narLog }, titleCardSeconds: TITLE, endCardSeconds: END, cuts: log, note: 'Trimmed and captioned only. No retiming, nothing generated in the picture.' }, null, 2));
console.log(`wrote ${out} (${total.toFixed(1)} s)`);
