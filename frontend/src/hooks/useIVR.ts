// MANDIQ — Keypad & IVR Navigation Hook (Sprint 8A)

import { useState, useCallback, useRef } from 'react';
import { audioEngine } from '../components/VoiceAgent/audio/audioEngine';
import { ivrEngine } from '../services/ivrEngine';
import type { DTMFDigit, KeypadKey, IVROption, IVRMenuId } from '../types/voice';

interface UseIVROptions {
  onDTMFAction?: (digit: DTMFDigit, option?: IVROption) => void;
  onConfirmAction?: (option?: IVROption) => void;
  onEndCall?: () => void;
  onAcceptCall?: () => void;
  onVibrate?: () => void;
}

export function useIVR({
  onDTMFAction,
  onConfirmAction,
  onEndCall,
  onAcceptCall,
  onVibrate,
}: UseIVROptions = {}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [currentMenuId, setCurrentMenuId] = useState<IVRMenuId>('main');
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const keyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set active menu and reset cursor
  const setMenu = useCallback((menuId: IVRMenuId) => {
    ivrEngine.setMenu(menuId);
    setCurrentMenuId(menuId);
    setCursorIndex(0);
  }, []);

  // Flash key press with cyan aura and tactile animation
  const flashKey = useCallback(
    (key: string) => {
      setActiveKey(key);
      if (onVibrate) onVibrate();

      if (keyTimeoutRef.current) {
        clearTimeout(keyTimeoutRef.current);
      }

      keyTimeoutRef.current = setTimeout(() => {
        setActiveKey(null);
      }, 160);
    },
    [onVibrate]
  );

  // Core keypad dispatch handler
  const handleKeyPress = useCallback(
    (key: KeypadKey) => {
      flashKey(key);

      // Green Accept
      if (key === 'CALL') {
        audioEngine.playKeyClick();
        if (onAcceptCall) onAcceptCall();
        return;
      }

      // Red End / Hangup
      if (key === 'END' || key === '#') {
        audioEngine.playHangupTone();
        if (onEndCall) onEndCall();
        return;
      }

      // Directional D-pad Up / Down
      if (key === 'UP' || key === 'DOWN') {
        audioEngine.playKeyClick();
        const newCursor = ivrEngine.moveCursor(key);
        setCursorIndex(newCursor);
        return;
      }

      // Metallic D-pad Center Button (Confirm)
      if (key === 'CENTER' || key === 'SOFT_LEFT') {
        audioEngine.playKeyClick();
        const selected = ivrEngine.getSelectedOption();
        if (onConfirmAction) {
          onConfirmAction(selected);
        }
        return;
      }

      // Soft Right (Back)
      if (key === 'SOFT_RIGHT') {
        audioEngine.playKeyClick();
        setMenu('main');
        return;
      }

      // Numeric DTMF Digits (0-9, *)
      if (/^[0-9*]$/.test(key)) {
        const digit = key as DTMFDigit;
        audioEngine.playDTMF(digit);
        audioEngine.playKeyClick();

        const matchedOption = ivrEngine.resolveDTMF(digit);
        if (onDTMFAction) {
          onDTMFAction(digit, matchedOption);
        }
      }
    },
    [flashKey, onAcceptCall, onEndCall, onConfirmAction, onDTMFAction, setMenu]
  );

  return {
    activeKey,
    currentMenuId,
    currentMenu: ivrEngine.getCurrentMenu(),
    cursorIndex,
    setMenu,
    handleKeyPress,
  };
}
