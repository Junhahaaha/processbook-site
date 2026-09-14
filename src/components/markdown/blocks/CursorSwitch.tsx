"use client";

import { rotationForSeed } from "@/lib/jitter";
import { usePinnedSwing } from "@/lib/usePinnedSwing";

export default function CursorSwitch({ lines }: { lines: string[] }) {
  const [base, hover] = lines.filter(Boolean);
  const { ref, onPointerMove } = usePinnedSwing<HTMLDivElement>();
  if (!base || !hover) return null;
  const rotation = rotationForSeed(`${base}|${hover}`);

  return (
    <div
      ref={ref}
      className="block-card cursor-switch pinned-photo"
      data-block="cursor-switch"
      style={{ "--photo-rotation": `${rotation}deg` } as React.CSSProperties}
      onPointerMove={onPointerMove}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={base} alt="" className="cursor-switch-layer" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hover} alt="" className="cursor-switch-layer cursor-switch-hover" />
    </div>
  );
}
