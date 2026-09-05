"use client";

import { useState } from "react";

export default function BeforeAfter({ lines }: { lines: string[] }) {
  const [opacity, setOpacity] = useState(50);
  const [before, after] = lines.filter(Boolean);
  if (!before || !after) return null;

  return (
    <div className="block-card before-after" data-block="before-after">
      <div className="before-after-stage">
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
  );
}
