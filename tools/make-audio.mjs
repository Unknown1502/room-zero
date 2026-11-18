// Generates every sound in the chapter as a small WAV file under public/audio.
// The sounds are synthesised here, deterministically, so the project ships no recorded or licensed audio.
// Run: node tools/make-audio.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');
mkdirSync(out, { recursive: true });

let seed = 12345;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = (sec) => new Float32Array(Math.round(sec * SR));
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

/** One-pole low-pass, in place. */
function lowpass(x, hz) {
  const k = 1 - Math.exp((-2 * Math.PI * hz) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += k * (x[i] - y); x[i] = y; }
  return x;
}
function highpass(x, hz) {
  const lp = lowpass(Float32Array.from(x), hz);
  for (let i = 0; i < x.length; i++) x[i] -= lp[i];
  return x;
}
function noise(sec, lp, hp = 0) { const x = buf(sec); for (let i = 0; i < x.length; i++) x[i] = rnd(); lowpass(x, lp); if (hp) highpass(x, hp); return x; }
function mix(...parts) { const n = Math.max(...parts.map((p) => p.length)); const x = new Float32Array(n); for (const p of parts) for (let i = 0; i < p.length; i++) x[i] += p[i]; return x; }
function shape(x, fn) { for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR, i / x.length); return x; }
function tone(sec, hz, fn = () => 1) { const x = buf(sec); let ph = 0; for (let i = 0; i < x.length; i++) { const f = typeof hz === 'function' ? hz(i / SR) : hz; ph += (2 * Math.PI * f) / SR; x[i] = Math.sin(ph) * fn(i / SR, i / x.length); } return x; }
function at(x, sec, part) { const o = Math.round(sec * SR); for (let i = 0; i < part.length && o + i < x.length; i++) x[o + i] += part[i]; return x; }
/** Make a loop seamless by cross-fading its tail into its head. */
function loopable(x, fade = 0.4) { const n = Math.round(fade * SR); for (let i = 0; i < n; i++) { const k = i / n; x[i] = x[i] * k + x[x.length - n + i] * (1 - k); } return x.subarray(0, x.length - n); }

function save(name, x, gain = 0.9) {
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? gain / peak : 1;
  const data = Buffer.alloc(44 + x.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + x.length * 2, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i] * g)) * 32767), 44 + i * 2);
  writeFileSync(join(out, `${name}.wav`), data);
  return data.length;
}

const sizes = {};
const add = (name, x, gain) => (sizes[name] = save(name, x, gain));

// --- The Surveyor ---------------------------------------------------------------------------------
// The knock: a knuckle on plaster over lath. A hard click, a woody body, a short hollow ring.
const knock = () => mix(
  shape(noise(0.03, 5000, 900), (t) => env(t, 0.0005, 0.004)),
  tone(0.22, (t) => 190 - t * 260, (t) => env(t, 0.001, 0.035) * 0.9),
  tone(0.3, 410, (t) => env(t, 0.001, 0.05) * 0.25),
  shape(noise(0.3, 700), (t) => env(t, 0.002, 0.07) * 0.5),
);
add('knock', knock());
add('tape', shape(mix(noise(1.1, 6500, 1800), tone(1.1, (t) => 900 + t * 500, () => 0.08)), (t, k) => Math.sin(Math.PI * k) ** 0.6 * (0.6 + 0.4 * Math.sin(t * 190))), 0.6); // a steel tape drawn out
add('tape-long', shape(mix(noise(3.4, 5200, 1500), tone(3.4, (t) => 700 + t * 110, () => 0.06)), (t, k) => Math.sin(Math.PI * k) ** 0.5 * (0.7 + 0.3 * Math.sin(t * 140))), 0.6); // long and slow: no route
add('pulse', shape(mix(noise(0.5, 900, 120), tone(0.5, 62, () => 0.7)), (t) => env(t, 0.03, 0.13)), 0.7); // one doorway away
add('pencil', (() => { const x = buf(0.9); for (const [s, l] of [[0, 0.16], [0.22, 0.1], [0.38, 0.22], [0.66, 0.14]]) at(x, s, shape(noise(l, 7000, 2500), (t, k) => Math.sin(Math.PI * k) * (0.5 + 0.5 * Math.sin(t * 420)))); return x; })(), 0.45);
add('plumb', (() => { const x = buf(3.6); for (let i = 0, t = 0.5; i < 7; i++, t += 0.34 + i * 0.045) at(x, t, shape(tone(0.09, 1700, () => 1), (u) => env(u, 0.001, 0.016) * (1 - i * 0.11))); return at(x, 0, shape(noise(0.5, 3000, 800), (t, k) => (1 - k) * 0.3)); })(), 0.5);
add('step', mix(shape(noise(0.4, 380), (t) => env(t, 0.006, 0.09)), shape(noise(0.35, 2600, 900), (t) => env(t, 0.06, 0.07) * 0.25)), 0.75); // plaster creak and weight
add('strain', shape(mix(noise(1.6, 420, 60), tone(1.6, (t) => 96 + Math.sin(t * 9) * 8, () => 0.4)), (t, k) => Math.sin(Math.PI * k)), 0.6);

