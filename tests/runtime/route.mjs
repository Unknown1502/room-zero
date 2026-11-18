// Fault injection for RT-24: abort chosen requests while artifacts/block.json lists them.
// Run once through `iwsdk browser run`; it installs a context-level handler that stays for the life of the managed browser.
// The handler reads the block list on every request, so blocking can be switched on and off without more scripts.
import fs from 'node:fs';
import path from 'node:path';

export default async function route({ context, page, workspaceRoot }) {
  const flag = path.join(workspaceRoot, 'artifacts', 'block.json');
  const target = page ?? context;
  if (!target.__rzRouteInstalled) {
    target.__rzRouteInstalled = true;
    await target.route('**/*', (r) => {
      let list = [];
      try { list = JSON.parse(fs.readFileSync(flag, 'utf8')); } catch { /* nothing blocked */ }
      const url = r.request().url();
      if (list.some((s) => url.includes(s))) return r.abort('failed');
      return r.continue();
    });
  }
  return { installed: true, blocking: fs.existsSync(flag) ? JSON.parse(fs.readFileSync(flag, 'utf8')) : [] };
}
