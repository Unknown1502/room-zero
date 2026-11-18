// Runs a JavaScript snippet inside the live Room Zero page and returns its result.
// The snippet comes from the RZ_JS environment variable, so one script serves every runtime test.
// Used only by the runtime test harness (tools/rt/lib.mjs). Development builds expose the game as window.__rz.
export default async function evalInPage({ frame }) {
  const code = process.env.RZ_JS;
  if (!code) throw new Error('RZ_JS is empty');
  return frame.evaluate(`(async () => { ${code} })()`);
}
