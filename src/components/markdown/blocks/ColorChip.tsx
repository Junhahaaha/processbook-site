"use client";

import { useState } from "react";

export default function ColorChip({ lines }: { lines: string[] }) {
  const colors = lines.map((l) => l.trim()).filter(Boolean);
  const [copied, setCopied] = useState<string | null>(null);
  if (colors.length === 0) return null;

  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // clipboard API unavailable — ignore
    }
  }

  return (
    <div className="block-card color-chip-row" data-block="color-chip">
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          className="color-chip"
          style={{ background: hex }}
          onClick={() => copy(hex)}
        >
          <span className="color-chip-label">{copied === hex ? "복사됨" : hex}</span>
        </button>
      ))}
    </div>
  );
}
