import React, { memo } from 'react';
import { Waveform } from './Waveform';
import styles from '../VoiceAgent.module.css';

interface IncomingCallProps {
  callerName?: string;
  callerNumber?: string;
}

export const IncomingCall: React.FC<IncomingCallProps> = memo(({
  callerName = 'MANDIQ AI Assistant',
  callerNumber = '+91 1800-MANDIQ',
}) => {
  return (
    <div className={styles.incomingCallScreen}>
      <div className={styles.incomingCallBadge}>
        <span className={styles.blinkingDot} />
        INCOMING CALL
      </div>

      {/* Caller Details */}
      <div className={styles.lcdCallerName}>{callerName}</div>
      <div className={styles.lcdCallerNumber}>{callerNumber}</div>

      {/* Pulsing Bell / Audio Waveform */}
      <div className={styles.incomingWaveWrap}>
        <Waveform active={true} barCount={8} />
      </div>

      <div className={styles.incomingCallPrompt}>
        <span>PRESS GREEN TO ANSWER</span>
      </div>
    </div>
  );
});

IncomingCall.displayName = 'IncomingCall';
