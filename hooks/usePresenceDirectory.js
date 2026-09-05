'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb, ensureFirebaseSignedIn } from '../lib/firebase';

// Subscribes to every known phone number's live status. Returns an object
// like { "(212) 555-0148": { status: "online" }, ... } that updates in
// real time as people come online, go offline, or start/end calls.
export function usePresenceDirectory() {
  const [directory, setDirectory] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      await ensureFirebaseSignedIn();
      if (cancelled) return;
      unsub = onValue(ref(rtdb, 'presence'), (snap) => {
        setDirectory(snap.val() || {});
        setReady(true);
      });
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { directory, ready };
}
