'use client';

import { useRef } from 'react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

// Standard DTMF frequency pairs, purely for a satisfying local beep - this
// is not real telephony, so no tone is actually sent to the other side.
const FREQS = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

export default function Keypad() {
  const ctxRef = useRef(null);

  function beep(key) {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AC();
    }
    const ctx = ctxRef.current;
    const [f1, f2] = FREQS[key];
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    gain.connect(ctx.destination);
    [f1, f2].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => beep(key)}
          className="rounded-md bg-panel2 border border-line py-3 text-lg font-mono hover:border-muted active:bg-line transition-colors"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
