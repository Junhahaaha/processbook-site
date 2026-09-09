"use client";

import { Suspense, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import Notebook from "./Notebook";
import TurntableGroup, { type DragState } from "./TurntableGroup";
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
  const currentAngleRef = useRef(0);
  const angularVelocityRef = useRef(0);
  const dragStateRef = useRef<DragState>({ active: false, liveAngle: 0 });
  const forcedTargetRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const dragAnchor = useRef<{ x: number; startAngle: number } | null>(null);

  const slotAngle = (i: number) => (i * TWO_PI) / subjects.length;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (focusedIndex !== null) return;
      dragAnchor.current = { x: e.clientX, startAngle: currentAngleRef.current };
      dragMovedRef.current = false;
      dragStateRef.current.active = true;
      dragStateRef.current.liveAngle = currentAngleRef.current;
    },
    [focusedIndex]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragAnchor.current) return;
    const dx = e.clientX - dragAnchor.current.x;
    if (Math.abs(dx) > 5) dragMovedRef.current = true;
    dragStateRef.current.liveAngle = dragAnchor.current.startAngle + dx * DRAG_SENSITIVITY;
  }, []);

  const endDrag = useCallback(() => {
    if (!dragAnchor.current) return;
    dragAnchor.current = null;
    dragStateRef.current.active = false;
    // No explicit snap here — TurntableGroup's spring settles to the
    // nearest slot on its own, carrying over whatever velocity the drag
    // ended with (see request: gradual, not sudden, stop).
  }, []);

  const handleSelect = useCallback((index: number) => {
    forcedTargetRef.current = frontFacingTarget(currentAngleRef.current, slotAngle(index));
    setFocusedIndex(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <Canvas
          camera={{ position: [0, 0, 7.5], fov: 42 }}
          onPointerMissed={(e) => {
            if (e.type === "click" && focusedIndex !== null) handleUnfocus();
          }}
        >
          <ambientLight intensity={0.55} />
          <hemisphereLight args={["#fffaf0", "#3d3527", 0.6]} />
          <directionalLight position={[4, 5, 6]} intensity={1.9} />
          <directionalLight position={[-4, -2, 3]} intensity={0.45} />
          {/* Local, offline env map (baked once from these lightformers — no
              network fetch, so no risk of the Suspense hang a CDN HDR caused
              earlier) — gives smooth/glossy note surfaces a soft reflected
              highlight from more angles, including when a focused note is
              turned around to its back, instead of relying only on the two
              directional lights above lining up just right. */}
          <Suspense fallback={null}>
            <Environment resolution={64} environmentIntensity={0.6}>
              <Lightformer form="rect" intensity={1.4} color="#fff7ea" position={[3, 4, 5]} scale={[4, 2.5, 1]} target={[0, 0, 0]} />
              <Lightformer form="rect" intensity={0.6} color="#dbe6ff" position={[-4, 1, -4]} scale={[3, 3, 1]} target={[0, 0, 0]} />
              <Lightformer form="ring" intensity={0.5} color="#ffffff" position={[0, 2, -6]} scale={3} target={[0, 0, 0]} />
            </Environment>
          </Suspense>
          <TurntableGroup
            count={subjects.length}
            dragStateRef={dragStateRef}
            forcedTargetRef={forcedTargetRef}
            velocityRef={angularVelocityRef}
            currentAngleRef={currentAngleRef}
          >
            {subjects.map((subject, i) => (
              <Notebook
                key={subject.slug}
                subject={subject}
                index={i}
                slotAngle={slotAngle(i)}
                isFocused={focusedIndex === i}
                anyFocused={focusedIndex !== null}
                velocityRef={angularVelocityRef}
                dragMovedRef={dragMovedRef}
                onSelect={handleSelect}
                onOpenPassword={setPasswordSlug}
              />
            ))}
          </TurntableGroup>
        </Canvas>

        {focusedIndex !== null && (
          <p className="notebook-hint">드래그로 회전(애니메이션 재생) · 빈 곳 클릭으로 뒤로 · 더블클릭으로 열기</p>
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
