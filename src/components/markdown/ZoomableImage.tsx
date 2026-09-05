"use client";

import { useState } from "react";

export default function ZoomableImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" {...props} className="zoomable-image" onClick={() => setOpen(true)} />
      {open && (
        <div className="zoom-overlay" onClick={() => setOpen(false)} role="dialog" aria-modal>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.src} alt={props.alt ?? ""} className="zoom-overlay-image" />
        </div>
      )}
    </>
  );
}
