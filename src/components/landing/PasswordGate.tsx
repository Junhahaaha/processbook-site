"use client";

import { useState } from "react";
import { NOTEBOOK_PASSWORDS } from "@/lib/notebook-passwords";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function PasswordGate({
  subjectSlug,
  subjectName,
  onClose,
  onCorrect,
}: {
  subjectSlug: string;
  subjectName: string;
  onClose: () => void;
  onCorrect: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function handleKey(key: string) {
    if (error) return;
    if (key === "⌫") {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (!key || value.length >= 4) return;
    const next = value + key;
    setValue(next);
    if (next.length === 4) {
      if (next === NOTEBOOK_PASSWORDS[subjectSlug]) {
        onCorrect();
      } else {
        setError(true);
        setTimeout(() => {
          setError(false);
          setValue("");
        }, 1200);
      }
    }
  }

  return (
    <div className="password-gate-backdrop" onClick={onClose}>
      <div className="password-gate-page" onClick={(e) => e.stopPropagation()}>
        <button className="password-gate-close" onClick={onClose} aria-label="닫기">
          ×
        </button>
        <p className="password-gate-title">{subjectName}</p>
        <p className="password-gate-hint">비밀번호 4자리를 입력하세요</p>
        <div className="password-gate-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`password-gate-dot ${value.length > i ? "filled" : ""}`} />
          ))}
        </div>
        <p className={`password-gate-error ${error ? "visible" : ""}`}>비밀번호가 틀렸어요!</p>
        <div className="password-gate-keypad">
          {KEYS.map((k, i) => (
            <button
              key={i}
              type="button"
              disabled={!k}
              className="password-gate-key"
              onClick={() => handleKey(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
