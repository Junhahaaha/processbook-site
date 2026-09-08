// Deterministic per-item scatter (rotation + vertical offset) so item cards
// read as notes pinned at slightly different angles instead of a rigid
// grid — stable across rebuilds since it's hashed from the item's slug, not
// random.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function jitterForSeed(seed: string): { rotation: number; offsetY: number } {
  const h = hashString(seed);
  const rotation = ((h % 700) / 100) - 3.5; // -3.5..3.5 deg
  const offsetY = (Math.floor(h / 700) % 21) - 10; // -10..10 px
  return { rotation, offsetY };
}
