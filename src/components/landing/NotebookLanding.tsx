"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import Notebook from "./Notebook";
import TurntableGroup from "./TurntableGroup";
import PasswordGate from "./PasswordGate";
import type { NotebookSubjectData } from "./types";

const TWO_PI = Math.PI * 2;
const DRAG_SENSITIVITY = 0.008; // radians per pixel

function normalize(angle: number) {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

/** Shortest-path target so `slotAngle` ends up facing front (world angle 0). */
function frontFacingTarget(current: number, slotAngle: number) {
  const desired = normalize(-slotAngle);
  const currentMod = normalize(current);
  let diff = desired - currentMod;
  if (diff > Math.PI) diff -= TWO_PI;
  if (diff < -Math.PI) diff += TWO_PI;
  return current + diff;
}

export default function NotebookLanding({ subjects }: { subjects: NotebookSubjectData[] }) {
  const router = useRouter();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [passwordSlug, setPasswordSlug] = useState<string | null>(null);
  const rotationTargetRef = useRef(0);
  const dragStart = useRef<{ x: number; startRotation: number } | null>(null);

  const slotAngle = (i: number) => (i * TWO_PI) / subjects.length;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (focusedIndex !== null) return;
      dragStart.current = { x: e.clientX, startRotation: rotationTargetRef.current };
    },
    [focusedIndex]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    rotationTargetRef.current = dragStart.current.startRotation + dx * DRAG_SENSITIVITY;
  }, []);

  const endDrag = useCallback(() => {
    if (!dragStart.current) return;
    dragStart.current = null;
    const step = TWO_PI / subjects.length;
    rotationTargetRef.current = Math.round(rotationTargetRef.current / step) * step;
  }, [subjects.length]);

  const handleSelect = useCallback(
    (index: number) => {
      rotationTargetRef.current = frontFacingTarget(rotationTargetRef.current, slotAngle(index));
      setFocusedIndex(index);
    },
    [subjects.length] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleUnfocus = useCallback(() => {
    setFocusedIndex(null);
  }, []);

  const activeSubject = passwordSlug ? subjects.find((s) => s.slug === passwordSlug) : undefined;

  return (
    <div className="notebook-landing">
      <div
        className="notebook-canvas-wrap"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <Canvas camera={{ position: [0, 0, 7.5], fov: 42 }}>
          <ambientLight intensity={1.6} />
          <hemisphereLight args={["#fffaf0", "#3d3527", 1.1]} />
          <directionalLight position={[3, 4, 5]} intensity={1.8} />
          <directionalLight position={[-3, -1, 3]} intensity={0.8} />
          <directionalLight position={[0, 2, -4]} intensity={0.5} />
          <TurntableGroup targetRef={rotationTargetRef}>
            {subjects.map((subject, i) => (
              <Notebook
                key={subject.slug}
                subject={subject}
                index={i}
                slotAngle={slotAngle(i)}
                isFocused={focusedIndex === i}
                anyFocused={focusedIndex !== null}
                onSelect={handleSelect}
                onOpenPassword={setPasswordSlug}
              />
            ))}
          </TurntableGroup>
        </Canvas>

        {focusedIndex !== null && (
          <button className="notebook-back" onClick={handleUnfocus}>
            ← 뒤로
          </button>
        )}

        {focusedIndex !== null && (
          <p className="notebook-hint">드래그로 회전 · 클릭으로 애니메이션 재생 · 더블클릭으로 열기</p>
        )}
      </div>

      {activeSubject && (
        <PasswordGate
          subjectSlug={activeSubject.slug}
          subjectName={activeSubject.name}
          onClose={() => setPasswordSlug(null)}
          onCorrect={() => router.push(`/${activeSubject.slug}`)}
        />
      )}
    </div>
  );
}
