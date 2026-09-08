import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

export default function NotebookModel({
  path,
  playSignal,
  isFocused,
}: {
  path: string;
  playSignal: number;
  isFocused: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(path);
  const { actions, mixer } = useAnimations(animations, group);
  const isPlaying = useRef(false);
  const mounted = useRef(false);

  // Click triggers one full play-through; a click mid-playback is ignored
  // (no reset) and the clip only replays after it actually finishes.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true; // skip the initial mount (playSignal starts at 0)
      return;
    }
    if (isPlaying.current) return;
    const action = Object.values(actions)[0];
    if (!action) return;
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    isPlaying.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playSignal]);

  useEffect(() => {
    function onFinished() {
      isPlaying.current = false;
    }
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [mixer]);

  // Snap back to the closed cover once the note leaves focus, so the
  // turntable overview always shows closed notebooks.
  useEffect(() => {
    if (isFocused) return;
    const action = Object.values(actions)[0];
    if (!action) return;
    action.stop();
    action.reset();
    isPlaying.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  return <primitive ref={group} object={scene} />;
}
