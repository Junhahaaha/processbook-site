"use client";

import { useEffect, useRef, useState } from "react";
import BookmarkIcon from "@/components/BookmarkIcon";
import { colorForIndex } from "@/lib/colors";

type Tool = "highlight" | "bookmark";
type Status = "idle" | "sending" | "error";

type Pending = {
  tool: Tool;
  quote: string;
  x: number;
  y: number;
  // Kept only for "highlight": the live range to wrap once the submission
  // succeeds, so the mark only appears after it's actually been recorded.
  range?: Range;
  // Kept only for "bookmark": where to drop the marker once submitted, and
  // the color/variant it'll show as (picked up-front so the popover can
  // preview it).
  anchorEl?: HTMLElement;
  color?: string;
  variant?: number;
};

const BLOCK_SELECTOR = "p, li, h1, h2, h3, h4, blockquote, td, figcaption";
const CODE_STORAGE_PREFIX = "feedback-code:";

// Wraps the text nodes intersecting `range` in <mark class="highlight-mark">,
// splitting any text node that only partially falls inside the range. This
// mutates the live DOM directly (no React re-render involved), which is safe
// here because .prose-content is rendered once from static markdown and
// nothing else re-renders that subtree while the reader is annotating.
function wrapRangeAsHighlight(range: Range) {
  const root = range.commonAncestorContainer;
  const nodes: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) {
    nodes.push(root as Text);
  } else {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (range.intersectsNode(n)) nodes.push(n as Text);
    }
  }

  for (const node of nodes) {
    const len = node.length;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : len;
    if (start >= end) continue;

    let target = node;
    if (end < len) target.splitText(end);
    if (start > 0) target = target.splitText(start);

    const mark = document.createElement("mark");
    mark.className = "highlight-mark user-highlight-mark";
    target.parentNode?.insertBefore(mark, target);
    mark.appendChild(target);
  }
}

function truncate(s: string, max: number) {
  const trimmed = s.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max).trim() + "…" : trimmed;
}

