/**
 * Focused IWER regression for the fresh-title Begin touch. Preconditions:
 * fresh Room Zero profile, immersive XR active, and tracked hands selected.
 * This drives one index-tip touch only; it does not alter GameSession directly.
 */
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const cli = 'node_modules/@iwsdk/cli/bin/iwsdk.js';

function runCli(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `CLI failed: ${args.join(' ')}`);
  const envelope = JSON.parse(result.stdout.trim());
  if (!envelope.ok) throw new Error(envelope.error?.message ?? `CLI failed: ${args.join(' ')}`);
  return envelope.data.result;
}

function liveState() {
  return runCli(['browser', 'run', 'tests/runtime/live-state.mjs']);
}

const before = liveState();
const begin = before.controls.find((control) => control.action === 'begin');
const continueControl = before.controls.find((control) => control.action === 'continue');
const right = before.trackedHands?.find((hand) => hand.side === 'right');
if (!before.xrActive || before.game !== 'Title' || !begin?.visible || continueControl?.visible) {
  throw new Error('Precondition failed: expected a fresh immersive Title with Begin only');
}
if (!right?.tracked || !right.isHand || right.pinch) {
  throw new Error('Precondition failed: right tracked hand must be connected and unpinched');
}

const target = { x: 0, y: 1.32, z: -0.45 };
const approach = { x: target.x, y: target.y + 0.07, z: target.z + 0.02 };
const input = runCli(['xr', 'run-sequence', '--input-json', JSON.stringify({
  device: 'hand-right',
  steps: [
    { label: 'approach Begin', anchor: 'index-tip', poseId: 'point', orientation: 'auto', position: approach, duration: 0.35 },
    { label: 'touch Begin', anchor: 'index-tip', poseId: 'point', orientation: 'auto', position: target, duration: 0.4 },
    { label: 'withdraw', anchor: 'index-tip', poseId: 'point', orientation: 'auto', position: approach, duration: 0.25 },
  ],
})]);
if (!input.completed || input.cancelled) {
  throw new Error(`IWER fingertip path did not complete: ${JSON.stringify(input)}`);
}

const after = liveState();
const continueVisible = after.controls.some((control) => control.action === 'continue' && control.visible);
const began = ['ChapterIntro', 'Exploration'].includes(after.game) || (after.game === 'Title' && continueVisible);
if (!began) throw new Error(`Begin did not produce a resumable chapter; IWER warnings: ${JSON.stringify(input.warnings ?? [])}; state: ${JSON.stringify(after)}`);
if (after.settings.intensity !== before.settings.intensity || after.settings.hands !== before.settings.hands || after.settings.snapTurn !== before.settings.snapTurn) {
  throw new Error(`Touch changed an unrelated envelope setting: ${JSON.stringify(after.settings)}`);
}
if (after.solved.length || after.flags.houseClosing || after.complete) {
  throw new Error('A title touch advanced puzzle or ending progress');
}

console.log(JSON.stringify({
  passed: true,
  interaction: 'IWER hand-right index-tip touch on Begin',
  before: { game: before.game, settings: before.settings },
  after: { game: after.game, checkpoint: after.checkpoint, continueVisible, settings: after.settings },
  iwerWarnings: input.warnings ?? [],
  unrelatedPuzzleProgress: after.solved.length,
}, null, 2));
