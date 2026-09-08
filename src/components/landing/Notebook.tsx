"use client";

import { Suspense, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import NotebookPlaceholder from "./NotebookPlaceholder";
import NotebookModel from "./NotebookModel";
import BookmarkTab, { layoutBookmarks } from "./BookmarkTab";
import { springStep } from "./spring";
import type { NotebookSubjectData } from "./types";

const ACCENTS = ["#2f5d50", "#3f7cc0", "#c0563f", "#8a5fc7"];
export const RADIUS = 2.3;
const FOCUS_PUSH = 1.4;
const MAX_DT = 0.05;

// Underdamped so the lean overshoots 0 and settles with a little sway
// ("반동의 영향으로 살짝 왔다 갔다") instead of a flat lerp back to rest.
const TILT_STIFFNESS = 140;
const TILT_DAMPING = 9;

// Pure damped coast (no restoring spring) for the free-look drag rotation —
// it should keep drifting a bit after release, not freeze in place.
const EXAMINE_DECAY = 4.5;

export default function Notebook({
  subject,
  index,
  slotAngle,
  isFocused,
  anyFocused,
  velocityRef,
  dragMovedRef,
  onSelect,
  onOpenPassword,
}: {
  subject: NotebookSubjectData;
  index: number;
  slotAngle: number;
  isFocused: boolean;
  anyFocused: boolean;
  velocityRef: React.RefObject<number>;
  dragMovedRef: React.RefObject<boolean>;
  onSelect: (index: number) => void;
  onOpenPassword: (slug: string) => void;
}) {
  const radial = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const examine = useRef<THREE.Group>(null);
  const examineRotation = useRef({ x: 0, y: 0 });
  const examineVelocity = useRef({ x: 0, y: 0 });
  const tiltState = useRef({ value: 0, velocity: 0 });
  const dragStart = useRef<{ x: number; y: number; moved: boolean; lastTime: number } | null>(null);
  const [playSignal, setPlaySignal] = useState(0);

  const bookmarks = layoutBookmarks(subject.bookmarkColors.length);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT);
    const g = radial.current;
    if (!g) return;

    const targetZ = isFocused ? RADIUS + FOCUS_PUSH : RADIUS;
    const targetScale = isFocused ? 1.05 : anyFocused ? 0.7 : 1;
    const targetOpacity = anyFocused && !isFocused ? 0.15 : 1;

    g.position.z += (targetZ - g.position.z) * 0.15;
    g.scale.setScalar(g.scale.x + (targetScale - g.scale.x) * 0.15);

    g.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.Material & { opacity?: number; transparent?: boolean };
        if (mat) {
          mat.transparent = true;
          if (typeof mat.opacity === "number") {
            mat.opacity += (targetOpacity - mat.opacity) * 0.15;
          }
        }
      }
    });

    const ex = examine.current;
    if (ex) {
      if (!isFocused) {
        examineRotation.current.y += (0 - examineRotation.current.y) * 0.2;
        examineRotation.current.x += (0 - examineRotation.current.x) * 0.2;
        examineVelocity.current.y = 0;
        examineVelocity.current.x = 0;
      } else if (!dragStart.current) {
        // released mid-air: keep drifting on the last drag velocity, decaying
        // smoothly instead of stopping dead the instant the pointer lifts.
        const decay = Math.exp(-EXAMINE_DECAY * dt);
        examineVelocity.current.y *= decay;
        examineVelocity.current.x *= decay;
        examineRotation.current.y += examineVelocity.current.y * dt;
        examineRotation.current.x = THREE.MathUtils.clamp(
          examineRotation.current.x + examineVelocity.current.x * dt,
          -0.5,
          0.5
        );
      }
      ex.rotation.y = examineRotation.current.y;
      ex.rotation.x = examineRotation.current.x;
    }

    const tl = tilt.current;
    if (tl) {
      // Lean into the spin so the ring feels physical rather than rigidly
      // locked; settling back to flat gets a small springy overshoot.
      const targetTilt = isFocused
        ? 0
        : THREE.MathUtils.clamp(-velocityRef.current * 0.18, -0.3, 0.3);
      const stepped = springStep(
        tiltState.current.value,
        tiltState.current.velocity,
        targetTilt,
        TILT_STIFFNESS,
        TILT_DAMPING,
        dt
      );
      tiltState.current = stepped;
      tl.rotation.z = stepped.value;
    }
  });

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (dragStart.current?.moved) return; // a drag-to-examine gesture, not a click
    if (anyFocused && !isFocused) return;
    if (!isFocused) {
      if (dragMovedRef.current) return; // this was a carousel-slide drag, not a real click
      onSelect(index);
    }
  }

  function handleDoubleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (!isFocused) return;
    onOpenPassword(subject.slug);
  }

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    if (!isFocused) return;
    e.stopPropagation();
    dragStart.current = { x: e.clientX, y: e.clientY, moved: false, lastTime: performance.now() };
    examineVelocity.current.x = 0;
    examineVelocity.current.y = 0;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    if (!isFocused || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!dragStart.current.moved && Math.abs(dx) + Math.abs(dy) > 3) {
      dragStart.current.moved = true;
      // dragging to rotate the focused note plays its animation once
      // (ignored while already running — see NotebookModel).
      setPlaySignal((c) => c + 1);
    }

    const now = performance.now();
    const dt = Math.max((now - dragStart.current.lastTime) / 1000, 1 / 120);
    const deltaY = dx * 0.01;
    const deltaX = dy * 0.01;
    examineRotation.current.y += deltaY;
    examineRotation.current.x = THREE.MathUtils.clamp(examineRotation.current.x + deltaX, -0.5, 0.5);
    // smoothed, clamped velocity estimate, used to keep drifting after
    // release — clamped so one huge jump between samples can't produce a
    // multi-second coast.
    const rawVy = THREE.MathUtils.clamp(deltaY / dt, -8, 8);
    const rawVx = THREE.MathUtils.clamp(deltaX / dt, -8, 8);
    examineVelocity.current.y += (rawVy - examineVelocity.current.y) * 0.5;
    examineVelocity.current.x += (rawVx - examineVelocity.current.x) * 0.5;

    dragStart.current.x = e.clientX;
    dragStart.current.y = e.clientY;
    dragStart.current.lastTime = now;
  }

  function handlePointerUp() {
    dragStart.current = null;
  }

  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <group rotation={[0, slotAngle, 0]}>
      <group ref={radial} position={[0, 0, RADIUS]}>
        <group ref={tilt}>
          <group
            ref={examine}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {subject.modelPath ? (
              <Suspense fallback={<NotebookPlaceholder accent={accent} />}>
                <NotebookModel path={subject.modelPath} playSignal={playSignal} isFocused={isFocused} />
              </Suspense>
            ) : (
              <NotebookPlaceholder accent={accent} />
            )}
            <Suspense fallback={null}>
              {bookmarks.map((b, i) => (
                <BookmarkTab
                  key={i}
                  color={subject.bookmarkColors[i]}
                  offsetX={b.offsetX}
                  angle={b.angle}
                  variant={b.variant}
                />
              ))}
            </Suspense>
          </group>
        </group>
      </group>
    </group>
  );
}
