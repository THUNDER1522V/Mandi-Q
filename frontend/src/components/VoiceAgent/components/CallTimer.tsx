import React, { memo } from 'react';
import styles from '../VoiceAgent.module.css';

interface CallTimerProps {
  seconds: number;
}

export const CallTimer: React.FC<CallTimerProps> = memo(({ seconds }) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');

  return (
    <div className={styles.lcdTimerContainer}>
      <span className={styles.lcdTimerDigits}>
        {m}:{s}
      </span>
      <span className={styles.lcdTimerLabel}>CALL TIME</span>
    </div>
  );
});

CallTimer.displayName = 'CallTimer';
