'use client';

import { useCallback, useState } from 'react';
import { ref, update } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { useCallEngine } from '../hooks/useCallEngine';
import NumbersList from './NumbersList';
import ConfirmCallModal from './ConfirmCallModal';
import CallingScreen from './CallingScreen';
import CallOutcomeScreen from './CallOutcomeScreen';
import CallWindow from './CallWindow';
import IncomingCallToast from './IncomingCallToast';
import SettingsPanel from './SettingsPanel';

export default function Dashboard({ user }) {
  const [tab, setTab] = useState('call');
  const [confirmTarget, setConfirmTarget] = useState(null);

  const engine = useCallEngine(user.phoneNumber);

  const handleConfirm = useCallback(() => {
    const target = confirmTarget;
    setConfirmTarget(null);
    engine.startCall(target);
  }, [confirmTarget, engine]);

  const handleLoggedOut = useCallback(async () => {
    // Best-effort: mark this line offline immediately rather than waiting
    // for the browser's onDisconnect hook to fire.
    try {
      await update(ref(rtdb, `presence/${user.phoneNumber}`), {
        status: 'offline',
        updatedAt: Date.now(),
      });
    } catch {}
  }, [user.phoneNumber]);

  const showIncomingToast = engine.incoming && engine.phase === 'idle';

  return (
    <div className="min-h-screen bg-ink pb-24 sm:pb-0">
      <header className="border-b border-line px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-ink/95 backdrop-blur z-30">
        <div>
          <h1 className="font-medium tracking-tight">Prank Call</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{user.phoneNumber}</p>
        </div>
        <nav className="flex gap-1 bg-panel border border-line rounded-full p-1">
          <button
            type="button"
            onClick={() => setTab('call')}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              tab === 'call' ? 'bg-accent text-ink' : 'text-muted hover:text-white'
            }`}
          >
            Call
          </button>
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              tab === 'settings' ? 'bg-accent text-ink' : 'text-muted hover:text-white'
            }`}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="px-4 sm:px-6 py-6">
        {tab === 'call' && (
          <NumbersList myNumber={user.phoneNumber} onCall={(number) => setConfirmTarget(number)} />
        )}
        {tab === 'settings' && <SettingsPanel user={user} onLoggedOut={handleLoggedOut} />}
      </main>

      <ConfirmCallModal
        number={confirmTarget}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />

      {engine.phase === 'ringing_out' && (
        <CallingScreen number={engine.targetNumber} onCancel={engine.hangUp} />
      )}

      {engine.phase === 'connected' && (
        <CallWindow
          targetNumber={engine.targetNumber}
          participants={engine.participants}
          remoteStreams={engine.remoteStreams}
          callDuration={engine.callDuration}
          keypadOpen={engine.keypadOpen}
          addError={engine.addError}
          onToggleKeypad={engine.toggleKeypad}
          onAddParticipant={engine.addParticipant}
          onHangUp={engine.hangUp}
        />
      )}

      <CallOutcomeScreen
        outcome={engine.phase === 'idle' ? engine.outcome : null}
        onRecall={engine.recall}
        onClose={engine.dismissOutcome}
      />

      {showIncomingToast && (
        <IncomingCallToast
          incoming={engine.incoming}
          onAccept={engine.acceptIncoming}
          onDecline={engine.declineIncoming}
        />
      )}
    </div>
  );
}
