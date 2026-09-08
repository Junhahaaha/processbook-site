"use client";

import { Suspense, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import NotebookPlaceholder from "./NotebookPlaceholder";
import NotebookModel from "./NotebookModel";
import BookmarkTab, { layoutBookmarks } from "./BookmarkTab";
import type { NotebookSubjectData } from "./types";

const ACCENTS = ["#2f5d50", "#3f7cc0", "#c0563f", "#8a5fc7"];

export default function Notebook({
  subject,
  index,
  activeIndex,
  dragOffsetRef,
  isFocused,
  anyFocused,
  onSelect,
  onOpenPassword,
}: {
  subject: NotebookSubjectData;
  index: number;
  activeIndex: number;
  dragOffsetRef: React.RefObject<number>;
  isFocused: boolean;
  anyFocused: boolean;
  onSelect: (index: number) => void;
  onOpenPassword: (slug: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [rotating, setRotating] = useState(false);
  const rotation = useRef({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const bookmarks = layoutBookmarks(subject.bookmarkColors.length);

  useFrame(() => {
    const g = group.current;
    if (!g) return;

    const relative = index - activeIndex - dragOffsetRef.current;

    const targetZ = isFocused ? 1.6 : 0;
    const targetScale = isFocused ? 1.35 : anyFocused ? 0.65 : 1;
    const targetTiltY = isFocused ? rotation.current.y : THREE.MathUtils.clamp(relative * 0.5, -0.7, 0.7);
    const targetTiltX = isFocused ? rotation.current.x : 0;
    const targetOpacity = anyFocused && !isFocused ? 0.2 : 1;

    g.position.z += (targetZ - g.position.z) * 0.15;
    g.scale.setScalar(g.scale.x + (targetScale - g.scale.x) * 0.15);
    g.rotation.y += (targetTiltY - g.rotation.y) * 0.15;
    g.rotation.x += (targetTiltX - g.rotation.x) * 0.15;

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
  });

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (anyFocused && !isFocused) return; // clicking a background note while one is focused: ignore
    onSelect(index);
  }

  function handleDoubleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (!isFocused) return;
    onOpenPassword(subject.slug);
  }

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    if (!isFocused) return;
    e.stopPropagation();
    dragStart.current = { x: e.clientX, y: e.clientY };
    setRotating(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    if (!isFocused || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    rotation.current.y += dx * 0.01;
    rotation.current.x = THREE.MathUtils.clamp(rotation.current.x + dy * 0.01, -0.6, 0.6);
    dragStart.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp() {
    dragStart.current = null;
    setRotating(false);
  }

  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <group
      ref={group}
      position={[index * 2.6, 0, 0]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {subject.modelPath ? (
        <Suspense fallback={<NotebookPlaceholder accent={accent} />}>
          <NotebookModel path={subject.modelPath} dragging={rotating} />
        </Suspense>
      ) : (
        <NotebookPlaceholder accent={accent} />
      )}
      {bookmarks.map((b, i) => (
        <BookmarkTab key={i} color={subject.bookmarkColors[i]} offsetY={b.offsetY} angle={b.angle} />
      ))}
    </group>
  );
}
