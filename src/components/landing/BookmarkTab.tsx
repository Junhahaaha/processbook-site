import * as THREE from "three";
import { useTexture } from "@react-three/drei";

// Cycled by index so a book with several feedback bookmarks shows a mix of
// shapes rather than one repeated tile. White-on-transparent source art
// tints cleanly via the material's `color` (multiply blend) — see
// public/models/bookmarks/.
const BOOKMARK_TEXTURES = [
  "/models/bookmarks/bookmark-01.png",
  "/models/bookmarks/bookmark-02.png",
  "/models/bookmarks/bookmark-03.png",
];

export default function BookmarkTab({
  color,
  offsetX,
  angle,
  variant,
}: {
  color: string;
  offsetX: number;
  angle: number;
  variant: number;
}) {
  const texture = useTexture(BOOKMARK_TEXTURES[variant % BOOKMARK_TEXTURES.length]);
  return (
    <mesh position={[offsetX, 0.96, 0.03]} rotation={[0, 0, angle]}>
      <planeGeometry args={[0.24, 0.42]} />
      <meshStandardMaterial map={texture} color={color} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

// Deterministic per-index spread so bookmarks fan out at different angles
// along the top edge instead of stacking identically (spec: "서로 다른 각도로
// 책에 꽂혀있음"). Kept clear of the left edge, where the spine/rings are.
const MIN_X = -0.15;
const MAX_X = 0.55;

export function layoutBookmarks(count: number) {
  if (count === 0) return [];
  const goldenAngle = 0.61803398875;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const offsetX = MIN_X + t * (MAX_X - MIN_X);
    const angle = (((i * goldenAngle) % 1) - 0.5) * 0.25; // ~±0.125 rad
    return { offsetX, angle, variant: i % BOOKMARK_TEXTURES.length };
  });
}
