"use client";

import { useState } from "react";
import { rotationForSeed } from "@/lib/jitter";

const STACK_DEPTH = 4; // how many pages peek out of the pile

export default function Gallery({ lines }: { lines: string[] }) {
  const items = lines.filter(Boolean);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (items.length === 0) return null;

  const stack = items.slice(0, STACK_DEPTH);

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }
  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i + 1) % items.length);
  }
  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i - 1 + items.length) % items.length);
  }

  return (
    <div className="block-card gallery" data-block="gallery">
      <div className="gallery-stack" onClick={() => openAt(0)}>
        {stack.map((src, i) => {
          const seed = `${src}#${i}`;
          const rotation = rotationForSeed(seed, 9);
          const offsetX = (i - (stack.length - 1) / 2) * 22;
          const offsetY = -i * 10;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`갤러리 ${i + 1}/${items.length}`}
              className="gallery-stack-item pinned-photo"
              style={
                {
                  "--photo-rotation": `${rotation}deg`,
                  "--photo-x": `${offsetX}px`,
                  "--photo-y": `${offsetY}px`,
                  zIndex: stack.length - i,
                } as React.CSSProperties
              }
              draggable={false}
            />
          );
        })}
        {items.length > 1 && <span className="gallery-count-badge">{items.length}장</span>}
      </div>

      {open && (
        <div className="zoom-overlay gallery-overlay" onClick={() => setOpen(false)} role="dialog" aria-modal>
          {items.length > 1 && (
            <button type="button" className="gallery-nav" onClick={prev} aria-label="이전 사진">
              ‹
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={items[index]}
            alt={`갤러리 ${index + 1}/${items.length}`}
            className="zoom-overlay-image"
            onClick={(e) => e.stopPropagation()}
          />
          {items.length > 1 && (
            <button type="button" className="gallery-nav" onClick={next} aria-label="다음 사진">
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
