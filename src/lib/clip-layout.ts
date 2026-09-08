// Stack layout for the paperclip(s) pinched onto a card's corner — one per
// feedback bookmark the item has, fanned out at slightly different angles
// and offsets so a stack of several reads as distinct clips, not one blob.
const GOLDEN_ANGLE = 0.61803398875;

export function layoutClips(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = -16 + ((i * GOLDEN_ANGLE) % 1) * 32; // -16..16 deg
    const offsetX = i * 5;
    const offsetY = i * 4;
    return { angle, offsetX, offsetY };
  });
}
