import * as THREE from "three";

export default function BookmarkTab({
  color,
  offsetX,
  angle,
}: {
  color: string;
  offsetX: number;
  angle: number;
}) {
  return (
    <mesh position={[offsetX, 0.96, 0.03]} rotation={[0, 0, angle]}>
      <planeGeometry args={[0.24, 0.42]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
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
    return { offsetX, angle };
  });
}
