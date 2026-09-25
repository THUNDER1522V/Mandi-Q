// Hook: useDTMF
// Handles keypad button presses, active key depression animation, and dual-frequency DTMF audio feedback

import { useState, useCallback, useRef } from 'react';
import { audioEngine } from '../audio/audioEngine';

interface UseDTMFProps {
  onDTMFInput?: (key: string) => void;
  triggerVibrate?: (durationMs?: number) => void;
}

export function useDTMF({ onDTMFInput, triggerVibrate }: UseDTMFProps = {}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pressKey = useCallback(
    (key: string) => {
      // 1. Play authentic DTMF dual-tone
      audioEngine.playDTMF(key);

      // 2. Play tactile mechanical click
      audioEngine.playKeyClick();

      // 3. Trigger haptic vibration if provided
      if (triggerVibrate) {
        triggerVibrate(80);
      }

      // 4. Depress key visually
      setActiveKey(key);
      setLastKey(key);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setActiveKey(null);
      }, 160);

      // 5. Notify DTMF handler
      if (onDTMFInput) {
        onDTMFInput(key);
      }
    },
    [onDTMFInput, triggerVibrate]
  );

  const clearLastKey = useCallback(() => {
    setLastKey('');
  }, []);

  return {
    activeKey,
    lastKey,
    pressKey,
    clearLastKey,
  };
}