export default function AnnotationToolbar({
  subjectSlug,
  itemSlug,
}: {
  subjectSlug: string;
  itemSlug: string;
}) {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [memo, setMemo] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const activeToolRef = useRef<Tool | null>(null);
  activeToolRef.current = activeTool;
  // Cycles through the shared bookmark palette so bookmarks placed in one
  // page view read as distinct from each other, same idea as the per-page
  // feedback-block coloring (see lib/colors.ts).
  const bookmarkCounter = useRef(0);

  useEffect(() => {
    const storedCode = sessionStorage.getItem(CODE_STORAGE_PREFIX + subjectSlug);
    if (storedCode) setCode(storedCode);
  }, [subjectSlug]);

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (activeToolRef.current !== "highlight") return;
      if ((e.target as HTMLElement)?.closest("[data-annotation-toolbar], [data-annotation-popover]")) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const container =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? (range.commonAncestorContainer as HTMLElement)
          : range.commonAncestorContainer.parentElement;
      if (!container?.closest(".prose-content")) return;

      const quote = truncate(range.toString(), 400);
      if (!quote) return;

      const rect = range.getBoundingClientRect();
      setPending({ tool: "highlight", quote, x: rect.left, y: rect.bottom, range: range.cloneRange() });
      setStatus("idle");
      setErrorMsg("");
    }

    function onClick(e: MouseEvent) {
      if (activeToolRef.current !== "bookmark") return;
      const targetEl = e.target as HTMLElement;
      if (targetEl.closest("[data-annotation-toolbar], [data-annotation-popover]")) return;
      const proseEl = targetEl.closest<HTMLElement>(".prose-content");
      if (!proseEl) return;

      e.preventDefault();
      e.stopPropagation();

      const block = targetEl.closest<HTMLElement>(BLOCK_SELECTOR) ?? proseEl;
      const quote = truncate(block.innerText || "", 120);
      const n = bookmarkCounter.current++;
      const color = colorForIndex(n, `${subjectSlug}/${itemSlug}`);
      const variant = n % 3;
      setPending({ tool: "bookmark", quote, x: e.clientX, y: e.clientY, anchorEl: block, color, variant });
      setStatus("idle");
      setErrorMsg("");
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  function toggleTool(tool: Tool) {
    setActiveTool((cur) => (cur === tool ? null : tool));
    setPending(null);
    window.getSelection()?.removeAllRanges();
  }

  function closePopover() {
    setPending(null);
    setMemo("");
    setStatus("idle");
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setStatus("sending");
    setErrorMsg("");

    const tag = pending.tool === "highlight" ? "[형광펜]" : "[책갈피]";
    const text = [tag, `> ${pending.quote}`, memo.trim()].filter(Boolean).join("\n\n");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectSlug, item: itemSlug, code, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "제출에 실패했어요.");
        if (res.status === 401) sessionStorage.removeItem(CODE_STORAGE_PREFIX + subjectSlug);
        return;
      }

      sessionStorage.setItem(CODE_STORAGE_PREFIX + subjectSlug, code);
      if (pending.tool === "highlight" && pending.range) {
        wrapRangeAsHighlight(pending.range);
        window.getSelection()?.removeAllRanges();
      } else if (pending.tool === "bookmark" && pending.anchorEl && pending.color) {
        // Tags the bookmarked paragraph exactly like a ```feedback block
        // (data-feedback-block/-color/-variant + --feedback-color). That's
        // the entire hand-off to BookmarkDock, which owns the rest of the
        // lifecycle from here: the bottom-corner icon, its grow-and-rise
        // travel toward this exact block as the reader scrolls closer, and
        // reparenting it in place once it arrives.
        const block = pending.anchorEl;
        block.setAttribute("data-feedback-block", "");
        block.dataset.color = pending.color;
        block.dataset.variant = String(pending.variant ?? 0);
        block.style.setProperty("--feedback-color", pending.color);
      }
      closePopover();
    } catch {
      setStatus("error");
      setErrorMsg("네트워크 오류가 발생했어요.");
    }
  }

  const needsCode = !sessionStorage_safeGet(CODE_STORAGE_PREFIX + subjectSlug);

  return (
    <>
      <div className="annotation-toolbar" data-annotation-toolbar>
        <button
          type="button"
          className={`annotation-tool ${activeTool === "highlight" ? "active" : ""}`}
          onClick={() => toggleTool("highlight")}
          title="형광펜: 원하는 텍스트를 드래그해서 선택하세요"
        >
          형광펜
        </button>
        <button
          type="button"
          className={`annotation-tool ${activeTool === "bookmark" ? "active" : ""}`}
          onClick={() => toggleTool("bookmark")}
          title="책갈피: 표시하고 싶은 문단을 클릭하세요"
        >
          책갈피
        </button>
      </div>

      {pending && (
        <form
          className="annotation-popover"
          data-annotation-popover
          style={{
            left: Math.min(Math.max(pending.x, 12), window.innerWidth - 300),
            top: Math.min(Math.max(pending.y + 10, 12), window.innerHeight - 220),
          }}
          onSubmit={handleSubmit}
        >
          <div className="annotation-popover-header">
            <p className="annotation-popover-title">
              {pending.tool === "highlight" ? "형광펜으로 표시" : "책갈피 남기기"}
            </p>
            {pending.tool === "bookmark" && pending.color && (
              <BookmarkIcon
                color={pending.color}
                variant={pending.variant}
                className="annotation-popover-icon"
              />
            )}
          </div>
          <blockquote className="annotation-popover-quote">{pending.quote}</blockquote>
          {pending.tool === "bookmark" && (
            <textarea
              className="annotation-popover-memo"
              placeholder="메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
            />
          )}
          {needsCode && (
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="feedback-form-code"
              placeholder="비밀번호 4자리"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
            />
          )}
          <div className="feedback-form-row">
            <button type="submit" className="feedback-form-submit" disabled={status === "sending"}>
              {status === "sending" ? "전송 중..." : "표시하기"}
            </button>
            <button type="button" className="feedback-form-cancel" onClick={closePopover}>
              취소
            </button>
          </div>
          {status === "error" && <p className="feedback-form-error">{errorMsg}</p>}
        </form>
      )}
    </>
  );
}

function sessionStorage_safeGet(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
