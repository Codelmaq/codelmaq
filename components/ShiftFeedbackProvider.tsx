'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { ShiftFeedback, ShiftFeedbackData } from './ShiftFeedback';
import { playForKind, AudioKind, unlockAudio } from '@/lib/audioFeedback';

interface ShiftFeedbackApi {
  show: (data: ShiftFeedbackData) => void;
  /** Convenience helper: shows a kind-tagged feedback AND plays its sound. */
  showWithSound: (data: ShiftFeedbackData) => void;
  hide: () => void;
  /** No-op unless called from a user gesture — keeps AudioContext unlocked. */
  primeAudio: () => void;
}

const ShiftFeedbackContext = createContext<ShiftFeedbackApi | null>(null);

export function ShiftFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [feedback, setFeedback] = useState<ShiftFeedbackData | null>(null);

  const show = useCallback((data: ShiftFeedbackData) => {
    setFeedback(data);
  }, []);

  const showWithSound = useCallback((data: ShiftFeedbackData) => {
    setFeedback(data);
    // Pick audio kind from feedback kind. Errors don't have a "sound" but
    // playError() is the audioKind anyway.
    const audioKind: AudioKind =
      data.kind === 'open' ? 'open'
      : data.kind === 'close' ? 'close'
      : data.kind === 'error' ? 'error'
      : data.kind === 'success' ? 'success'
      : 'success';
    playForKind(audioKind);
  }, []);

  const hide = useCallback(() => {
    setFeedback(null);
  }, []);

  const primeAudio = useCallback(() => {
    unlockAudio();
  }, []);

  return (
    <ShiftFeedbackContext.Provider value={{ show, showWithSound, hide, primeAudio }}>
      {children}
      <ShiftFeedback feedback={feedback} onDismiss={hide} />
    </ShiftFeedbackContext.Provider>
  );
}

export function useShiftFeedback(): ShiftFeedbackApi {
  const ctx = useContext(ShiftFeedbackContext);
  if (!ctx) {
    throw new Error('useShiftFeedback must be used inside <ShiftFeedbackProvider>');
  }
  return ctx;
}