// --- Seams and rooms ------------------------------------------------------------------------------
add('grind', loopable(shape(mix(noise(3.4, 260, 30), shape(noise(3.4, 1500, 500), (t) => 0.35 + 0.3 * Math.sin(t * 23)), tone(3.4, (t) => 47 + Math.sin(t * 3.1) * 4, () => 0.5)), (t) => 0.75 + 0.25 * Math.sin(t * 7.3))), 0.8); // timber drag, chain run, low rumble
add('thud', mix(tone(0.9, (t) => 58 - t * 22, (t) => env(t, 0.004, 0.2)), shape(noise(0.5, 300), (t) => env(t, 0.003, 0.09)), at(buf(0.9), 0.07, tone(0.6, 640, (t) => env(t, 0.002, 0.12) * 0.12))), 0.95); // deep seating thud, a short settle of metal
add('groan', shape(mix(tone(1.2, (t) => 150 - t * 70, () => 0.6), noise(1.2, 500, 80)), (t, k) => Math.sin(Math.PI * k) ** 0.7 * (0.6 + 0.4 * Math.sin(t * 31))), 0.6); // falling: returned, not joined
add('block', shape(mix(tone(1.1, (t) => 82 + Math.sin(t * 14) * 5, () => 0.7), noise(1.1, 340, 50)), (t, k) => Math.sin(Math.PI * k) * (0.7 + 0.3 * Math.sin(t * 43))), 0.7);
add('clank', mix(tone(0.5, 310, (t) => env(t, 0.001, 0.07) * 0.6), tone(0.5, 467, (t) => env(t, 0.001, 0.05) * 0.4), shape(noise(0.08, 3000, 600), (t) => env(t, 0.001, 0.012))), 0.7); // plates that do not mesh
add('rattle', (() => { const x = buf(0.42); for (let i = 0; i < 6; i++) at(x, i * 0.06, mix(shape(noise(0.04, 5200, 1500), (t) => env(t, 0.001, 0.007)), tone(0.05, 1250 + i * 40, (t) => env(t, 0.001, 0.012) * 0.3))); return x; })(), 0.55);
add('clack', mix(shape(noise(0.05, 4200, 900), (t) => env(t, 0.0006, 0.006)), tone(0.14, 880, (t) => env(t, 0.001, 0.028) * 0.5)), 0.6);
add('ratchet', (() => { const x = buf(0.5); for (let i = 0; i < 8; i++) at(x, i * 0.055, shape(noise(0.03, 6000, 2000), (t) => env(t, 0.0005, 0.004))); return x; })(), 0.5);
add('creak', shape(mix(noise(0.3, 2200, 500), tone(0.3, (t) => 520 + t * 300, () => 0.15)), (t, k) => Math.sin(Math.PI * k) ** 2), 0.35); // leather glove on brass
add('brass', tone(0.7, 1320, (t) => env(t, 0.002, 0.16)), 0.25);
add('hum', loopable(mix(tone(2.4, 196, () => 0.5), tone(2.4, 294, () => 0.3), tone(2.4, 392, () => 0.15)), 0.3), 0.4); // the doorway gathering light

