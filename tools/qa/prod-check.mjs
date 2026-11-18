// Production-only safety check on dist/ served on loopback (node tools/serve-dist.mjs 4173): no injection strings, hooks or emulator
// globals in the bundle; failure/debug flags in the URL or storage do nothing; the page loads without errors.
// Usage: node tools/qa/prod-check.mjs -> qa/runtime-investigation/prod-check.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = path.join(root, 'dist');
const out = { capturedAt: new Date().toISOString(), checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} - ${detail}`); };

const files = fs.readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.js'));
const needles = ['injected failure', 'refused for RT', 'QA injected', 'verify injected', '__origTick', '__origReq', 'IWER_DEVICE', 'installRuntime', '__rz'];
const hits = [];
for (const f of files) { const t = fs.readFileSync(path.join(dist, 'assets', f), 'utf8'); for (const s of needles) if (t.includes(s)) hits.push(`${f}: ${s}`); }
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const s of needles) if (html.includes(s)) hits.push(`index.html: ${s}`);
check('bundle and page contain none of the injection strings, test hooks or emulator globals', hits.length === 0, hits.join('; ') || `${files.length} JS files and index.html scanned for ${needles.length} strings`);

const browser = await chromium.launch({ headless: true });
try {
  const pg = await browser.newPage(); const errs = [], failed = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 120))); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); }); pg.on('requestfailed', (r) => failed.push(r.url()));
  await pg.goto('http://127.0.0.1:4173/?inject=1&fail=1&debug=1&RT=24');
  await pg.waitForFunction(() => document.getElementById('status') && !/Preparing/.test(document.getElementById('status').textContent), null, { timeout: 60000 });
  await pg.evaluate(() => { for (const k of ['rz.inject', 'rz.debug', 'rz.fail']) localStorage.setItem(k, '1'); });
  await pg.reload(); await pg.waitForTimeout(1500);
  const s = await pg.evaluate(() => ({ rz: typeof window.__rz, iwer: typeof window.IWER_DEVICE, status: document.getElementById('status').textContent, retryShown: getComputedStyle(document.getElementById('retry')).display !== 'none' }));
  check('flags in the URL and storage do nothing; no hooks; no errors; no failed requests', s.rz === 'undefined' && s.iwer === 'undefined' && errs.length === 0 && failed.length === 0 && /VR headset browser/.test(s.status) && !s.retryShown, JSON.stringify({ ...s, errors: errs, failed }));
} finally { await browser.close(); }
fs.writeFileSync(path.join(root, 'qa', 'runtime-investigation', 'prod-check.json'), JSON.stringify(out, null, 2));
process.exit(out.checks.every((c) => c.ok) ? 0 : 1);
