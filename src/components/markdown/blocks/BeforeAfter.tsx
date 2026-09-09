"use client";

import { useState } from "react";
import { rotationForSeed } from "@/lib/jitter";

export default function BeforeAfter({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);
  const [opacity, setOpacity] = useState(50);
  const [before, after] = lines.filter(Boolean);
  if (!before || !after) return null;
  const rotation = rotationForSeed(`${before}|${after}`);

  return (
    <div className="block-card before-after" data-block="before-after">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after}
        alt="비교 이미지 (클릭하면 슬라이드로 비교)"
        className="before-after-thumb pinned-photo"
        style={{ "--photo-rotation": `${rotation}deg` } as React.CSSProperties}
        onClick={() => setOpen(true)}
      />

      {open && (
        <div className="zoom-overlay" onClick={() => setOpen(false)} role="dialog" aria-modal>
          <div className="before-after-stage" onClick={(e) => e.stopPropagation()}>
            <div className="before-after-images">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={before} alt="before" className="before-after-layer" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={after}
                alt="after"
                className="before-after-layer"
                style={{ opacity: opacity / 100 }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="before-after-slider"
              aria-label="겹쳐진 이미지 불투명도"
            />
          </div>
        </div>
      )}
    </div>
  );
}
