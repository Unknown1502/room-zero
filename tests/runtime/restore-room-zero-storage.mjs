/** Restore only Room Zero's four local-save keys from its preserved test backup. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const keys = ['rz.save.pointer', 'rz.save.A', 'rz.save.B', 'rz.settings'];

export default async function restoreRoomZeroStorage({ frame, workspaceRoot }) {
  const backup = JSON.parse(await readFile(join(workspaceRoot, 'artifacts', 'iwer-profile-backup.json'), 'utf8'));
  if (keys.some((key) => typeof backup[key] !== 'string') || Object.keys(backup).some((key) => !keys.includes(key))) {
    throw new Error('Profile backup does not contain exactly the expected Room Zero keys');
  }
  return frame.evaluate((snapshot) => {
    for (const [key, value] of Object.entries(snapshot)) localStorage.setItem(key, value);
    return Object.fromEntries(Object.keys(snapshot).map((key) => [key, localStorage.getItem(key)]));
  }, backup);
}
