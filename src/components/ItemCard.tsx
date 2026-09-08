"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, PointerEvent, ReactNode, TransitionEvent } from "react";

// Cards double as draggable notes: a plain click does nothing, a drag moves
// the note around (session-only — no persistence, resets on reload), and a
// double-click (or Enter/Space on keyboard) opens the item. This avoids the
// classic "was that a click or the start of a drag" ambiguity entirely.
const DRAG_THRESHOLD = 4;
const TILT_MAX = 9;

export default function ItemCard({
  href,
  className,
  style,
  baseRotation,
  entranceDelay,
  children,
}: {
  href: string;
  className: string;
  style?: CSSProperties;
  baseRotation: number;
  entranceDelay: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const router = useRouter();
  const [settled, setSettled] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);

  const t = useRef({ dragX: 0, dragY: 0, tiltX: 0, tiltY: 0, scale: 1 });
  const dragStart = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const justDragged = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), entranceDelay);
    return () => clearTimeout(timer);
  }, [entranceDelay]);

  function applyTransform() {
    const el = ref.current;
    if (!el) return;
    const s = t.current;
    el.style.transform = `translate(${s.dragX}px, ${s.dragY}px) rotate(${baseRotation}deg) rotateX(${s.tiltX}deg) rotateY(${s.tiltY}deg) scale(${s.scale})`;
  }

  function handleTransitionEnd(e: TransitionEvent<HTMLAnchorElement>) {
    if (e.propertyName === "transform" && !entranceDone) setEntranceDone(true);
  }

  function handlePointerDown(e: PointerEvent<HTMLAnchorElement>) {
    if (e.button !== 0) return;
    dragStart.current = { x: e.clientX, y: e.clientY, originX: t.current.dragX, originY: t.current.dragY };
    justDragged.current = false;
    ref.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;

    if (dragStart.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (!justDragged.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        justDragged.current = true;
        el.style.transitionProperty = "none"; // no lag while actively dragging
        el.style.zIndex = "30";
        el.style.cursor = "grabbing";
      }
      if (justDragged.current) {
        t.current.dragX = dragStart.current.originX + dx;
        t.current.dragY = dragStart.current.originY + dy;
        applyTransform();
      }
      return;
    }

    if (e.pointerType !== "mouse" || !entranceDone) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    t.current.tiltX = -py * TILT_MAX;
    t.current.tiltY = px * TILT_MAX;
    t.current.scale = 1.025;
    applyTransform();
  }

  function resetTilt() {
    t.current.tiltX = 0;
    t.current.tiltY = 0;
    t.current.scale = 1;
    applyTransform();
  }

  function handlePointerUp() {
    if (!dragStart.current) return;
    dragStart.current = null;
    const el = ref.current;
    if (el) {
      el.style.transitionProperty = "transform, opacity";
      el.style.cursor = "grab";
    }
    resetTilt();
  }

  function handlePointerLeave() {
    if (dragStart.current) return; // pointer capture keeps the drag going
    resetTilt();
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault(); // navigation happens on dblclick / keyboard, not a plain click
  }

  function handleDoubleClick() {
    if (justDragged.current) {
      justDragged.current = false; // the dblclick that ends a drag shouldn't also navigate
      return;
    }
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(href);
    }
  }

  return (
    <a
      ref={ref}
      href={href}
      className={className}
      style={{
        ...style,
        touchAction: "none",
        transform: settled ? `rotate(${baseRotation}deg)` : "rotate(0deg) scale(0.9) translateY(10px)",
        opacity: settled ? 1 : 0,
        transitionProperty: "transform, opacity",
        transitionDuration: entranceDone ? "0.15s" : "0.6s",
        transitionTimingFunction: entranceDone ? "ease-out" : "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      onTransitionEnd={handleTransitionEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </a>
  );
}
