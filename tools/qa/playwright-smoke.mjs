// Playwright smoke tests for the web page and the production build, with `playwright-core` (already a dependency of the IWSDK
// tooling; no new dependency, no @playwright/test, no config file). It serves nothing itself: start `node tools/serve-dist.mjs`
// first. In-VR checks are the RT tests (tools/rt), which drive the same Playwright-managed browser through the IWSDK CLI.
// Usage: node tools/qa/playwright-smoke.mjs <before|after> [baseUrl]   -> qa/visual-audit/playwright/<phase>-*.png, <phase>-results.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const phase = process.argv[2] ?? 'before';
const base = process.argv[3] ?? 'http://127.0.0.1:4173/';
const dir = path.join(root, 'qa', 'visual-audit', 'playwright');
fs.mkdirSync(dir, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`); };

const browser = await chromium.launch({ headless: true });
try {
  for (const [label, w, h] of [['desktop-1440x900', 1440, 900], ['laptop-1280x720', 1280, 720], ['narrow-390x844', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const pg = await ctx.newPage();
    const errors = [], failed = [], bad = [];
    pg.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    pg.on('requestfailed', (r) => failed.push(r.url()));
    pg.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    await pg.goto(base);
    await pg.waitForFunction(() => document.getElementById('status') && !/Preparing/.test(document.getElementById('status').textContent), null, { timeout: 60000 });
    await pg.waitForTimeout(800); // let the first frames draw
    await pg.screenshot({ path: path.join(dir, `${phase}-${label}.png`) });
    const m = await pg.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; };
      const vis = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; };
      return { h1: box('h1'), h2: box('h2'), enter: box('#enter'), fieldset: box('fieldset'), status: document.getElementById('status').textContent, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, scrollH: document.documentElement.scrollHeight, innerH: window.innerHeight, h1Vis: vis('h1'), canvas: !!document.querySelector('canvas') };
    });
    check(`${label}: page loads, status line says why VR is unavailable`, /VR headset browser/.test(m.status), m.status);
    check(`${label}: no console errors or page errors`, errors.length === 0, errors.join(' | '));
    check(`${label}: no failed or 4xx requests`, failed.length === 0 && bad.length === 0, [...failed, ...bad].slice(0, 3).join(' | '));
    check(`${label}: no horizontal scroll`, m.scrollW <= m.innerW, `${m.scrollW} > ${m.innerW}`);
    check(`${label}: title, subtitle, Enter VR and settings are inside the viewport`, [m.h1, m.h2, m.enter, m.fieldset].every((b) => b && b.x >= 0 && b.right <= m.innerW && b.y >= 0 && b.bottom <= m.innerH), JSON.stringify({ h1: m.h1, enter: m.enter, fieldset: m.fieldset }));
    results.push({ name: `${label}: measurements`, ok: true, detail: JSON.stringify(m) });
    await ctx.close();
  }
  // the controls on the page are real and work: settings selects persist to the same storage keys the game reads
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  await pg.goto(base);
  await pg.waitForFunction(() => document.getElementById('status') && !/Preparing/.test(document.getElementById('status').textContent), null, { timeout: 60000 });
  await pg.selectOption('#hands', 'one'); await pg.selectOption('#intensity', 'reduced'); await pg.selectOption('#turn', '30');
  await pg.waitForTimeout(300);
  const stored = await pg.evaluate(() => { try { return JSON.parse(localStorage.getItem('rz.settings')); } catch { return null; } });
  check('page settings are stored where the game reads them', stored && stored.hands === 'one' && stored.intensity === 'reduced' && stored.snapTurn === 30, JSON.stringify(stored));
  await pg.reload();
  await pg.waitForFunction(() => document.getElementById('status') && !/Preparing/.test(document.getElementById('status').textContent), null, { timeout: 60000 });
  const after = await pg.evaluate(() => ({ hands: document.getElementById('hands').value, intensity: document.getElementById('intensity').value, turn: document.getElementById('turn').value }));
  check('page settings survive a reload', after.hands === 'one' && after.intensity === 'reduced' && after.turn === '30', JSON.stringify(after));
  await ctx.close();
} finally { await browser.close(); }
fs.writeFileSync(path.join(dir, `${phase}-results.json`), JSON.stringify({ capturedAt: new Date().toISOString(), base, results }, null, 2));
const failedN = results.filter((r) => !r.ok).length;
console.log(`${results.filter((r) => r.ok).length} passed, ${failedN} failed -> qa/visual-audit/playwright/${phase}-results.json`);
process.exitCode = failedN ? 1 : 0;
