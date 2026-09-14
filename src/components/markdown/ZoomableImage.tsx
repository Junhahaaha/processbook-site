"use client";

import { useEffect, useRef, useState } from "react";
import { rotationForSeed } from "@/lib/jitter";

// Detail view is a two-stage relay rather than an instant swap:
//  1. thumb-exit  — the pinned photo pops off the note, pauses, then drops
//                    away (see .zoomable-image.is-exiting keyframes).
//  2. image-enter — the big image swooshes up into view from below.
//  3. open        — settled, full size.
//  4. image-exit  — (on close) the big image falls back down, rotating into
//                    the thumbnail's resting angle so it lands looking like
//                    the same photo re-pinned to the note.
// Phases only advance forward on a timer; closing is only accepted once
// fully "open" so an interrupted animation can't jump-cut mid-flight.
type Phase = "closed" | "thumb-exit" | "image-enter" | "open" | "image-exit";

const THUMB_EXIT_MS = 520;
const IMAGE_ENTER_MS = 480;
const IMAGE_EXIT_MS = 460;

export default function ZoomableImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [phase, setPhase] = useState<Phase>("closed");
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
    setPhase("image-exit");
    schedule(() => setPhase("closed"), IMAGE_EXIT_MS);
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        {...props}
        className={`zoomable-image pinned-photo ${phase === "thumb-exit" ? "is-exiting" : ""} ${
          phase === "image-enter" || phase === "open" || phase === "image-exit" ? "is-detached" : ""
        }`}
        style={rotationVar}
        onClick={handleOpen}
      />
      {phase !== "closed" && (
        <div
          className={`zoom-overlay ${phase === "image-exit" ? "is-closing" : ""}`}
          onClick={handleClose}
          role="dialog"
          aria-modal
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.src}
            alt={props.alt ?? ""}
            className={`zoom-overlay-image ${phase === "thumb-exit" ? "is-waiting" : ""} ${
              phase === "image-enter" ? "is-entering" : ""
            } ${phase === "image-exit" ? "is-exiting" : ""}`}
            style={rotationVar}
          />
        </div>
      )}
    </>
  );
}
