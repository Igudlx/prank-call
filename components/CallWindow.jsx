'use client';

import { useEffect, useRef, useState } from 'react';
import Keypad from './Keypad';

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallWindow({
  targetNumber,
  participants,
  remoteStreams,
  callDuration,
  keypadOpen,
  addError,
  onToggleKeypad,
  onAddParticipant,
  onHangUp,
}) {
  const [addValue, setAddValue] = useState('');
  const audioRefs = useRef({});

  // Attach each remote participant's audio stream to a hidden <audio> tag
  // so their mic actually plays through the speakers/headphones.
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([number, stream]) => {
      const el = audioRefs.current[number];
      if (el && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  function submitAdd(e) {
    e.preventDefault();
    if (!addValue.trim()) return;
    onAddParticipant(addValue.trim());
    setAddValue('');
  }

  const displayNumbers = participants.length > 0 ? participants : [targetNumber];

  return (
    <div className="fixed inset-0 z-40 bg-ink flex flex-col items-center justify-between px-6 py-10">
      {Object.entries(remoteStreams).map(([number, stream]) => (
        <audio
          key={number}
          ref={(el) => {
            if (el) audioRefs.current[number] = el;
          }}
          autoPlay
          playsInline
        />
      ))}

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-good text-sm mb-2">{formatClock(callDuration)}</p>
        <div className="space-y-1 mb-2">
          {displayNumbers.map((n) => (
            <p key={n} className="font-mono text-2xl">
              {n}
            </p>
          ))}
        </div>
        <p className="text-muted text-sm">
          {displayNumbers.length > 1 ? 'Conference call' : 'On call'}
        </p>
      </div>

      <div className="w-full max-w-sm">
        {keypadOpen && (
          <div className="mb-4">
            <Keypad />
          </div>
        )}

        <form onSubmit={submitAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            inputMode="tel"
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder="Add a number to this call…"
            className="flex-1 rounded-md bg-panel2 border border-line px-3 py-2.5 text-white placeholder-muted/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
          <button
            type="submit"
            className="rounded-md border border-line px-4 text-sm hover:border-accent transition-colors"
          >
            Add
          </button>
        </form>
        {addError && <p className="text-bad text-xs mb-4 -mt-2">{addError}</p>}

        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={onToggleKeypad}
            className={`w-14 h-14 rounded-full border flex items-center justify-center transition-colors ${
              keypadOpen ? 'border-accent text-accent' : 'border-line text-muted hover:border-muted'
            }`}
            aria-label="Toggle keypad"
          >
            #
          </button>
          <button
            type="button"
            onClick={onHangUp}
            className="w-16 h-16 rounded-full bg-bad text-white flex items-center justify-center hover:bg-bad/90 transition-colors"
            aria-label="Hang up"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}
