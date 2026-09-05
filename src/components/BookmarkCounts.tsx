export default function BookmarkCounts({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return (
    <div className="bookmark-counts" aria-label="피드백 개수">
      {entries.map(([color, count]) => (
        <span key={color} className="bookmark-count-chip" style={{ color }}>
          ● {count}
        </span>
      ))}
    </div>
  );
}
