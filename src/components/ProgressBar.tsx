export default function ProgressBar({ percent, compact = false }: { percent: number; compact?: boolean }) {
  return (
    <div className={`progress-bar ${compact ? "progress-bar-compact" : ""}`}>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-bar-label">{percent}%</span>
    </div>
  );
}
