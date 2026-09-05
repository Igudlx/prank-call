'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  onChildAdded,
  onChildRemoved,
  onDisconnect,
} from 'firebase/database';
import { rtdb, ensureFirebaseSignedIn } from '../lib/firebase';

const RING_TIMEOUT_MS = 60 * 1000;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Free public TURN relay (Open Relay Project) - helps calls connect
  // across strict NATs/firewalls when a direct (STUN) connection fails.
  // No signup required. See README for swapping in your own TURN server.
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

function pairKey(a, b) {
  return [a, b].sort().join('__');
}

async function getPresence(number) {
  const snap = await get(ref(rtdb, `presence/${number}`));
  return snap.exists() ? snap.val() : { status: 'offline' };
}

async function setPresence(number, status) {
  if (!number) return;
  await update(ref(rtdb, `presence/${number}`), { status, updatedAt: Date.now() });
}

async function logCall({ direction, otherNumber, status, durationSeconds }) {
  try {
    await fetch('/api/calls/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, otherNumber, status, durationSeconds }),
    });
  } catch (e) {
    console.error('Failed to log call', e);
  }
}

export function useCallEngine(myNumber) {
  const [phase, setPhase] = useState('idle'); // idle | ringing_out | connected
  const [targetNumber, setTargetNumber] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [callDuration, setCallDuration] = useState(0);
  const [incoming, setIncoming] = useState(null); // { callId, fromNumber }
  const [outcome, setOutcome] = useState(null); // { type: 'no_answer'|'declined'|'busy'|'offline', number }
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [addError, setAddError] = useState(null);

  const callIdRef = useRef(null);
  const peersRef = useRef({}); // { number: RTCPeerConnection }
  const localStreamRef = useRef(null);
  const unsubsRef = useRef([]); // functions to call on cleanup of a call
  const ringTimerRef = useRef(null);
  const startedAtRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const myNumberRef = useRef(myNumber);
  myNumberRef.current = myNumber;
  const hangUpRef = useRef(null);
  const directionRef = useRef('outgoing');

  const clearCallSubs = useCallback(() => {
    unsubsRef.current.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    unsubsRef.current = [];
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const closeAllPeers = useCallback(() => {
    Object.values(peersRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setRemoteStreams({});
  }, []);

  const resetToIdle = useCallback(async () => {
    const finishedCallId = callIdRef.current;
    clearCallSubs();
    closeAllPeers();
    callIdRef.current = null;
    startedAtRef.current = null;
    setParticipants([]);
    setCallDuration(0);
    setKeypadOpen(false);
    setPhase('idle');
    setTargetNumber(null);
    if (myNumberRef.current) {
      await setPresence(myNumberRef.current, 'online');
    }
    // Best-effort cleanup: if nobody else is left in this call, remove its
    // Firebase node entirely so signaling data doesn't pile up forever.
    if (finishedCallId) {
      try {
        const remainingSnap = await get(ref(rtdb, `calls/${finishedCallId}/participants`));
        const remaining = remainingSnap.exists() ? remainingSnap.val() : null;
        if (!remaining || Object.keys(remaining).length === 0) {
          await remove(ref(rtdb, `calls/${finishedCallId}`));
        }
      } catch {}
    }
  }, [clearCallSubs, closeAllPeers]);

  // ---- presence: mark myself online while the app is open ----
  useEffect(() => {
    if (!myNumber) return;
    let disconnectRef;
    (async () => {
      await ensureFirebaseSignedIn();
      await setPresence(myNumber, 'online');
      disconnectRef = onDisconnect(ref(rtdb, `presence/${myNumber}`));
      disconnectRef.set({ status: 'offline', updatedAt: Date.now() });
    })();
    return () => {
      setPresence(myNumber, 'offline');
    };
  }, [myNumber]);

  // ---- listen for incoming call invitations ----
  useEffect(() => {
    if (!myNumber) return;
    const incomingRef = ref(rtdb, `incoming/${myNumber}`);
    const addedUnsub = onChildAdded(incomingRef, (snap) => {
      const val = snap.val();
      if (!val) return;
      setIncoming({ callId: snap.key, fromNumber: val.fromNumber });
    });
    const removedUnsub = onChildRemoved(incomingRef, (snap) => {
      setIncoming((cur) => (cur && cur.callId === snap.key ? null : cur));
    });
    return () => {
      addedUnsub();
      removedUnsub();
    };
  }, [myNumber]);

  // ---- connect a WebRTC peer connection to one other participant ----
  const connectToPeer = useCallback((callId, otherNumber) => {
    const my = myNumberRef.current;
    if (peersRef.current[otherNumber]) return;
    const key = pairKey(my, otherNumber);
    const amOfferer = my < otherNumber;
    const myRole = amOfferer ? 'offerer' : 'answerer';
    const otherRole = amOfferer ? 'answerer' : 'offerer';

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current[otherNumber] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      setRemoteStreams((cur) => ({ ...cur, [otherNumber]: event.streams[0] }));
    };

    const pairBase = `calls/${callId}/pairs/${key}`;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(rtdb, `${pairBase}/candidates/${myRole}`), event.candidate.toJSON());
      }
    };

    const candidatesSeen = new Set();
    const candidatesUnsub = onChildAdded(
      ref(rtdb, `${pairBase}/candidates/${otherRole}`),
      (snap) => {
        if (candidatesSeen.has(snap.key)) return;
        candidatesSeen.add(snap.key);
        const val = snap.val();
        if (val) pc.addIceCandidate(new RTCIceCandidate(val)).catch(() => {});
      }
    );
    unsubsRef.current.push(candidatesUnsub);

    if (amOfferer) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await set(ref(rtdb, `${pairBase}/offer`), { sdp: offer.sdp, type: offer.type });
      })();
      const answerUnsub = onValue(ref(rtdb, `${pairBase}/answer`), (snap) => {
        const val = snap.val();
        if (val && !pc.currentRemoteDescription) {
          pc.setRemoteDescription(new RTCSessionDescription(val)).catch(() => {});
        }
      });
      unsubsRef.current.push(answerUnsub);
    } else {
      const offerUnsub = onValue(ref(rtdb, `${pairBase}/offer`), async (snap) => {
        const val = snap.val();
        if (val && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(val));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await set(ref(rtdb, `${pairBase}/answer`), { sdp: answer.sdp, type: answer.type });
        }
      });
      unsubsRef.current.push(offerUnsub);
    }
  }, []);

  // ---- join the mesh: watch the participant list and connect to anyone new ----
  const joinMesh = useCallback(
    async (callId) => {
      const my = myNumberRef.current;
      if (!localStreamRef.current) {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      await update(ref(rtdb, `calls/${callId}/participants`), { [my]: true });

      let hadOthers = false;
      const partsUnsub = onValue(ref(rtdb, `calls/${callId}/participants`), (snap) => {
        const val = snap.val() || {};
        const others = Object.keys(val).filter((n) => n !== my);
        setParticipants(others);
        others.forEach((n) => connectToPeer(callId, n));
        // remote peers that left should have their stale connection closed
        Object.keys(peersRef.current).forEach((n) => {
          if (!others.includes(n)) {
            peersRef.current[n]?.close();
            delete peersRef.current[n];
            setRemoteStreams((cur) => {
              const next = { ...cur };
              delete next[n];
              return next;
            });
          }
        });
        if (others.length > 0) hadOthers = true;
        else if (hadOthers) {
          // everyone else has left the call - hang up on our end too
          hangUpRef.current?.();
        }
      });
      unsubsRef.current.push(partsUnsub);

      startedAtRef.current = Date.now();
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);

      setPhase('connected');
      await setPresence(my, 'in-call');
    },
    [connectToPeer]
  );

  // ---- start an outgoing call ----
  const startCall = useCallback(
    async (target) => {
      await ensureFirebaseSignedIn();
      const my = myNumberRef.current;
      if (!my || !target || target === my) return;

      const presence = await getPresence(target);
      if (presence.status === 'in-call') {
        setOutcome({ type: 'busy', number: target });
        return;
      }
      if (presence.status !== 'online') {
        setOutcome({ type: 'offline', number: target });
        return;
      }

      setOutcome(null);
      setAddError(null);
      directionRef.current = 'outgoing';
      const callId = push(ref(rtdb, 'calls')).key;
      callIdRef.current = callId;
      setTargetNumber(target);
      setPhase('ringing_out');

      await set(ref(rtdb, `calls/${callId}`), {
        status: 'ringing',
        createdAt: Date.now(),
        createdBy: my,
      });
      await set(ref(rtdb, `incoming/${target}/${callId}`), {
        fromNumber: my,
        createdAt: Date.now(),
      });

      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.error('Microphone permission denied', e);
      }

      const statusUnsub = onValue(ref(rtdb, `calls/${callId}/status`), async (snap) => {
        const status = snap.val();
        if (status === 'accepted') {
          if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
          await joinMesh(callId);
        } else if (status === 'declined') {
          if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
          await remove(ref(rtdb, `incoming/${target}/${callId}`));
          logCall({ direction: 'outgoing', otherNumber: target, status: 'declined', durationSeconds: 0 });
          setOutcome({ type: 'declined', number: target });
          resetToIdle();
        }
      });
      unsubsRef.current.push(statusUnsub);

      ringTimerRef.current = setTimeout(async () => {
        await remove(ref(rtdb, `incoming/${target}/${callId}`));
        await update(ref(rtdb, `calls/${callId}`), { status: 'no_answer' });
        logCall({ direction: 'outgoing', otherNumber: target, status: 'no_answer', durationSeconds: 0 });
        setOutcome({ type: 'no_answer', number: target });
        resetToIdle();
      }, RING_TIMEOUT_MS);
    },
    [joinMesh, resetToIdle]
  );

  // ---- accept an incoming call ----
  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;
    const { callId, fromNumber } = incoming;
    await ensureFirebaseSignedIn();
    setIncoming(null);
    await remove(ref(rtdb, `incoming/${myNumberRef.current}/${callId}`));
    await update(ref(rtdb, `calls/${callId}`), { status: 'accepted' });
    directionRef.current = 'incoming';
    callIdRef.current = callId;
    setTargetNumber(fromNumber);
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error('Microphone permission denied', e);
    }
    await joinMesh(callId);
  }, [incoming, joinMesh]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    const { callId } = incoming;
    await update(ref(rtdb, `calls/${callId}`), { status: 'declined' });
    await remove(ref(rtdb, `incoming/${myNumberRef.current}/${callId}`));
    setIncoming(null);
  }, [incoming]);

  // ---- hang up the current call (or cancel an outgoing ring) ----
  const hangUp = useCallback(async () => {
    const callId = callIdRef.current;
    const my = myNumberRef.current;
    const target = targetNumber;

    if (phase === 'connected' && startedAtRef.current) {
      const durationSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const others = participants.length ? participants.join(', ') : target;
      logCall({ direction: directionRef.current, otherNumber: others, status: 'completed', durationSeconds });
    } else if (phase === 'ringing_out') {
      logCall({ direction: 'outgoing', otherNumber: target, status: 'canceled', durationSeconds: 0 });
    }

    if (callId) {
      if (my) await remove(ref(rtdb, `calls/${callId}/participants/${my}`));
      if (target) await remove(ref(rtdb, `incoming/${target}/${callId}`));
      if (phase === 'ringing_out') {
        await update(ref(rtdb, `calls/${callId}`), { status: 'canceled' }).catch(() => {});
      }
    }

    await resetToIdle();
  }, [phase, participants, targetNumber, resetToIdle]);
  hangUpRef.current = hangUp;

  const recall = useCallback(() => {
    const number = outcome?.number;
    setOutcome(null);
    if (number) startCall(number);
  }, [outcome, startCall]);

  const dismissOutcome = useCallback(() => setOutcome(null), []);

  const addParticipant = useCallback(
    async (newNumber) => {
      setAddError(null);
      const my = myNumberRef.current;
      if (!newNumber || newNumber === my || participants.includes(newNumber)) return;
      const presence = await getPresence(newNumber);
      if (presence.status !== 'online') {
        setAddError(`${newNumber} is offline right now.`);
        return;
      }
      const callId = callIdRef.current;
      await set(ref(rtdb, `incoming/${newNumber}/${callId}`), {
        fromNumber: my,
        createdAt: Date.now(),
      });
      // Auto-expire the invite if it's never answered.
      setTimeout(() => {
        remove(ref(rtdb, `incoming/${newNumber}/${callId}`));
      }, RING_TIMEOUT_MS);
    },
    [participants]
  );

  const toggleKeypad = useCallback(() => setKeypadOpen((v) => !v), []);

  useEffect(() => () => clearCallSubs(), [clearCallSubs]);

  return {
    phase,
    targetNumber,
    participants,
    remoteStreams,
    callDuration,
    incoming,
    outcome,
    keypadOpen,
    addError,
    startCall,
    acceptIncoming,
    declineIncoming,
    hangUp,
    recall,
    dismissOutcome,
    addParticipant,
    toggleKeypad,
  };
}
