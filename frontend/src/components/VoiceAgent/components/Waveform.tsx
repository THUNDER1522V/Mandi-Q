import React, { memo } from 'react';
import styles from '../VoiceAgent.module.css';

interface WaveformProps {
  active?: boolean;
  barCount?: number;
}

const DEFAULT_BAR_FACTORS = [0.35, 0.75, 1.0, 0.6, 0.95, 0.45, 0.85, 0.55, 0.9, 0.65, 0.4, 0.8];

export const Waveform: React.FC<WaveformProps> = memo(({ active = true, barCount = 10 }) => {
  const bars = DEFAULT_BAR_FACTORS.slice(0, barCount);

  return (
    <div className={styles.lcdWaveformWrap} aria-label="Audio Waveform">
      {bars.map((factor, index) => (
        <div
          key={index}
          className={`${styles.lcdWaveBar} ${active ? styles.lcdWaveActive : styles.lcdWaveIdle}`}
          style={{
            height: Math.round(factor * 16),
            animationDelay: `${(index * 0.07).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
});

Waveform.displayName = 'Waveform';
