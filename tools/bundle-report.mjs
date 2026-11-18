// Bundle dependency report from a real production build (exact rendered sizes from Rollup, not estimates).
// Usage: node tools/bundle-report.mjs <label>   -> artifacts/bundle-<label>.json and a table on stdout.
// Builds into dist-report/ (deleted afterwards) so the normal dist/ is untouched.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const label = process.argv[2] ?? 'report';
const outDir = path.join(root, 'dist-report');
const captured = { chunks: [] };

const reporter = {
  name: 'rz-bundle-reporter',
  generateBundle(_opts, bundle) {
    for (const [file, c] of Object.entries(bundle)) {
      if (c.type !== 'chunk') continue;
      captured.chunks.push({ file, isEntry: c.isEntry, isDynamicEntry: c.isDynamicEntry, imports: c.imports, dynamicImports: c.dynamicImports, modules: Object.fromEntries(Object.entries(c.modules).map(([id, m]) => [id, m.renderedLength])) });
    }
  },
};

fs.rmSync(outDir, { recursive: true, force: true });
await build({ root, configFile: path.join(root, 'vite.config.ts'), logLevel: 'error', mode: 'production', plugins: [reporter], build: { outDir, emptyOutDir: true, sourcemap: false, reportCompressedSize: false } });

const pkgOf = (id) => {
  const clean = id.replace(/\\/g, '/').split('?')[0];
  const i = clean.lastIndexOf('node_modules/');
  if (i >= 0) { const rest = clean.slice(i + 13).split('/'); return rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0]; }
  if (clean.startsWith('\0') || clean.includes('vite/')) return 'vite-runtime';
  const rel = path.relative(root, clean).replace(/\\/g, '/');
  return rel.startsWith('..') ? clean : `app: ${rel.split('/').slice(0, 2).join('/')}`;
};

const files = {};
const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else { const rel = path.relative(outDir, p).replace(/\\/g, '/'); const buf = fs.readFileSync(p); files[rel] = { raw: buf.length, gzip: /\.(js|css|html|json)$/.test(rel) ? zlib.gzipSync(buf).length : null }; } } };
walk(outDir);

// Which chunks load at startup: the entry chunk and everything it statically imports, plus the html and scripts it names.
const byFile = Object.fromEntries(captured.chunks.map((c) => [`assets/${path.basename(c.file)}`, c]));
const lookup = (f) => captured.chunks.find((c) => c.file === f || c.file.endsWith(path.basename(f)));
const initial = new Set();
const visit = (f) => { const c = lookup(f); if (!c || initial.has(c.file)) return; initial.add(c.file); for (const i of c.imports) visit(i); };
const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.js)"/g)) visit(m[1]);

const pkgSizes = {};
const dupes = {};
for (const c of captured.chunks) for (const [id, n] of Object.entries(c.modules)) {
  const p = pkgOf(id);
  pkgSizes[p] ??= { rendered: 0, initial: 0, modules: 0 };
  pkgSizes[p].rendered += n; pkgSizes[p].modules++; if (initial.has(c.file)) pkgSizes[p].initial += n;
  const m = id.replace(/\\/g, '/').match(/node_modules\/((?:@[^/]+\/)?[^/]+)\/(?:.*)$/); if (m) { const ver = id.replace(/\\/g, '/').split('node_modules/').length - 1; (dupes[m[1]] ??= new Set()).add(id.replace(/\\/g, '/').split('node_modules/').slice(0, -1).join('node_modules/') + `#${ver}`); }
}
const topModules = captured.chunks.flatMap((c) => Object.entries(c.modules).map(([id, n]) => ({ chunk: path.basename(c.file), module: path.relative(root, id.split('?')[0]).replace(/\\/g, '/'), bytes: n }))).sort((a, b) => b.bytes - a.bytes).slice(0, 25);
const chunkTable = captured.chunks.map((c) => ({ file: path.basename(c.file), raw: files[`assets/${path.basename(c.file)}`]?.raw ?? null, gzip: files[`assets/${path.basename(c.file)}`]?.gzip ?? null, initial: initial.has(c.file), dynamicEntry: !!c.isDynamicEntry, staticImports: c.imports.length, dynamicImports: c.dynamicImports.length })).sort((a, b) => b.raw - a.raw);
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) ?? 0), 0);
const assetTotals = { js: sum(Object.entries(files).filter(([k]) => k.endsWith('.js')), ([, v]) => v.raw), jsGzip: sum(Object.entries(files).filter(([k]) => k.endsWith('.js')), ([, v]) => v.gzip), audio: sum(Object.entries(files).filter(([k]) => k.endsWith('.wav')), ([, v]) => v.raw), all: sum(Object.values(files), (v) => v.raw) };
const initialJs = { raw: sum(chunkTable.filter((c) => c.initial), (c) => c.raw), gzip: sum(chunkTable.filter((c) => c.initial), (c) => c.gzip) };
const largest = Object.entries(pkgSizes).sort((a, b) => b[1].rendered - a[1].rendered).slice(0, 18).map(([name, v]) => ({ name, renderedKB: +(v.rendered / 1024).toFixed(1), initialKB: +(v.initial / 1024).toFixed(1), modules: v.modules }));
const duplicates = Object.entries(dupes).filter(([, s]) => s.size > 1).map(([name, s]) => ({ name, copies: s.size }));

const result = { label, capturedAt: new Date().toISOString(), build: 'vite build --mode production (this project\'s vite.config.ts)', initialJs, assetTotals, chunkTable, largestPackages: largest, topModules, duplicatePackageCopies: duplicates, files };
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts', `bundle-${label}.json`), JSON.stringify(result, null, 2));
fs.rmSync(outDir, { recursive: true, force: true });

const kb = (n) => (n == null ? '-' : (n / 1024).toFixed(1) + ' KB');
console.log(`\n== ${label} ==`);
console.log(`initial JS (entry + static imports): ${kb(initialJs.raw)} raw, ${kb(initialJs.gzip)} gzip`);
console.log(`all JS: ${kb(assetTotals.js)} raw, ${kb(assetTotals.jsGzip)} gzip; audio ${kb(assetTotals.audio)}; whole build ${kb(assetTotals.all)}`);
console.log('\nchunks:'); for (const c of chunkTable) console.log(`  ${c.file.padEnd(46)} ${kb(c.raw).padStart(10)} ${kb(c.gzip).padStart(10)} ${c.initial ? 'initial' : 'lazy'}`);
console.log('\nlargest packages (rendered, before minify-gzip):'); for (const p of largest) console.log(`  ${p.name.padEnd(34)} ${String(p.renderedKB).padStart(8)} KB  (in initial chunks: ${p.initialKB} KB, ${p.modules} modules)`);
console.log('\nduplicate package copies:', duplicates.length ? JSON.stringify(duplicates) : 'none');
