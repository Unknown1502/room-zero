// Pull a finished recording out of the page (window.__rec) if record.mjs could not. Usage: node tools/rt/fetch-rec.mjs <name>
import fs from 'node:fs';
import path from 'node:path';
import { page, root } from './lib.mjs';

const name = process.argv[2] ?? 'run';
const dir = path.join(root, 'artifacts', 'recordings');
fs.mkdirSync(dir, { recursive: true });
const info = page(`const r = window.__rec; if (!r) return null; if (r.rec.state !== 'inactive') r.rec.stop(); return { size: new Blob(r.chunks).size, type: r.type, chunks: r.chunks.length, state: r.rec.state }`);
if (!info) throw new Error('no recording in the page (it was reloaded)');
console.log('recording in page', JSON.stringify(info));
const out = path.join(dir, `${name}.webm`);
fs.writeFileSync(out, Buffer.alloc(0));
const step = 600_000;
for (let off = 0; off < info.size; off += step) {
  const b64 = page(`const b = new Blob(window.__rec.chunks).slice(${off}, ${off + step}); return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(b); });`, 60000);
  fs.appendFileSync(out, Buffer.from(b64, 'base64'));
}
console.log(`wrote ${out} (${(info.size / 1048576).toFixed(1)} MB)`);
