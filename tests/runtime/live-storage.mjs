/** Read-only snapshot of Room Zero's own local-save keys before fresh-profile testing. */
export default async function liveStorage({ frame }) {
  return frame.evaluate(() => {
    const keys = ['rz.save.pointer', 'rz.save.A', 'rz.save.B', 'rz.settings'];
    return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  });
}
