"use client";

import { useRef, useState } from "react";

export default function AudioBlock({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  if (!src) return null;

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  }

  return (
    <div className="block-card audio-block" data-block="audio">
      <button
        type="button"
        className={`audio-disc ${playing ? "audio-disc-spinning" : ""}`}
        onClick={toggle}
        aria-label={playing ? "일시정지" : "재생"}
      >
        <span className="audio-disc-hole" />
      </button>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
