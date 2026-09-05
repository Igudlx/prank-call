'use client';

export default function ConfirmCallModal({ number, onConfirm, onCancel }) {
  if (!number) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-panel border border-line rounded-lg p-6">
        <p className="text-muted text-sm mb-1">Prank call</p>
        <p className="font-mono text-2xl mb-5">{number}</p>
        <p className="text-sm text-muted mb-6">Are you sure you want to prank call this number?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md border border-line py-2.5 text-sm hover:border-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-md bg-good text-ink font-medium py-2.5 hover:bg-good/90 transition-colors"
          >
            Call
          </button>
        </div>
      </div>
    </div>
  );
}
