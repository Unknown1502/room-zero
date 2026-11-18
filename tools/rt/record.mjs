// One uninterrupted, genuine run of the whole chapter with IWER hands, recorded from the game's own canvas.
// The recorder lives in the page (canvas.captureStream + MediaRecorder), so the emulator-control commands that drive the hands
// do not interrupt it. Real footage only: nothing is composited, retimed or staged here.
// Usage: node tools/rt/record.mjs [name]   -> artifacts/recordings/<name>.webm, <name>-timeline.json
import fs from 'node:fs';
import path from 'node:path';
import { cliRun, ensureImmersive, page, parkHands, root, setup, sleep, stablePage } from './lib.mjs';
import { playChapter } from './chapter.mjs';

const name = process.argv[2] ?? 'run';
const dir = path.join(root, 'artifacts', 'recordings');
fs.mkdirSync(dir, { recursive: true });

await stablePage(15000);
// (A larger viewport was tried: the XR canvas stayed 762 x 484 and the run was slower, so it is not used.)
await ensureImmersive();
await sleep(2000);
parkHands();
// `encounter` records only the first Surveyor encounter, from the corridor checkpoint. The checkpoint is put in place by the
// page (a disclosed precondition of this clip); the encounter itself is played with hands like the full run.
if (process.argv[3] === 'encounter') { setup('cp-corridor'); await sleep(1500); }
// Two canvases are on top of each other: the game's renderer canvas, and the emulator's overlay (the hands and rays it draws).
// A 2D canvas takes both on every animation frame, and that canvas is what is recorded.
const started = page(`const c = __rz.world.renderer.domElement; const overlay = [...document.querySelectorAll('canvas')].find((x) => x !== c);
  if (!c) return { error: 'no canvas' };
  const comp = document.createElement('canvas'); comp.width = c.width; comp.height = c.height; const cx = comp.getContext('2d');
  // The WebGL canvas can only be read inside an animation frame (a timer reads a blank canvas: tried, and recorded black).
  const draw = () => { cx.drawImage(c, 0, 0); if (overlay) cx.drawImage(overlay, 0, 0); requestAnimationFrame(draw); }; draw();
  // VP9 at 30 fps starved the browser and the emulator-control pipe timed out; VP8 at 20 fps leaves the CPU to the game.
  const stream = comp.captureStream(20);
  const type = ['video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2000000 });
  window.__rec = { chunks: [], rec, t0: performance.now(), type };
  rec.ondataavailable = (e) => { if (e.data.size) window.__rec.chunks.push(e.data); };
  rec.start(1000);
  return { type, width: c.width, height: c.height };`);
console.log('recorder started', JSON.stringify(started));
const wall0 = Date.now();
await sleep(3000);

// `probe` records six seconds of the title only, to check that the picture is not blank.
const result = process.argv[3] === 'probe' ? { seconds: 6, end: { game: 'probe' }, timeline: [], failures: [] } : await playChapter({ log: (m) => console.log(m), beat: async () => {}, lookAhead: true, ...(process.argv[3] === 'encounter' ? { startFrom: 'corridor', stopAfter: 'sealed' } : process.argv[3] === 'toSealed' ? { stopAfter: 'sealed' } : {}) });
if (process.argv[3] === 'probe') await sleep(6000);
await sleep(4000);

page(`window.__rec.rec.stop(); return 1`);
await sleep(1500);
const size = page('return new Blob(window.__rec.chunks).size');
const out = path.join(dir, `${name}.webm`);
fs.writeFileSync(out, Buffer.alloc(0));
const step = 600_000; // base64 grows it by a third and one result may not exceed 1 MB
for (let off = 0; off < size; off += step) {
  const b64 = page(`const b = new Blob(window.__rec.chunks).slice(${off}, ${off + step}); return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(b); });`, 60000);
  fs.appendFileSync(out, Buffer.from(b64, 'base64'));
}
fs.writeFileSync(path.join(dir, `${name}-timeline.json`), JSON.stringify({ capturedAt: new Date().toISOString(), environment: 'IWER desktop emulator, managed headless Chromium; canvas capture of the game view (not a Quest)', recorderStartedBeforeChapterSeconds: 3, wallSeconds: (Date.now() - wall0) / 1000, bytes: size, ...result }, null, 2));
console.log(`wrote ${out} (${(size / 1048576).toFixed(1)} MB); chapter ${result.seconds} s; ended ${result.end.game}`);
