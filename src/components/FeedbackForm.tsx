"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

// Submits to /api/feedback, which commits the entry to feedback-inbox/ on
// GitHub — see that route for the full design. Nothing here writes to the
// live page's own content; it only reaches the site after someone runs
// scripts/pull-feedback.mjs locally and re-syncs, so "제출" intentionally
// reads as "sent for later review", not "posted now".
export default function FeedbackForm({
  subjectSlug,
  itemSlug,
}: {
  subjectSlug: string;
  itemSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
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
        return;
      }
      setStatus("done");
      setText("");
      setCode("");
    } catch {
      setStatus("error");
      setErrorMsg("네트워크 오류가 발생했어요.");
    }
  }

  if (!open) {
    return (
      <button type="button" className="feedback-form-toggle" onClick={() => setOpen(true)}>
        + 피드백 남기기
      </button>
    );
  }

  if (status === "done") {
    return (
      <div className="feedback-form-card">
        <p>피드백을 남겨주셔서 감사해요. 다음 볼트 반영 때 노트에 옮겨질 예정이에요.</p>
        <button
          type="button"
          className="feedback-form-cancel"
          onClick={() => {
            setOpen(false);
            setStatus("idle");
          }}
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <form className="feedback-form-card" onSubmit={handleSubmit}>
      <p className="feedback-form-title">피드백 남기기</p>
      <textarea
        className="feedback-form-textarea"
        placeholder="이 항목에 대한 피드백을 남겨주세요."
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={4}
        required
      />
      <div className="feedback-form-row">
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
        <button type="submit" className="feedback-form-submit" disabled={status === "sending"}>
          {status === "sending" ? "전송 중..." : "제출"}
        </button>
        <button type="button" className="feedback-form-cancel" onClick={() => setOpen(false)}>
          취소
        </button>
      </div>
      {status === "error" && <p className="feedback-form-error">{errorMsg}</p>}
    </form>
  );
}
