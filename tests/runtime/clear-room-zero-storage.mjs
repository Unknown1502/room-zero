/** Clear only Room Zero's own persisted keys for a fresh-profile IWER run. */
export default async function clearRoomZeroStorage({ frame }) {
  return frame.evaluate(() => {
    const keys = ['rz.save.pointer', 'rz.save.A', 'rz.save.B', 'rz.settings'];
    const removed = keys.filter((key) => localStorage.getItem(key) !== null);
    for (const key of keys) localStorage.removeItem(key);
    return { removed, remaining: keys.filter((key) => localStorage.getItem(key) !== null) };
  });
}
