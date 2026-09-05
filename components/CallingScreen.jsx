'use client';

import { useEffect, useRef } from 'react';

export default function CallingScreen({ number, onCancel }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.loop = true;
    const playPromise = audio.play();
    if (playPromise && playPromise.catch) playPromise.catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-ink flex flex-col items-center justify-center px-6">
      <audio ref={audioRef} src="/audios/ringing.mp3" preload="auto" />
      <div className="w-20 h-20 rounded-full bg-panel border border-line flex items-center justify-center mb-6 animate-pulse">
        <span className="font-mono text-accent text-2xl">☎</span>
      </div>
      <p className="text-muted text-sm mb-1">Calling…</p>
      <p className="font-mono text-3xl mb-10">{number}</p>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full bg-bad text-white font-medium px-8 py-3 hover:bg-bad/90 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
