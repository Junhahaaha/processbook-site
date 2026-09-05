export default function CursorSwitch({ lines }: { lines: string[] }) {
  const [base, hover] = lines.filter(Boolean);
  if (!base || !hover) return null;

  return (
    <div className="block-card cursor-switch group" data-block="cursor-switch">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={base} alt="" className="cursor-switch-layer" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hover} alt="" className="cursor-switch-layer cursor-switch-hover" />
    </div>
  );
}
