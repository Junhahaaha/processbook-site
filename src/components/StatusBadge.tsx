import { STATUS_COLOR, type Status } from "@/lib/status";

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="status-badge" style={{ ["--status-color" as string]: STATUS_COLOR[status] }}>
      {status}
    </span>
  );
}
