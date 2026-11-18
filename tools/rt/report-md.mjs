// Turns artifacts/rt-matrix.json into docs/05-quality/runtime-test-results.md. Usage: node tools/rt/report-md.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'artifacts', 'rt-matrix.json'), 'utf8'));
const byId = Object.fromEntries(data.rows.map((r) => [r.id, r]));
const ids = Array.from({ length: 24 }, (_, i) => `RT-${String(i + 1).padStart(2, '0')}`);
const titles = {
  'RT-01': 'Enter XR', 'RT-02': 'Exit and re-enter', 'RT-03': 'Hands available', 'RT-04': 'One-hand grab',
  'RT-05': 'Two-hand grab', 'RT-06': 'Seam movement', 'RT-07': 'Snap acceptance', 'RT-08': 'Snap rejection',
  'RT-09': 'Blocked path', 'RT-10': 'Hop', 'RT-11': 'Hand loss during a move', 'RT-12': 'Pause and resume',
  'RT-13': 'Restart', 'RT-14': 'Surveyor follows the graph', 'RT-15': 'Full chapter', 'RT-16': 'Envelope seals',
  'RT-17': 'Controllers', 'RT-18': 'Save and reload', 'RT-19': 'Corrupt save', 'RT-20': 'Audio state',
  'RT-21': 'The letter', 'RT-22': 'Lamps and scene join', 'RT-23': 'Unsupported platform, refused session and production build',
  'RT-24': 'Error boundary and asset failure',
};
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const counts = { Pass: 0, Fail: 0, Blocked: 0, 'Not run': 0 };
for (const id of ids) counts[byId[id]?.result ?? 'Not run']++;

let md = `# Runtime test results (RT-01 to RT-24)

**Environment:** ${data.environment}. Captured ${data.capturedAt}.

**Evidence level of every result below: IWER-verified.** Hands are driven through IWER's hand devices (reach, pinch, carry, release, ray select). They are not human hands and not a Quest: tracking quality, comfort, legibility on the headset display, audio as heard, and device performance are untested here. Setup that jumps to a checkpoint is done in the page and is listed as a precondition; the action under test is never set up that way.

Reproduce: start the dev server (\`npm run dev:runtime\` is not enough; use \`npx iwsdk dev up --headless --allow-browser-automation\`), then \`node tools/rt/run-rt.mjs\` (all) or with test IDs. Results are merged by ID into \`artifacts/rt-matrix.json\`; screenshots are in \`evidence/rt/\`.

| Result | Count |
|---|---|
| Pass | ${counts.Pass} |
| Fail | ${counts.Fail} |
| Blocked | ${counts.Blocked} |
| Not run | ${counts['Not run']} |

## Summary

| ID | Test | Result | Evidence |
|---|---|---|---|
`;
for (const id of ids) { const r = byId[id]; md += `| ${id} | ${cell(r?.title ?? titles[id])} | ${r?.result ?? 'Not run'} | ${cell((r?.evidence ?? []).map((e) => `[${path.basename(e)}](../../${e})`).join(' '))} |\n`; }
md += '\n## Detail\n';
for (const id of ids) {
  const r = byId[id];
  md += `\n### ${id} ${r?.title ?? titles[id]}: ${r?.result ?? 'Not run'}\n\n`;
  if (!r) { md += 'Not run in this capture.\n'; continue; }
  md += `- **Preconditions:** ${cell(r.preconditions)}\n- **Input actions:** ${cell(r.inputs)}\n- **Expected:** ${cell(r.expected)}\n- **Actual:** ${cell(r.actual)}\n`;
  if (r.note) md += `- **Note / documented deviation:** ${cell(r.note)}\n`;
  md += `- **Evidence:** ${(r.evidence ?? []).length ? r.evidence.map((e) => `\`${e}\``).join(', ') : 'none (state-only test)'}\n- **Duration:** ${r.seconds ?? '?'} s\n`;
}
fs.writeFileSync(path.join(root, 'docs', '05-quality', 'runtime-test-results.md'), md);
console.log(`wrote docs/05-quality/runtime-test-results.md  Pass ${counts.Pass}  Fail ${counts.Fail}  Not run ${counts['Not run']}`);
