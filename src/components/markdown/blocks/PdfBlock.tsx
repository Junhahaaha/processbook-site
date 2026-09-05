export default function PdfBlock({ src }: { src: string }) {
  if (!src) return null;
  return (
    <div className="block-card pdf-block" data-block="pdf">
      <iframe src={src} className="pdf-frame" title="PDF preview" />
    </div>
  );
}
