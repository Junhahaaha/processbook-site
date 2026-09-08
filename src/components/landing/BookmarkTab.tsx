import * as THREE from "three";

export default function BookmarkTab({
  color,
  offsetY,
  angle,
}: {
  color: string;
  offsetY: number;
  angle: number;
}) {
  return (
    <mesh position={[-0.66, offsetY, 0.03]} rotation={[0, 0, angle]}>
      <planeGeometry args={[0.24, 0.42]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Deterministic per-index spread so bookmarks fan out at different angles
// along the spine instead of stacking identically (spec: "서로 다른 각도로
// 책에 꽂혀있음").
export function layoutBookmarks(count: number) {
  if (count === 0) return [];
  const range = 1.1; // vertical spread along the spine
  const goldenAngle = 0.61803398875;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const offsetY = range / 2 - t * range;
    const angle = (((i * goldenAngle) % 1) - 0.5) * 0.5; // ~±0.25 rad
    return { offsetY, angle };
  });
}
