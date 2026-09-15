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

// Wrap an angle in degrees to (-180, 180].
function wrapDegrees(deg: number): number {
  const wrapped = ((deg + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}

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
  // While actively held, the swing doesn't relax back to 0 — it relaxes
  // toward the angle where the card's center of mass hangs below the grab
  // point, like a real pendulum. Recomputed once per grab (the held point
  // doesn't move relative to the card during one drag).
  const dragGravityTarget = useRef(0);
  // The transform-origin actually in effect right now (local, untransformed
  // px), so a new grab can compensate for moving it — see handlePointerDown.
  // null until the first grab, when it defaults to the box's own center
  // (the CSS initial value, "50% 50%").
  const currentOrigin = useRef<{ x: number; y: number } | null>(null);

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

  // Runs the settle loop if it isn't already running — used both after an
  // impulse kick and right on grab, since gravity should start pulling the
  // card toward its equilibrium the moment it's held, even before the
  // cursor moves at all.
  function ensureSwingLoop() {
    if (swingRaf.current != null) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // dragGravityTarget is the resting angle from here on, not just while
      // held — releasing doesn't revert to flat, it leaves the card hanging
      // wherever gravity settled it (or exactly flat, if the last grab was
      // near enough to center that the target is still 0). A later grab
      // overwrites it with a freshly computed target for the new grab point.
      const target = dragGravityTarget.current;
      const stiffness = justReleasedFromDrag.current ? RELEASE_SWING_STIFFNESS : SWING_STIFFNESS;
      const damping = justReleasedFromDrag.current ? RELEASE_SWING_DAMPING : SWING_DAMPING;
      const stepped = springStep(swing.current.angle, swing.current.velocity, target, stiffness, damping, dt);
      swing.current = { angle: stepped.value, velocity: stepped.velocity };
      applyTransform();
      if (Math.abs(stepped.value - target) > SWING_SETTLE_EPSILON || Math.abs(stepped.velocity) > SWING_SETTLE_EPSILON) {
        swingRaf.current = requestAnimationFrame(tick);
      } else {
        swing.current = { angle: target, velocity: 0 };
        swingRaf.current = null;
        justReleasedFromDrag.current = false;
        applyTransform();
      }
    };
    swingRaf.current = requestAnimationFrame(tick);
  }

  // Nudges the swing spring with an impulse proportional to how far the
  // cursor moved this event, then ensures the settle loop is running. One
  // mechanism serves both the hover "poke" and the drag "pendulum" — only
  // the trigger (and how hard it hits) differs.
  function kickSwing(dx: number, impulse: number = SWING_IMPULSE, velocityMax: number = SWING_VELOCITY_MAX) {
    if (dx === 0) return;
    swing.current.velocity = Math.max(
      -velocityMax,
      Math.min(velocityMax, swing.current.velocity + dx * impulse)
    );
    ensureSwingLoop();
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
      const grabX = e.nativeEvent.offsetX;
      const grabY = e.nativeEvent.offsetY;

      // Moving transform-origin mid-rotation is not visually a no-op: the
      // same rotate() angle traces a different arc around a different
      // pivot, so switching the origin outright made the card instantly
      // jump to a different screen position the moment it was re-grabbed
      // (looking like it snapped back toward flat before swinging out
      // again to the new pivot). Compensate by shifting the translate so
      // the box stays exactly where it currently is at the instant of the
      // switch — only *then* does the spring start animating the angle
      // toward the new grab's target, with no jump to animate away from.
      // For a rotation R by the current angle (plus current hover scale)
      // around old origin O, switching to new origin O' needs a
      // translate delta of -(I - R) * (O' - O) to hold the box fixed.
      // Doing this correction through the lingering CSS transition left on
      // from the last release (transitionProperty stays "transform,
      // opacity" until a real drag starts) would smooth this one large,
      // supposed-to-be-invisible jump into a very visible 150ms slide
      // through the wrong in-between state — turn it off first so the
      // correction actually lands instantly, same frame.
      el.style.transitionProperty = "none";
      const prevOrigin = currentOrigin.current ?? { x: el.offsetWidth / 2, y: el.offsetHeight / 2 };
      const currentAngleRad = ((baseRotation + swing.current.angle) * Math.PI) / 180;
      const s = t.current.scale;
      const cos = Math.cos(currentAngleRad) * s;
      const sin = Math.sin(currentAngleRad) * s;
      const dOx = grabX - prevOrigin.x;
      const dOy = grabY - prevOrigin.y;
      t.current.dragX -= dOx - (dOx * cos - dOy * sin);
      t.current.dragY -= dOy - (dOx * sin + dOy * cos);

      el.style.transformOrigin = `${grabX}px ${grabY}px`;
      currentOrigin.current = { x: grabX, y: grabY };
      applyTransform();

      // Gravity target: the angle that swings the center of mass to hang
      // directly below the grab point. gx/gy is the grab point's offset
      // from center; the center of mass sits at -gx/-gy relative to the
      // grab point, and we solve for the rotation that points that vector
      // straight down (CSS's rotate() is clockwise-positive in screen
      // (Y-down) coordinates, so this is a plain 2D rotation solve in
      // screen space, not "true" 3D gravity). This is the FULL angle,
      // un-scaled — a pendulum's resting angle only depends on the
      // direction from pivot to center of mass, not on the lever length
      // (that only affects how fast it gets there, which the spring's
      // constant stiffness already approximates well enough here). A
      // previous version scaled the angle down by how close the grab was
      // to the exact corner, which was wrong: it meant only a literal
      // corner grab ever reached the true equilibrium, so a side-edge grab
      // (a shorter, purely-horizontal-or-vertical lever) stopped partway,
      // and a bottom-edge grab never reached the full 180° flip it should.
      // Only truly near-center grabs (lever ~0) fall back to 0, since the
      // direction is undefined right at the center of mass itself.
      const centerX = el.offsetWidth / 2;
      const centerY = el.offsetHeight / 2;
      const gx = grabX - centerX;
      const gy = grabY - centerY;
      const lever = Math.hypot(gx, gy);
      if (lever > 2) {
        const equilibrium = 90 - (Math.atan2(-gy, -gx) * 180) / Math.PI;
        dragGravityTarget.current = wrapDegrees(equilibrium);
      } else {
        dragGravityTarget.current = 0;
      }
    }
    dragStart.current = { x: e.clientX, y: e.clientY, originX: t.current.dragX, originY: t.current.dragY };
    justDragged.current = false;
    // Gravity should start pulling the instant it's held, not only once the
    // cursor first moves — and must run regardless of what setPointerCapture
    // below does, so it comes first.
    ensureSwingLoop();
    try {
      ref.current?.setPointerCapture(e.pointerId);
    } catch {
      // Ignored: capture can legitimately fail (e.g. the pointer was
      // already released) without affecting the drag/swing logic above.
    }
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
    dragStart.current = null;
    // If it hadn't finished converging on the gravity target yet (still
    // actively swinging, or the loop had already stopped and needs waking
    // back up), releasing gets the firm "stick" treatment to settle in
    // quickly rather than keep wobbling. The target itself doesn't change
    // on release — the card just stays hanging wherever it settles.
    if (
      Math.abs(swing.current.angle - dragGravityTarget.current) > SWING_SETTLE_EPSILON ||
      Math.abs(swing.current.velocity) > SWING_SETTLE_EPSILON
    ) {
      justReleasedFromDrag.current = true;
    }
    ensureSwingLoop();
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
