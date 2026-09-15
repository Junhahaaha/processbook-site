"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, PointerEvent, ReactNode, TransitionEvent } from "react";
import { springStep } from "@/lib/spring";

// Cards double as draggable notes: a plain click does nothing, a drag moves
// the note around (session-only — no persistence, resets on reload), and a
// double-click (or Enter/Space on keyboard) opens the item. This avoids the
// classic "was that a click or the start of a drag" ambiguity entirely.
const DRAG_THRESHOLD = 4;
const TILT_MAX = 9;

// "Pinned note knocked by a passing cursor" / "pendulum swinging while
// dragged" — both are the same underdamped rotational spring, just fed an
// impulse from different sources (a brush of the cursor vs. the drag
// itself). Underdamped so it overshoots and settles with a little sway
// ("천천히 멈춘다") instead of snapping straight back to 0.
const SWING_STIFFNESS = 90;
const SWING_DAMPING = 6;
const SWING_IMPULSE = 0.2; // deg/s of swing velocity added per px of cursor travel (hover poke)
const SWING_VELOCITY_MAX = 62;
// Actively dragging is a much stronger coupling than a passing hover — a
// fast flick should whip the card noticeably harder, not just plateau at
// the same cap a slow hover-by can already reach.
const DRAG_SWING_IMPULSE = 0.5;
const DRAG_SWING_VELOCITY_MAX = 150;
// The instant you let go (or throw it), the swing switches to this much
// stiffer/firmer spring — it should "stick" with a quick, decisive snap
// rather than keep lazily wobbling the way the live drag does.
const RELEASE_SWING_STIFFNESS = 260;
const RELEASE_SWING_DAMPING = 14;
const SWING_SETTLE_EPSILON = 0.02;

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
  const justReleasedFromDrag = useRef(false);
  const swing = useRef({ angle: 0, velocity: 0 });
  const swingRaf = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), entranceDelay);
    return () => clearTimeout(timer);
  }, [entranceDelay]);

  useEffect(() => {
    return () => {
      if (swingRaf.current != null) cancelAnimationFrame(swingRaf.current);
    };
  }, []);

  function applyTransform() {
    const el = ref.current;
    if (!el) return;
    const s = t.current;
    // perspective() lives in this element's own transform (rather than as a
    // `perspective` CSS property on an ancestor) so the tilt still reads as
    // 3D without making any ancestor a perspective-establishing containing
    // block — that combined with the masonry multicol grid and the clip's
    // absolutely-positioned, masked geometry was the root cause of a real
    // bug where a card's feedback clip rendered oversized and could bleed
    // onto a different card entirely.
    const rotation = baseRotation + swing.current.angle;
    el.style.transform = `translate(${s.dragX}px, ${s.dragY}px) perspective(800px) rotate(${rotation}deg) rotateX(${s.tiltX}deg) rotateY(${s.tiltY}deg) scale(${s.scale})`;
  }

  // Nudges the swing spring with an impulse proportional to how far the
  // cursor moved this event, then (re)starts the settle loop if it isn't
  // already running. One mechanism serves both the hover "poke" and the
  // drag "pendulum" — only the trigger (and how hard it hits) differs.
  function kickSwing(dx: number, impulse: number = SWING_IMPULSE, velocityMax: number = SWING_VELOCITY_MAX) {
    if (dx === 0) return;
    swing.current.velocity = Math.max(
      -velocityMax,
      Math.min(velocityMax, swing.current.velocity + dx * impulse)
    );
    if (swingRaf.current != null) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // Re-checked every frame (not just at kick time) so a release mid-swing
      // switches physics immediately, right when the pointer lifts.
      const stiffness = justReleasedFromDrag.current ? RELEASE_SWING_STIFFNESS : SWING_STIFFNESS;
      const damping = justReleasedFromDrag.current ? RELEASE_SWING_DAMPING : SWING_DAMPING;
      const stepped = springStep(swing.current.angle, swing.current.velocity, 0, stiffness, damping, dt);
      swing.current = { angle: stepped.value, velocity: stepped.velocity };
      applyTransform();
      if (Math.abs(stepped.value) > SWING_SETTLE_EPSILON || Math.abs(stepped.velocity) > SWING_SETTLE_EPSILON) {
        swingRaf.current = requestAnimationFrame(tick);
      } else {
        swing.current = { angle: 0, velocity: 0 };
        swingRaf.current = null;
        justReleasedFromDrag.current = false;
        applyTransform();
      }
    };
    swingRaf.current = requestAnimationFrame(tick);
  }

  function handleTransitionEnd(e: TransitionEvent<HTMLAnchorElement>) {
    if (e.propertyName === "transform" && !entranceDone) setEntranceDone(true);
  }

  function handlePointerDown(e: PointerEvent<HTMLAnchorElement>) {
    if (e.button !== 0) return;
    const el = ref.current;
    if (el) {
      // Pivot the rotation (base tilt, hover tilt, and the swing) around
      // wherever the card was actually grabbed, not its center — offsetX/Y
      // are already local to the element and transform-corrected by the
      // browser, so this is right even though the card sits rotated.
      el.style.transformOrigin = `${e.nativeEvent.offsetX}px ${e.nativeEvent.offsetY}px`;
    }
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
        // dragged like a note on a string: the card lags into a pendulum
        // swing off the drag motion rather than staying rigidly aligned —
        // hit noticeably harder than a passing hover, and scaling further
        // with how fast the drag itself is moving.
        kickSwing(e.movementX, DRAG_SWING_IMPULSE, DRAG_SWING_VELOCITY_MAX);
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
    // a passing cursor "knocks" the pinned card in its direction of travel.
    kickSwing(e.movementX);
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
    // Only worth flagging if there's an active swing loop to actually pick
    // it up and (later) clear it — otherwise the card was already at rest
    // and this flag would just stick, wrongly stiffening the next hover poke.
    if (justDragged.current && swingRaf.current != null) {
      justReleasedFromDrag.current = true;
    }
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
      draggable={false}
      className={className}
      style={{
        ...style,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        transform: settled ? `rotate(${baseRotation}deg)` : "rotate(0deg) scale(0.9) translateY(10px)",
        opacity: settled ? 1 : 0,
        transitionProperty: "transform, opacity",
        transitionDuration: entranceDone ? "0.15s" : "0.6s",
        transitionTimingFunction: entranceDone ? "ease-out" : "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      onTransitionEnd={handleTransitionEnd}
      onDragStart={(e) => e.preventDefault()}
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
