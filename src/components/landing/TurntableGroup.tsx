import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { springStep } from "./spring";

const TWO_PI = Math.PI * 2;
const SETTLE_STIFFNESS = 22;
const SETTLE_DAMPING = 9;
const MAX_DT = 0.05;
// While coasting faster than this, just decay with friction — don't chase
// the nearest slot yet, or a fast flick re-targets every time it crosses a
// slot boundary and never actually settles (see commit history).
const COAST_THRESHOLD = 0.15;
const COAST_DECAY = 2.5;

export type DragState = { active: boolean; liveAngle: number };

export default function TurntableGroup({
  count,
  dragStateRef,
  forcedTargetRef,
  velocityRef,
  currentAngleRef,
  children,
}: {
  count: number;
  dragStateRef: React.RefObject<DragState>;
  forcedTargetRef: React.RefObject<number | null>;
  velocityRef: React.RefObject<number>;
  currentAngleRef: React.RefObject<number>;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, MAX_DT);
    const step = TWO_PI / count;

    if (dragStateRef.current.active) {
      const prev = g.rotation.y;
      g.rotation.y = dragStateRef.current.liveAngle;
      // Clamp — a single huge pointermove jump (fast flick, or a dropped
      // frame) shouldn't inject a velocity so large the settle takes forever.
      const instant = dt > 0 ? THREE.MathUtils.clamp((g.rotation.y - prev) / dt, -10, 10) : 0;
      velocityRef.current += (instant - velocityRef.current) * 0.35;
    } else if (forcedTargetRef.current === null && Math.abs(velocityRef.current) > COAST_THRESHOLD) {
      // Free coast: pure momentum decay, no target-seeking yet.
      velocityRef.current *= Math.exp(-COAST_DECAY * dt);
      g.rotation.y += velocityRef.current * dt;
    } else {
      let target: number;
      if (forcedTargetRef.current !== null) {
        target = forcedTargetRef.current;
        if (Math.abs(g.rotation.y - target) < 0.01 && Math.abs(velocityRef.current) < 0.05) {
          forcedTargetRef.current = null;
        }
      } else {
        target = Math.round(g.rotation.y / step) * step;
      }

      const stepped = springStep(g.rotation.y, velocityRef.current, target, SETTLE_STIFFNESS, SETTLE_DAMPING, dt);
      g.rotation.y = stepped.value;
      velocityRef.current = stepped.velocity;
    }

    currentAngleRef.current = g.rotation.y;
  });

  return <group ref={group}>{children}</group>;
}
