import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function TurntableGroup({
  targetRef,
  children,
}: {
  targetRef: React.RefObject<number>;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += (targetRef.current - g.rotation.y) * 0.12;
  });

  return <group ref={group}>{children}</group>;
}
