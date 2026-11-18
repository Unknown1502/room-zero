// Run the whole chapter once with IWER hands and print the timeline. Usage: node tools/rt/play.mjs
import fs from 'node:fs';
import path from 'node:path';
import { playChapter } from './chapter.mjs';
import { ensureImmersive, root, screenshot, stablePage } from './lib.mjs';

console.log('page stable after', await stablePage(), 'extra reloads');
await ensureImmersive();
const r = await playChapter({ log: console.log, beat: async (n) => { try { screenshot(`play-${n}`); } catch { /* ignore */ } } });
console.log(JSON.stringify({ seconds: r.seconds, failures: r.failures, end: { game: r.end.game, postmarks: r.end.postmarks, catches: r.end.catches, solved: r.end.solved } }, null, 2));
fs.writeFileSync(path.join(root, 'artifacts', 'play-last.json'), JSON.stringify(r, null, 2));
