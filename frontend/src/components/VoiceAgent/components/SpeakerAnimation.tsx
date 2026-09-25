import React, { memo } from 'react';
import styles from '../VoiceAgent.module.css';

interface SpeakerAnimationProps {
  active: boolean;
}

export const SpeakerAnimation: React.FC<SpeakerAnimationProps> = memo(({ active }) => {
  return (
    <div className={styles.speakerGrillWrapper}>
      {/* Visual soundwave pulses emanating outward when active */}
      {active && (
        <div className={styles.speakerSoundwaves}>
          <span className={`${styles.soundwaveRing} ${styles.wave1}`} />
          <span className={`${styles.soundwaveRing} ${styles.wave2}`} />
          <span className={`${styles.soundwaveRing} ${styles.wave3}`} />
        </div>
      )}

      {/* 5 Precision acoustic perforated micro-holes */}
      <div className={`${styles.earpieceGrill} ${active ? styles.earpieceGlowing : ''}`}>
        <span className={styles.speakerHole} />
        <span className={styles.speakerHole} />
        <span className={styles.speakerHole} />
        <span className={styles.speakerHole} />
        <span className={styles.speakerHole} />
      </div>
    </div>
  );
});

SpeakerAnimation.displayName = 'SpeakerAnimation';
