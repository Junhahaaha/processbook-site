// Stand-in geometry used until a real .glb notebook model is dropped into
// public/models/notebooks/ for a subject. Swap happens automatically in
// Notebook.tsx based on whether the file exists.
export default function NotebookPlaceholder({ accent }: { accent: string }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.4, 2, 0.16]} />
        <meshStandardMaterial color="#f1ede4" />
      </mesh>
      <mesh position={[-0.66, 0, 0]}>
        <boxGeometry args={[0.08, 2, 0.17]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}
