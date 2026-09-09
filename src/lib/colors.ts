import { hashString } from "./jitter";

// Palette used to give each `feedback` block its own distinct color, assigned
// sequentially per page (see extractFeedbackBlocks in content.server.ts).
export const BOOKMARK_PALETTE = [
  "#c0563f", // rust
  "#3f7cc0", // blue
  "#4f9d5b", // green
  "#b0468f", // magenta
  "#c99a2e", // gold
  "#4fa9a3", // teal
  "#8a5fc7", // violet
  "#d47a3f", // orange
  "#5f7fc7", // periwinkle
  "#9d6b4f", // brown
  "#c74f6f", // rose
  "#5fa66b", // moss
];

// `seed` (an item or subject slug) shifts where in the palette a page's
// numbering starts. Without it every page's first feedback block landed on
// the same palette entry (index 0, rust) and its second on the same next
// entry (blue) — so with only a couple of feedback blocks per page (the
// common case), every subject's notebook bookmarks and every item's clips
// ended up the same rust+blue pair instead of looking distinct from each
// other.
export function colorForIndex(index: number, seed = ""): string {
  const offset = seed ? hashString(seed) : 0;
  return BOOKMARK_PALETTE[(offset + index) % BOOKMARK_PALETTE.length];
}
