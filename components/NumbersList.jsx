'use client';

import { useMemo, useState } from 'react';
import { usePresenceDirectory } from '../hooks/usePresenceDirectory';
import { normalizeSearch, numberContainsDigits } from '../lib/phoneNumbers';

const STATUS_META = {
  online: { dot: 'bg-good', label: 'Available' },
  'in-call': { dot: 'bg-accent', label: 'On a call' },
  offline: { dot: 'bg-muted', label: 'Offline' },
};

export default function NumbersList({ myNumber, onCall }) {
  const { directory, ready } = usePresenceDirectory();
  const [query, setQuery] = useState('');

  const entries = useMemo(() => {
    return Object.entries(directory)
      .filter(([number]) => number !== myNumber)
      .map(([number, data]) => ({ number, status: data?.status || 'offline' }));
  }, [directory, myNumber]);

  const digits = normalizeSearch(query);
  const isSearching = digits.length > 0;

  const visible = useMemo(() => {
    if (isSearching) {
      return entries
        .filter((e) => numberContainsDigits(e.number, digits))
        .sort((a, b) => a.number.localeCompare(b.number));
    }
    return entries
      .filter((e) => e.status === 'online')
      .sort((a, b) => a.number.localeCompare(b.number));
  }, [entries, isSearching, digits]);

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          inputMode="numeric"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any number…"
          className="w-full rounded-md bg-panel2 border border-line px-4 py-3 text-white placeholder-muted/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>

      {!ready && <p className="text-muted text-sm text-center py-10">Connecting to the network…</p>}

      {ready && !isSearching && visible.length === 0 && (
        <p className="text-muted text-sm text-center py-10">
          No one else is online right now. Check back soon, or search for a specific number above.
        </p>
      )}

      {ready && isSearching && visible.length === 0 && (
        <p className="text-muted text-sm text-center py-10">No matching numbers found.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map(({ number, status }) => {
          const meta = STATUS_META[status] || STATUS_META.offline;
          const callable = status === 'online';
          return (
            <button
              key={number}
              type="button"
              disabled={!callable}
              onClick={() => callable && onCall(number)}
              className={`group text-left rounded-lg border border-line bg-panel px-4 py-3.5 transition-colors ${
                callable ? 'hover:border-accent cursor-pointer' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg tracking-wide">{number}</span>
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              </div>
              <div className="mt-1 text-xs text-muted">{meta.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
