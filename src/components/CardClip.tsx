export default function CardClip({
  angle,
  offsetX,
  offsetY,
  zIndex,
}: {
  angle: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/card-skins/clip.png"
      alt=""
      className="card-clip"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px) rotate(${angle}deg)`,
        zIndex,
      }}
    />
  );
}
