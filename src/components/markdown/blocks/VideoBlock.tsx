export default function VideoBlock({ src }: { src: string }) {
  if (!src) return null;
  return (
    <div className="block-card" data-block="video">
      <video src={src} controls className="video-el" />
    </div>
  );
}
