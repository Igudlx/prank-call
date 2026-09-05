'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormField from './FormField';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const STATUS_LABEL = {
  completed: 'Completed',
  no_answer: 'No answer',
  declined: 'Declined',
  busy: 'Busy',
  canceled: 'Canceled',
};

export default function SettingsPanel({ user, onLoggedOut }) {
  const router = useRouter();
  const [history, setHistory] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState('');
  const [credError, setCredError] = useState(null);
  const [credSuccess, setCredSuccess] = useState(null);
  const [savingCreds, setSavingCreds] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/calls/history')
      .then((r) => r.json())
      .then((data) => setHistory(data.calls || []))
      .catch(() => setHistory([]));
  }, []);

  async function logout() {
    setLoggingOut(true);
    await onLoggedOut();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  async function saveCredentials(e) {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);
    setSavingCreds(true);
    try {
      const res = await fetch('/api/auth/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newEmail: newEmail !== user.email ? newEmail : undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save changes.');
      setCredSuccess('Saved.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setCredError(err.message);
    } finally {
      setSavingCreds(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="bg-panel border border-line rounded-lg p-5">
        <h2 className="font-medium mb-1">Your line</h2>
        <p className="font-mono text-xl text-accent">{user.phoneNumber}</p>
        <p className="text-muted text-sm mt-1">{user.email}</p>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="mt-4 rounded-md border border-line px-4 py-2 text-sm hover:border-bad hover:text-bad transition-colors disabled:opacity-60"
        >
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </section>

      <section className="bg-panel border border-line rounded-lg p-5">
        <h2 className="font-medium mb-4">Account settings</h2>
        <form onSubmit={saveCredentials}>
          <FormField
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <FormField
            label="New password (leave blank to keep current)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
          />
          <FormField
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          {credError && <p className="text-bad text-sm mb-4">{credError}</p>}
          {credSuccess && <p className="text-good text-sm mb-4">{credSuccess}</p>}
          <button
            type="submit"
            disabled={savingCreds}
            className="rounded-md bg-accent text-ink font-medium px-5 py-2.5 hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {savingCreds ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="bg-panel border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Call history</h2>
          <a
            href="/api/calls/export"
            className="rounded-md border border-line px-4 py-2 text-sm hover:border-accent hover:text-accent transition-colors"
          >
            Export as .txt
          </a>
        </div>

        {history === null && <p className="text-muted text-sm py-6 text-center">Loading…</p>}
        {history && history.length === 0 && (
          <p className="text-muted text-sm py-6 text-center">No calls yet.</p>
        )}

        {history && history.length > 0 && (
          <div className="divide-y divide-line -mx-5">
            {history.map((call, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-mono">{call.other_number}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {call.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} ·{' '}
                    {new Date(call.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{STATUS_LABEL[call.status] || call.status}</p>
                  <p className="text-xs text-muted mt-0.5">{formatDuration(call.duration_seconds)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
