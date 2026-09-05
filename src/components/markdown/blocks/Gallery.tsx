"use client";

import { useRef } from "react";

export default function Gallery({ lines }: { lines: string[] }) {
  const items = lines.filter(Boolean);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scrollLeft: number } | null>(null);

  if (items.length === 0) return null;

  function onPointerDown(e: React.PointerEvent) {
    const track = trackRef.current;
    if (!track) return;
    drag.current = { x: e.clientX, scrollLeft: track.scrollLeft };
    track.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const track = trackRef.current;
    if (!track || !drag.current) return;
    track.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.x);
  }
  function onPointerUp() {
    drag.current = null;
  }

  return (
    <div className="block-card gallery" data-block="gallery">
      <div
        ref={trackRef}
        className="gallery-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {items.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt={`gallery ${i + 1}`} className="gallery-item" draggable={false} />
        ))}
      </div>
    </div>
  );
}
