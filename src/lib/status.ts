// Status badge values used across item cards and detail pages.
// Open question in the spec (열린 질문 #2): stage count/labels not finalized —
// this is a working default, change freely once decided.
export const STATUS_STAGES = ["계획중", "진행중", "피드백 대기", "완료"] as const;
export type Status = (typeof STATUS_STAGES)[number];

export function normalizeStatus(raw: string | undefined): Status {
  const trimmed = (raw ?? "").trim();
  const match = STATUS_STAGES.find((s) => s === trimmed);
  return match ?? "계획중";
}

export const STATUS_COLOR: Record<Status, string> = {
  "계획중": "var(--status-plan)",
  "진행중": "var(--status-progress)",
  "피드백 대기": "var(--status-feedback)",
  "완료": "var(--status-done)",
};
