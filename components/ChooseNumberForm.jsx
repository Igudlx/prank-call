'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChooseNumberForm() {
  const router = useRouter();
  const [numbers, setNumbers] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);

  async function loadNumbers() {
    setNumbers(null);
    setSelected(null);
    setError(null);
    const res = await fetch('/api/numbers/generate');
    const data = await res.json();
    setNumbers(data.numbers || []);
  }

  useEffect(() => {
    loadNumbers();
  }, []);

  async function claim() {
    if (!selected) return;
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch('/api/numbers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not claim that number.');
      router.push('/app');
      router.refresh();
    } catch (err) {
      setError(err.message);
      loadNumbers();
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-ink">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium tracking-tight">Pick your number</h1>
          <p className="text-muted text-sm mt-2">
            This is permanent — whichever one you choose is yours for good.
          </p>
        </div>

        <div className="bg-panel border border-line rounded-lg p-5">
          {!numbers && <p className="text-muted text-sm py-6 text-center">Finding available numbers…</p>}

          {numbers && numbers.length === 0 && (
            <p className="text-bad text-sm py-6 text-center">
              Couldn&apos;t find any free numbers. Try again.
            </p>
          )}

          {numbers && numbers.length > 0 && (
            <div className="space-y-2 mb-5">
              {numbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelected(n)}
                  className={`w-full text-left rounded-md border px-4 py-3 font-mono text-lg transition-colors ${
                    selected === n
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line bg-panel2 hover:border-muted'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-bad text-sm mb-4">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadNumbers}
              className="flex-1 rounded-md border border-line py-2.5 text-sm text-muted hover:text-white hover:border-muted transition-colors"
            >
              Show different numbers
            </button>
            <button
              type="button"
              onClick={claim}
              disabled={!selected || claiming}
              className="flex-1 rounded-md bg-accent text-ink font-medium py-2.5 hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {claiming ? 'Claiming…' : 'Claim number'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
