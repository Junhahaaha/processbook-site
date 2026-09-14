"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rotationForSeed } from "@/lib/jitter";
import { usePinnedSwing } from "@/lib/usePinnedSwing";

// Detail view is a two-stage relay, not an instant swap:
//  1. thumb-exit  — the pinned photo pops off the note, hangs for a beat,
//                    then drops straight down and off the screen (no fade —
//                    it should read as leaving, not dissolving).
//  2. image-enter — only once the thumbnail is fully gone does the overlay
//                    appear at all: backdrop fades in and the big image
//                    swooshes up into view from below.
//  3. open        — settled, full size.
//  4. image-exit  — (on close) the big image falls back down toward the
//                    thumbnail's actual on-screen spot — measured live, so
//                    it's a real FLIP (not a guess) — shrinking and rotating
//                    into its resting angle, with a little settle-bounce and
//                    a shadow that tightens as it "lands". Once it finishes,
//                    the overlay unmounts and the real thumbnail (already
//                    sitting at that exact spot) is revealed underneath —
//                    no visible handoff.
// Phases only advance forward on a timer; opening/closing can't be
// re-triggered mid-flight, so nothing jump-cuts.
type Phase = "closed" | "thumb-exit" | "image-enter" | "open" | "image-exit";

const THUMB_EXIT_MS = 520;
const IMAGE_ENTER_MS = 480;
const IMAGE_EXIT_MS = 560;

export default function ZoomableImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [fallTo, setFallTo] = useState({ x: 0, y: 0, scale: 1 });
  const { ref: thumbRef, onPointerMove: onSwing } = usePinnedSwing<HTMLImageElement>();
  const overlayImgRef = useRef<HTMLImageElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rotation = rotationForSeed(String(props.src ?? ""));
  const rotationVar = { "--photo-rotation": `${rotation}deg` } as React.CSSProperties;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function schedule(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  function handleOpen() {
    if (phase !== "closed") return;
    setPhase("thumb-exit");
    schedule(() => setPhase("image-enter"), THUMB_EXIT_MS);
    schedule(() => setPhase("open"), THUMB_EXIT_MS + IMAGE_ENTER_MS);
  }

  function handleClose() {
    if (phase !== "open") return;
    const thumb = thumbRef.current;
    const overlayImg = overlayImgRef.current;
    if (thumb && overlayImg) {
      const t = thumb.getBoundingClientRect();
      const o = overlayImg.getBoundingClientRect();
      setFallTo({
        x: t.left + t.width / 2 - (o.left + o.width / 2),
        y: t.top + t.height / 2 - (o.top + o.height / 2),
        scale: o.width > 0 ? t.width / o.width : 1,
      });
    }
    setPhase("image-exit");
    schedule(() => setPhase("closed"), IMAGE_EXIT_MS);
  }

  const showOverlay = phase === "image-enter" || phase === "open" || phase === "image-exit";

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={thumbRef}
        alt=""
        {...props}
        className={`zoomable-image pinned-photo ${phase === "thumb-exit" ? "is-exiting" : ""} ${
          phase === "image-enter" || phase === "open" || phase === "image-exit" ? "is-detached" : ""
        }`}
        style={rotationVar}
        onClick={handleOpen}
        onPointerMove={onSwing}
      />
      {showOverlay &&
        // Portaled to <body>: a lone image in markdown lands inside a <p>,
        // and this overlay <div> can't legally nest inside one (invalid
        // HTML — Chrome logs a nesting/hydration warning and may even
        // force-close the <p> early, splitting the DOM differently than
        // React expects). A portal also sidesteps any ancestor
        // overflow/z-index clipping the fixed overlay might otherwise hit.
        createPortal(
          <div
            className={`zoom-overlay ${phase === "image-exit" ? "is-exiting" : ""}`}
            onClick={handleClose}
            role="dialog"
            aria-modal
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={overlayImgRef}
              src={props.src}
              alt={props.alt ?? ""}
              className={`zoom-overlay-image ${phase === "image-enter" ? "is-entering" : ""} ${
                phase === "image-exit" ? "is-exiting" : ""
              }`}
              style={
                {
                  ...rotationVar,
                  "--fall-x": `${fallTo.x}px`,
                  "--fall-y": `${fallTo.y}px`,
                  "--fall-scale": fallTo.scale,
                } as React.CSSProperties
              }
            />
          </div>,
          document.body
        )}
    </>
  );
}
