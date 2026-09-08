"use client";

import { Suspense, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import NotebookPlaceholder from "./NotebookPlaceholder";
import NotebookModel from "./NotebookModel";
import BookmarkTab, { layoutBookmarks } from "./BookmarkTab";
import type { NotebookSubjectData } from "./types";

const ACCENTS = ["#2f5d50", "#3f7cc0", "#c0563f", "#8a5fc7"];
export const RADIUS = 2.3;
const FOCUS_PUSH = 2.3;

export default function Notebook({
  subject,
  index,
  slotAngle,
  isFocused,
  anyFocused,
  onSelect,
  onOpenPassword,
}: {
  subject: NotebookSubjectData;
  index: number;
  slotAngle: number;
  isFocused: boolean;
  anyFocused: boolean;
  onSelect: (index: number) => void;
  onOpenPassword: (slug: string) => void;
}) {
  const radial = useRef<THREE.Group>(null);
  const examine = useRef<THREE.Group>(null);
  const examineRotation = useRef({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [playSignal, setPlaySignal] = useState(0);

  const bookmarks = layoutBookmarks(subject.bookmarkColors.length);

  useFrame(() => {
    const g = radial.current;
    if (!g) return;

    const targetZ = isFocused ? RADIUS + FOCUS_PUSH : RADIUS;
    const targetScale = isFocused ? 1.3 : anyFocused ? 0.7 : 1;
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
      const targetY = isFocused ? examineRotation.current.y : 0;
      const targetX = isFocused ? examineRotation.current.x : 0;
      ex.rotation.y += (targetY - ex.rotation.y) * 0.15;
      ex.rotation.x += (targetX - ex.rotation.x) * 0.15;
    }
  });

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (dragStart.current?.moved) return; // a drag-to-examine gesture, not a click
    if (anyFocused && !isFocused) return;
    if (isFocused) {
      // click on the already-focused note: play its animation once (ignored
      // while already running — see NotebookModel).
      setPlaySignal((c) => c + 1);
    } else {
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
    dragStart.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    if (!isFocused || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragStart.current.moved = true;
    examineRotation.current.y += dx * 0.01;
    examineRotation.current.x = THREE.MathUtils.clamp(examineRotation.current.x + dy * 0.01, -0.5, 0.5);
    dragStart.current.x = e.clientX;
    dragStart.current.y = e.clientY;
  }

  function handlePointerUp() {
    dragStart.current = null;
  }

  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <group rotation={[0, slotAngle, 0]}>
      <group ref={radial} position={[0, 0, RADIUS]}>
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
          {bookmarks.map((b, i) => (
            <BookmarkTab key={i} color={subject.bookmarkColors[i]} offsetY={b.offsetY} angle={b.angle} />
          ))}
        </group>
      </group>
    </group>
  );
}
