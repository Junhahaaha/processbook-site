export default function CardClip({
  color,
  offsetX,
  zIndex,
}: {
  color: string;
  offsetX: number;
  zIndex: number;
}) {
  return (
    <div
      className="card-clip"
      style={{
        transform: `translateX(${offsetX}px)`,
        backgroundColor: color,
        zIndex,
      }}
    />
  );
}
