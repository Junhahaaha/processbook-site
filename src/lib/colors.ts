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

export function colorForIndex(index: number): string {
  return BOOKMARK_PALETTE[index % BOOKMARK_PALETTE.length];
}
