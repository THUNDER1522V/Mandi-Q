// Hook: usePhoneState
// Manages Nokia phone state machine, ringtone audio lifecycle, call timer, and vibration

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PhoneState } from '../types';
import { audioEngine } from '../audio/audioEngine';

export function usePhoneState(initialState: PhoneState = 'idle') {
  const [phoneState, setPhoneState] = useState<PhoneState>(initialState);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isVibrating, setIsVibrating] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vibration trigger helper
  const triggerVibrate = useCallback((durationMs: number = 380) => {
    setIsVibrating(true);
    setTimeout(() => setIsVibrating(false), durationMs);
  }, []);

  // Sync ringtone with incoming state
  useEffect(() => {
    if (phoneState === 'incoming') {
      audioEngine.playNokiaRingtone();
      triggerVibrate(800);
    } else {
      audioEngine.stopNokiaRingtone();
    }
  }, [phoneState, triggerVibrate]);

  // Call duration counter
  useEffect(() => {
    const isCallActive =
      phoneState === 'connecting' ||
      phoneState === 'speaking' ||
      phoneState === 'dtmf_menu' ||
      phoneState === 'crop_menu' ||
      phoneState === 'processing' ||
      phoneState === 'confirmation';

    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setDurationSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phoneState === 'idle') {
        setDurationSeconds(0);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phoneState]);

  // Actions
  const triggerIncomingCall = useCallback(() => {
    if (phoneState !== 'idle') return;
    setPhoneState('incoming');
  }, [phoneState]);

  const acceptCall = useCallback(() => {
    if (phoneState !== 'incoming') return;
    audioEngine.stopNokiaRingtone();
    audioEngine.playCallConnectedTone();
    setPhoneState('connecting');
    triggerVibrate(200);
  }, [phoneState, triggerVibrate]);

  const rejectCall = useCallback(() => {
    audioEngine.stopNokiaRingtone();
    audioEngine.playCallEndTone();
    setPhoneState('idle');
    triggerVibrate(150);
  }, [triggerVibrate]);

  const endCall = useCallback(() => {
    audioEngine.stopNokiaRingtone();
    audioEngine.playCallEndTone();
    setPhoneState('idle');
    triggerVibrate(150);
  }, [triggerVibrate]);

  const resetToIdle = useCallback(() => {
    audioEngine.stopNokiaRingtone();
    setPhoneState('idle');
    setDurationSeconds(0);
  }, []);

  return {
    phoneState,
    setPhoneState,
    durationSeconds,
    isVibrating,
    triggerVibrate,
    triggerIncomingCall,
    acceptCall,
    rejectCall,
    endCall,
    resetToIdle,
  };
}
