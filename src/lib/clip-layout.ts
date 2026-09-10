// Horizontal layout for the paperclip(s) pinched along a card's top edge —
// one per feedback bookmark, side by side (not stacked/rotated — a
// downward diagonal cascade read as awkward).
const SPACING = 20; // px between clip centers

export function layoutClips(count: number) {
  return Array.from({ length: count }, (_, i) => ({ offsetX: i * SPACING }));
}
