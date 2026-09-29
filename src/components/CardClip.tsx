import { BOOKMARK_PATH } from "@/components/BookmarkIcon";

// Rendered as a sibling placed *before* the card in the DOM (see
// [subject]/page.tsx), not as the card's own child — a child can never paint
// behind its parent's own background no matter what z-index it's given, and
// the whole point here is a ribbon that looks tucked in behind the card,
// only its top peeking out above the card's edge. Same "inline SVG, not a
// CSS mask-image div" choice as the old paperclip version: a masked,
// absolutely-positioned element combined with the subject page's multicol
// masonry grid previously caused clips to paint oversized, mispositioned, or
// only one of several rendering on the same card.
export default function CardClip({
  color,
  offsetX,
}: {
  color: string;
  offsetX: number;
}) {
  return (
    <svg
      className="card-clip"
      viewBox="0 0 24 32"
      style={{ transform: `translateX(${offsetX}px)`, color }}
      aria-hidden
    >
      <path fill="currentColor" d={BOOKMARK_PATH} />
    </svg>
  );
}
