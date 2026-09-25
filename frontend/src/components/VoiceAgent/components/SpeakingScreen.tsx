import React, { memo } from 'react';
import { Waveform } from './Waveform';
import { CallTimer } from './CallTimer';
import styles from '../VoiceAgent.module.css';

interface SpeakingScreenProps {
  durationSeconds: number;
  subtitles: string;
  isSpeaking: boolean;
}

export const SpeakingScreen: React.FC<SpeakingScreenProps> = memo(({
  durationSeconds,
  subtitles,
  isSpeaking,
}) => {
  return (
    <div className={styles.speakingScreen}>
      {/* Title & Call Duration */}
      <div className={styles.speakingHeader}>
        <span className={styles.speakingTitle}>AI ASSISTANT</span>
        <CallTimer seconds={durationSeconds} />
      </div>

      {/* Dancing Audio Waveform */}
      <div className={styles.speakingWaveContainer}>
        <Waveform active={isSpeaking} barCount={10} />
      </div>

      {/* Subtitles Area with scrolling / typewriter text effect */}
      <div className={styles.subtitlesContainer}>
        <div className={styles.subtitlesLabel}>SPEECH (HINDI):</div>
        <div className={styles.subtitlesText}>
          {subtitles || 'Namaskar! Mandi-Q mein aapka swagat hai.'}
        </div>
      </div>
    </div>
  );
});

SpeakingScreen.displayName = 'SpeakingScreen';
