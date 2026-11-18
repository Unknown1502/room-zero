import { spawnSync } from 'node:child_process';

const [family, action, payloadBase64 = 'e30'] = process.argv.slice(2);
if (!['xr'].includes(family) || !action || !/^[A-Za-z0-9_-]+$/.test(payloadBase64)) {
  throw new Error('Usage: node tests/runtime/iwer-command.mjs xr <action> <base64url-json>');
}

const payload = Buffer.from(payloadBase64, 'base64url').toString('utf8');
JSON.parse(payload);
const result = spawnSync(process.execPath, ['node_modules/@iwsdk/cli/bin/iwsdk.js', family, action, '--input-json', payload], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
