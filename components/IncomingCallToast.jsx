'use client';

export default function IncomingCallToast({ incoming, onAccept, onDecline }) {
  if (!incoming) return null;
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 sm:w-80">
      <div className="bg-panel border border-line rounded-lg shadow-2xl shadow-black/50 p-4">
        <p className="text-sm text-muted mb-1">Prank Caller is calling</p>
        <p className="font-mono text-lg mb-3">{incoming.fromNumber}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 rounded-md bg-bad text-white text-sm font-medium py-2 hover:bg-bad/90 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-md bg-good text-ink text-sm font-medium py-2 hover:bg-good/90 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
