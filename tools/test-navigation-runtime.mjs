import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'node_modules', '@iwsdk', 'cli', 'bin', 'iwsdk.js');
const scenarios = [
  { file: path.join('tests', 'runtime', 'navigation-state.mjs'), name: 'navigation' },
  { file: path.join('tests', 'runtime', 'm5-gate.mjs'), name: 'm5-gate' },
];
const output = path.join(root, 'artifacts', 'm5-live-audit.json');

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    let failure;
    try { failure = JSON.parse(result.stdout); } catch { /* Keep the command output below. */ }
    throw new Error(failure?.error?.message ?? result.stderr ?? result.stdout ?? `iwsdk exited with ${result.status}`);
  }
  const response = JSON.parse(result.stdout);
  if (!response.ok) throw new Error(response.error?.message ?? 'IWSDK runtime command failed');
  return response.data;
}

try {
  const xr = run(['xr', 'status', '--input-json', '{}']).result;
  if (!xr.sessionActive) run(['xr', 'enter', '--input-json', '{}']);
  run(['xr', 'set-input-mode', '--input-json', '{"mode":"hand"}']);
  const audits = {};
  for (const scenario of scenarios) {
    const data = run(['browser', 'run', scenario.file, '--timeout', '30000']);
    audits[scenario.name] = data.result;
  }
  const audit = audits.navigation;
  if (audit.beaconCount !== 11) throw new Error(`expected 11 runtime beacons, received ${audit.beaconCount}`);
  if (audits['m5-gate'].checks?.length !== 5) throw new Error('M5 runtime gate did not report all five checks');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify({ capturedAt: new Date().toISOString(), ...audits }, null, 2)}\n`);
  console.log(`PASS live navigation audit: ${audit.beaconCount} unique targets, correct module/group parenting, distinct world transforms.`);
  console.log(`PASS M5 runtime gate: ${audits['m5-gate'].checks.join('; ')}.`);
  console.log(`Full chapter: ${audits['m5-gate'].fullChapter.state}, ${audits['m5-gate'].fullChapter.objectiveCount} objectives, ${audits['m5-gate'].fullChapter.postmarks.length} postmarks. Recovery returned to ${audits['m5-gate'].stateAfterRecovery}.`);
  console.log(`Evidence: ${path.relative(root, output)}`);
} catch (error) {
  console.error(`FAIL live Room Zero runtime gate: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
