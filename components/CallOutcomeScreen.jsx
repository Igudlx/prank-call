'use client';

const MESSAGES = {
  no_answer: { title: 'No answer', body: 'They didn\u2019t pick up.' },
  declined: { title: 'Call declined', body: 'They declined the call.' },
  busy: { title: 'They\u2019re on a call', body: 'Try again later.' },
  offline: { title: 'Number offline', body: 'That number isn\u2019t reachable right now.' },
};

export default function CallOutcomeScreen({ outcome, onRecall, onClose }) {
  if (!outcome) return null;
  const meta = MESSAGES[outcome.type] || MESSAGES.no_answer;
  const canRecall = outcome.type !== 'offline';

  return (
    <div className="fixed inset-0 z-40 bg-ink flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 rounded-full bg-panel border border-line flex items-center justify-center mb-6">
        <span className="font-mono text-bad text-2xl">✕</span>
      </div>
      <p className="text-xl font-medium mb-1">{meta.title}</p>
      <p className="font-mono text-lg text-muted mb-2">{outcome.number}</p>
      <p className="text-sm text-muted mb-10">{meta.body}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-line px-6 py-3 hover:border-muted transition-colors"
        >
          Close
        </button>
        {canRecall && (
          <button
            type="button"
            onClick={onRecall}
            className="rounded-full bg-accent text-ink font-medium px-6 py-3 hover:bg-accent/90 transition-colors"
          >
            Call again
          </button>
        )}
      </div>
    </div>
  );
}
