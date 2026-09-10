// Renders as an inline SVG path (Lucide's "paperclip" icon) rather than a
// CSS `mask-image` div. The mask-based version was mounted as an
// absolutely-positioned descendant of a card living inside the subject
// page's multicol masonry grid (.card-grid), and that specific combination
// (position:absolute + mask-image + a CSS multicol ancestor) hit a real,
// hard-to-pin-down rendering bug: the clip could paint hugely oversized,
// mispositioned, or only render for one of several clips on the same card.
// An inline SVG stroke needs no mask and no shared external image resource,
// which sidesteps the whole bug class.
export default function CardClip({
  color,
  offsetX,
  zIndex,
}: {
  color: string;
  offsetX: number;
  zIndex: number;
}) {
  return (
    <svg
      className="card-clip"
      viewBox="0 0 24 24"
      style={{ transform: `translateX(${offsetX}px)`, zIndex }}
      aria-hidden
    >
      <path
        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
        fill="none"
        stroke={color}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
