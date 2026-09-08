"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import Notebook from "./Notebook";
import PasswordGate from "./PasswordGate";
import type { NotebookSubjectData } from "./types";

const PIXELS_PER_UNIT = 160;

export default function NotebookLanding({ subjects }: { subjects: NotebookSubjectData[] }) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [passwordSlug, setPasswordSlug] = useState<string | null>(null);
  const dragOffsetRef = useRef(0);
  const dragState = useRef<{ startX: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (focusedIndex !== null) return;
      dragState.current = { startX: e.clientX };
    },
    [focusedIndex]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    dragOffsetRef.current = -(e.clientX - dragState.current.startX) / PIXELS_PER_UNIT;
  }, []);

  const endDrag = useCallback(() => {
    if (!dragState.current) return;
    dragState.current = null;
    const deltaIndex = Math.round(dragOffsetRef.current);
    setActiveIndex((i) => Math.min(subjects.length - 1, Math.max(0, i + deltaIndex)));
    dragOffsetRef.current = 0;
  }, [subjects.length]);

  const handleSelect = useCallback((index: number) => {
    setActiveIndex(index);
    setFocusedIndex(index);
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
        <Canvas camera={{ position: [0, 0, 6], fov: 40 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 4, 5]} intensity={1.1} />
          <directionalLight position={[-3, -2, 2]} intensity={0.3} />
          {subjects.map((subject, i) => (
            <Notebook
              key={subject.slug}
              subject={subject}
              index={i}
              activeIndex={activeIndex}
              dragOffsetRef={dragOffsetRef}
              isFocused={focusedIndex === i}
              anyFocused={focusedIndex !== null}
              onSelect={handleSelect}
              onOpenPassword={setPasswordSlug}
            />
          ))}
        </Canvas>

        {focusedIndex === null && (
          <div className="notebook-labels">
            {subjects.map((s, i) => (
              <button
                key={s.slug}
                className={`notebook-label ${i === activeIndex ? "active" : ""}`}
                onClick={() => setActiveIndex(i)}
              >
                {s.code}
              </button>
            ))}
          </div>
        )}

        {focusedIndex !== null && (
          <button className="notebook-back" onClick={handleUnfocus}>
            ← 뒤로
          </button>
        )}

        {focusedIndex !== null && (
          <p className="notebook-hint">드래그해서 회전 · 더블클릭으로 열기</p>
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
