"use client";

import { rotationForSeed } from "@/lib/jitter";

export default function CursorSwitch({ lines }: { lines: string[] }) {
  const [base, hover] = lines.filter(Boolean);
  if (!base || !hover) return null;
  const rotation = rotationForSeed(`${base}|${hover}`);

  return (
    <div
      className="block-card cursor-switch pinned-photo"
      data-block="cursor-switch"
      style={{ "--photo-rotation": `${rotation}deg` } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={base} alt="" className="cursor-switch-layer" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hover} alt="" className="cursor-switch-layer cursor-switch-hover" />
    </div>
  );
}
