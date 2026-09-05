export default function Sticker({ lines }: { lines: string[] }) {
  const [frame1, frame2] = lines.filter(Boolean);
  if (!frame1 || !frame2) return null;

  return (
    <span className="sticker" data-block="sticker">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frame1} alt="" className="sticker-frame sticker-frame-1" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frame2} alt="" className="sticker-frame sticker-frame-2" />
    </span>
  );
}
