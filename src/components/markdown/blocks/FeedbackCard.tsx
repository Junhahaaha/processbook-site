export default function FeedbackCard({ color, content }: { color: string; content: string }) {
  return (
    <div
      className="feedback-card"
      data-feedback-block
      data-color={color}
      style={{ borderColor: color, ["--feedback-color" as string]: color }}
    >
      <span className="feedback-card-mark" aria-hidden style={{ background: color }} />
      <p className="feedback-card-text">{content}</p>
    </div>
  );
}
