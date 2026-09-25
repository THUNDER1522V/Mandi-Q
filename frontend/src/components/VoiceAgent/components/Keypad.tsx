import React, { memo } from 'react';
import styles from '../VoiceAgent.module.css';

interface KeypadProps {
  onKey: (key: string) => void;
  disabled?: boolean;
  activeKey?: string | null;
}

const KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'abc' },
  { digit: '3', letters: 'def' },
  { digit: '4', letters: 'ghi' },
  { digit: '5', letters: 'jkl' },
  { digit: '6', letters: 'mno' },
  { digit: '7', letters: 'pqrs' },
  { digit: '8', letters: 'tuv' },
  { digit: '9', letters: 'wxyz' },
  { digit: '*', letters: '+' },
  { digit: '0', letters: '_' },
  { digit: '#', letters: ' ' },
];

export const Keypad: React.FC<KeypadProps> = memo(({
  onKey,
  disabled = false,
  activeKey = null,
}) => {
  return (
    <div className={styles.keypadGrid} role="group" aria-label="Nokia Keypad">
      {KEYS.map(({ digit, letters }) => {
        const isPressed = activeKey === digit;

        return (
          <button
            key={digit}
            type="button"
            className={`${styles.tactileKey} ${disabled ? styles.keyDisabled : ''} ${
              isPressed ? styles.keyPressed : ''
            }`}
            onClick={() => !disabled && onKey(digit)}
            disabled={disabled}
            aria-label={`Key ${digit} ${letters}`}
          >
            <span className={styles.keyDigit}>{digit}</span>
            {letters && <span className={styles.keySubLetters}>{letters}</span>}
            {isPressed && <span className={styles.keyGlowAura} />}
          </button>
        );
      })}
    </div>
  );
});

Keypad.displayName = 'Keypad';
