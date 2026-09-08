import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

export default function NotebookModel({ path, dragging }: { path: string; dragging: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(path);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const first = Object.values(actions)[0];
    if (!first) return;
    if (dragging) {
      first.paused = false;
      first.play();
    } else {
      first.paused = true;
    }
  }, [dragging, actions]);

  return <primitive ref={group} object={scene} />;
}

// Preload happens lazily per-path when first requested; nothing to warm here
// since subject model paths are only known at runtime from public/models.
