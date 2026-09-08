"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CSSProperties, PointerEvent, ReactNode, TransitionEvent } from "react";

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
  const [settled, setSettled] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), entranceDelay);
    return () => clearTimeout(t);
  }, [entranceDelay]);

  function handleTransitionEnd(e: TransitionEvent<HTMLAnchorElement>) {
    if (e.propertyName === "transform" && !entranceDone) setEntranceDone(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType !== "mouse" || !entranceDone) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotate(${baseRotation}deg) rotateX(${(-py * 9).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) scale(1.025)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `rotate(${baseRotation}deg)`;
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      style={{
        ...style,
        transform: settled ? `rotate(${baseRotation}deg)` : "rotate(0deg) scale(0.9) translateY(10px)",
        opacity: settled ? 1 : 0,
        transitionProperty: "transform, opacity",
        transitionDuration: entranceDone ? "0.15s" : "0.6s",
        transitionTimingFunction: entranceDone ? "ease-out" : "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      onTransitionEnd={handleTransitionEnd}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </Link>
  );
}
