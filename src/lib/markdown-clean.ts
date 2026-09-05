// Shared helpers for pulling structured pieces (checklist, frontmatter body)
// out of otherwise free-form markdown authored in Obsidian.

export type ChecklistItem = { label: string; checked: boolean };

const CHECKLIST_HEADING = /^##\s*진행\s*상태\s*$/m;

/**
 * Pulls the "## 진행 상태" checklist section out of a note body so it can be
 * rendered as a progress bar instead of a plain list, and returns the body
 * with that section removed.
 */
export function extractProgressChecklist(body: string): {
  checklist: ChecklistItem[];
  body: string;
} {
  const lines = body.split("\n");
  const headingIndex = lines.findIndex((l) => CHECKLIST_HEADING.test(l.trim()));
  if (headingIndex === -1) return { checklist: [], body };

  let end = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const section = lines.slice(headingIndex + 1, end);
  const checklist: ChecklistItem[] = [];
  for (const line of section) {
    const m = line.match(/^\s*-\s*\[( |x|X)\]\s*(.+)$/);
    if (m) checklist.push({ checked: m[1].toLowerCase() === "x", label: m[2].trim() });
  }

  const remaining = [...lines.slice(0, headingIndex), ...lines.slice(end)].join("\n");
  return { checklist, body: remaining.trim() };
}

export function checklistPercent(checklist: ChecklistItem[]): number {
  if (checklist.length === 0) return 0;
  const done = checklist.filter((c) => c.checked).length;
  return Math.round((done / checklist.length) * 100);
}
