import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { springStep } from "./spring";

// Same underdamped-spring "knocked by a passing cursor" mechanism as the
// item cards (see ItemCard.tsx), applied to pinned photos instead — a
// pinned photo is lighter/flappier than a whole card, so it's tuned
// noticeably stronger: bigger impulse per pixel of cursor travel, and a
// higher velocity ceiling.
const SWING_STIFFNESS = 80;
const SWING_DAMPING = 5;
const SWING_IMPULSE = 0.4; // deg/s of swing velocity added per px of cursor travel
const SWING_VELOCITY_MAX = 100;
const SWING_SETTLE_EPSILON = 0.02;

/**
 * Drives a `--photo-swing` CSS custom property (degrees) on the returned
 * ref's element, nudged by an impulse proportional to cursor travel on
 * `onPointerMove` and settled back to 0 by a damped spring. Pair with
 * `.pinned-photo`'s `rotate(calc(var(--photo-rotation) + var(--photo-swing)))`.
 */
export function usePinnedSwing<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const swing = useRef({ angle: 0, velocity: 0 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const dx = e.movementX;
    if (!dx) return;
    swing.current.velocity = Math.max(
      -SWING_VELOCITY_MAX,
      Math.min(SWING_VELOCITY_MAX, swing.current.velocity + dx * SWING_IMPULSE)
    );
    if (raf.current != null) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const stepped = springStep(swing.current.angle, swing.current.velocity, 0, SWING_STIFFNESS, SWING_DAMPING, dt);
      swing.current = { angle: stepped.value, velocity: stepped.velocity };
      ref.current?.style.setProperty("--photo-swing", `${swing.current.angle}deg`);
      if (Math.abs(stepped.value) > SWING_SETTLE_EPSILON || Math.abs(stepped.velocity) > SWING_SETTLE_EPSILON) {
        raf.current = requestAnimationFrame(tick);
      } else {
        swing.current = { angle: 0, velocity: 0 };
        ref.current?.style.setProperty("--photo-swing", "0deg");
        raf.current = null;
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  return { ref, onPointerMove };
}
