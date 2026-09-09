"use client";

import { useState } from "react";
import { rotationForSeed } from "@/lib/jitter";

export default function ZoomableImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [open, setOpen] = useState(false);
  const rotation = rotationForSeed(String(props.src ?? ""));
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        {...props}
        className="zoomable-image pinned-photo"
        style={{ "--photo-rotation": `${rotation}deg` } as React.CSSProperties}
        onClick={() => setOpen(true)}
      />
      {open && (
        <div className="zoom-overlay" onClick={() => setOpen(false)} role="dialog" aria-modal>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.src} alt={props.alt ?? ""} className="zoom-overlay-image" />
        </div>
      )}
    </>
  );
}
