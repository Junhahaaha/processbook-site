// Same bookmark art used on the 3D notebook cover (see
// landing/BookmarkTab.tsx) — white-on-transparent source images, tinted
// per-bookmark by compositing a flat color through the image's own alpha
// channel (feFlood + feComposite "in"), the 2D equivalent of the 3D
// material's color-multiply tint. Cycled by `variant` the same way the 3D
// version cycles shapes so a page with several bookmarks doesn't repeat one
// tile.
export const BOOKMARK_TEXTURES = [
  "/models/bookmarks/bookmark-01.png",
  "/models/bookmarks/bookmark-02.png",
  "/models/bookmarks/bookmark-03.png",
];

function tintFilterId(color: string, variant: number) {
  return `bm-tint-${variant}-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
}

// Raw HTML string form, for the one place this icon is built outside React
// (BookmarkDock manages its dock buttons with plain DOM calls).
export function bookmarkSvgMarkup(color: string, variant = 0): string {
  const src = BOOKMARK_TEXTURES[variant % BOOKMARK_TEXTURES.length];
  const id = tintFilterId(color, variant);
  return `<svg viewBox="0 0 57 100" xmlns="http://www.w3.org/2000/svg"><defs><filter id="${id}"><feFlood flood-color="${color}" result="flood"/><feComposite in="flood" in2="SourceAlpha" operator="in"/></filter></defs><image href="${src}" width="57" height="100" filter="url(#${id})"/></svg>`;
}

export default function BookmarkIcon({
  color,
  variant = 0,
  className,
  style,
}: {
  color: string;
  variant?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const src = BOOKMARK_TEXTURES[variant % BOOKMARK_TEXTURES.length];
  const id = tintFilterId(color, variant);
  return (
    <svg viewBox="0 0 57 100" className={className} style={style} aria-hidden>
      <defs>
        <filter id={id}>
          <feFlood floodColor={color} result="flood" />
          <feComposite in="flood" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <image href={src} width={57} height={100} filter={`url(#${id})`} />
    </svg>
  );
}