// --- The letter, the lamps, the world --------------------------------------------------------------
add('paper', shape(noise(0.35, 7000, 2200), (t, k) => Math.sin(Math.PI * k) * (0.4 + 0.6 * Math.abs(Math.sin(t * 46)))), 0.35);
add('stamp', mix(tone(0.3, (t) => 120 - t * 150, (t) => env(t, 0.002, 0.05)), shape(noise(0.12, 1800), (t) => env(t, 0.001, 0.02))), 0.75);
add('pen', shape(noise(1.4, 6500, 2600), (t, k) => (0.3 + 0.7 * Math.abs(Math.sin(t * 9))) * Math.sin(Math.PI * k) ** 0.4), 0.3);
add('wax', mix(shape(noise(0.06, 3500, 1200), (t) => env(t, 0.0005, 0.008)), tone(0.1, 2100, (t) => env(t, 0.001, 0.015) * 0.3)), 0.5);
add('lamp', mix(shape(noise(0.25, 2400, 300), (t) => env(t, 0.004, 0.05)), tone(0.3, 240, (t) => env(t, 0.01, 0.07) * 0.3)), 0.4); // a gas mantle catching
add('hop', mix(shape(noise(0.4, 1400, 200), (t, k) => Math.sin(Math.PI * k) ** 2 * 0.6), at(buf(0.4), 0.22, shape(noise(0.12, 300), (t) => env(t, 0.004, 0.03)))), 0.4); // cloth and a footfall
add('flap', mix(tone(0.4, (t) => 300 - t * 380, (t) => env(t, 0.001, 0.04)), shape(noise(0.2, 2600, 500), (t) => env(t, 0.001, 0.025)), at(buf(0.6), 0.16, tone(0.4, 520, (t) => env(t, 0.001, 0.06) * 0.2))), 0.6); // a letterbox, far above
add('lock', (() => { const x = buf(1.2); at(x, 0, shape(noise(0.5, 2200, 500), (t, k) => Math.sin(Math.PI * k) * 0.5)); at(x, 0.55, mix(tone(0.4, 170, (t) => env(t, 0.001, 0.07)), shape(noise(0.06, 3000), (t) => env(t, 0.001, 0.01)))); return x; })(), 0.7);
add('tone', loopable(mix(noise(6, 150, 25), shape(noise(6, 900, 300), (t) => 0.05 + 0.04 * Math.sin(t * 0.9))), 0.8), 0.5); // room tone and the air of the void
add('closing', loopable(shape(mix(noise(8, 110, 18), tone(8, (t) => 38 + Math.sin(t * 0.7) * 3, () => 0.6), shape(noise(8, 600, 150), (t) => 0.15 + 0.15 * Math.sin(t * 1.3))), (t) => 0.8 + 0.2 * Math.sin(t * 0.5)), 1), 0.8); // the house folding
add('chord', shape(mix(tone(9, 174.6, () => 0.5), tone(9, 220, () => 0.4), tone(9, 261.6, () => 0.35), tone(9, 349.2, () => 0.15), noise(9, 300, 60)), (t, k) => Math.min(1, t / 3) * Math.min(1, (1 - k) * 3)), 0.5); // Room Zero: one sustained warm chord
add('title', (() => { const x = buf(6); [293.7, 349.2, 440, 392, 293.7].forEach((f, i) => at(x, i * 0.85, mix(tone(2.2, f, (t) => env(t, 0.06, 0.6)), tone(2.2, f * 2.005, (t) => env(t, 0.06, 0.4) * 0.25), tone(2.2, f * 0.5, (t) => env(t, 0.1, 0.7) * 0.3)))); return x; })(), 0.5); // a few notes on a small plain instrument

const total = Object.values(sizes).reduce((a, b) => a + b, 0);
console.log(`${Object.keys(sizes).length} sounds, ${(total / 1024).toFixed(0)} KB -> ${out}`);
