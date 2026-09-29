import BookmarkIcon from "@/components/BookmarkIcon";

// Rendered as a sibling placed *before* the card in the DOM (see
// [subject]/page.tsx), not as the card's own child — a child can never paint
// behind its parent's own background no matter what z-index it's given, and
// the whole point here is a ribbon that looks tucked in behind the card,
// only its top peeking out above the card's edge. Not a CSS mask-image div:
// a masked, absolutely-positioned element combined with the subject page's
// multicol masonry grid previously caused clips to paint oversized,
// mispositioned, or only one of several rendering on the same card — this
// uses an SVG filter instead (see BookmarkIcon), which isn't implicated in
// that bug class.
export default function CardClip({
  color,
  offsetX,
  variant,
}: {
  color: string;
  offsetX: number;
  variant: number;
}) {
  return (
    <BookmarkIcon
      color={color}
      variant={variant}
      className="card-clip"
      style={{ transform: `translateX(${offsetX}px)` }}
    />
  );
}
