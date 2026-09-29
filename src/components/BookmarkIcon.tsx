// Single source of truth for the bookmark-ribbon shape, shared by the card
// clip, the reading-time bookmark dock, and the annotation popover — so all
// three read as "the same object" rather than three different icons.
export const BOOKMARK_PATH = "M2 0h20a2 2 0 0 1 2 2v28l-12-8-12 8V2a2 2 0 0 1 2-2Z";

export default function BookmarkIcon({
  color,
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 32"
      className={className}
      aria-hidden
      style={color ? { color } : undefined}
    >
      <path fill="currentColor" d={BOOKMARK_PATH} />
    </svg>
  );
}
