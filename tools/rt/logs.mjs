// Print recent browser console entries that matter. Usage: node tools/rt/logs.mjs [count] [regex]
import { cliRun } from './lib.mjs';

const count = Number(process.argv[2] ?? 300);
const rx = new RegExp(process.argv[3] ?? 'session|ended|navigated|Error|error|reload|exit', 'i');
const d = cliRun(['browser', 'logs', '--input-json', JSON.stringify({ count })]);
const rows = (d.result ?? []).filter((r) => r.level === 'error' || r.level === 'warn' || rx.test(r.message));
for (const r of rows.slice(-24)) console.log(`${r.level.padEnd(5)} ${String(r.message).replace(/\s+/g, ' ').slice(0, 240)}`);
console.log(`(${rows.length} matching of ${(d.result ?? []).length})`);
