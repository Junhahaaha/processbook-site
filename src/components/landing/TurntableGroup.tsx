import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function TurntableGroup({
  targetRef,
  velocityRef,
  children,
}: {
  targetRef: React.RefObject<number>;
  velocityRef: React.RefObject<number>;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const prev = g.rotation.y;
    g.rotation.y += (targetRef.current - g.rotation.y) * 0.12;
    const instant = delta > 0 ? (g.rotation.y - prev) / delta : 0;
    velocityRef.current += (instant - velocityRef.current) * 0.2;
  });

  return <group ref={group}>{children}</group>;
}
