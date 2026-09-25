import React, { memo } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { SpeakerAnimation } from './SpeakerAnimation';
import { Keypad } from './Keypad';
import styles from '../VoiceAgent.module.css';

interface PhoneShellProps {
  phoneState: string;
  isVibrating: boolean;
  isAISpeaking: boolean;
  activeKey: string | null;
  onCall: () => void;
  onHangup: () => void;
  onKey: (digit: string) => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onCenter?: () => void;
  onSoftLeft?: () => void;
  onSoftRight?: () => void;
  children: React.ReactNode;
}

export const PhoneShell: React.FC<PhoneShellProps> = memo(({
  phoneState,
  isVibrating,
  isAISpeaking,
  activeKey,
  onCall,
  onHangup,
  onKey,
  onArrowUp,
  onArrowDown,
  onCenter,
  onSoftLeft,
  onSoftRight,
  children,
}) => {
  const normalizedState = phoneState.toLowerCase();
  const isIncoming = normalizedState === 'incoming' || normalizedState === 'incoming_call' || normalizedState === 'ringing';
  const isCallActive =
    normalizedState === 'connecting' ||
    normalizedState === 'connected' ||
    normalizedState === 'greeting' ||
    normalizedState === 'speaking' ||
    normalizedState === 'ai_speaking' ||
    normalizedState === 'dtmf_menu' ||
    normalizedState === 'main_menu' ||
    normalizedState === 'crop_menu' ||
    normalizedState === 'status_check' ||
    normalizedState === 'processing' ||
    normalizedState === 'confirmation' ||
    normalizedState === 'success' ||
    normalizedState === 'sms_sent';

  const keypadDisabled =
    normalizedState === 'idle' ||
    isIncoming ||
    normalizedState === 'connecting' ||
    normalizedState === 'processing';

  return (
    <div
      className={`${styles.phoneOuterShadow} ${
        isIncoming ? styles.phoneChassisRinging : ''
      }`}
    >
      <div
        className={`${styles.phoneChassis} ${
          isVibrating ? styles.phoneVibrating : ''
        }`}
      >
        {/* Subtle Matte Plastic Specular Highlight */}
        <div className={styles.plasticHighlightOverlay} />

        {/* Top Speaker Grill with Animated Acoustic Soundwaves */}
        <SpeakerAnimation active={isIncoming || isAISpeaking} />

        {/* Brand Badge */}
        <div className={styles.nokiaBrandBadge}>MANDIQ 3310</div>

        {/* The Monochrome Screen Bezel & LCD */}
        {children}

        {/* ── INDUSTRIAL NAVIGATION CLUSTER ── */}
        <div className={styles.navigationCluster}>
          {/* Row 1: Soft Left + Soft Right Buttons */}
          <div className={styles.softKeysRow}>
            <button
              type="button"
              className={styles.tactileSoftKey}
              aria-label="Soft Left Key"
              onClick={onSoftLeft}
            >
              <span className={styles.softKeyPillText}>Select</span>
            </button>
            <button
              type="button"
              className={styles.tactileSoftKey}
              aria-label="Soft Right Key"
              onClick={onSoftRight}
            >
              <span className={styles.softKeyPillText}>Back</span>
            </button>
          </div>

          {/* Row 2: Green Accept | Metallic D-pad Disc | Red Reject */}
          <div className={styles.callDpadRow}>
            {/* Green Call / Accept Button */}
            <button
              type="button"
              className={`${styles.tactileCallBtn} ${
                isIncoming ? styles.callBtnFlashing : ''
              }`}
              onClick={onCall}
              disabled={isCallActive}
              aria-label="Accept / Call"
              title={isIncoming ? 'Accept Incoming Call' : 'Start Call'}
            >
              <Phone size={15} strokeWidth={2.4} />
            </button>

            {/* Circular Chrome / Matte Silver D-pad */}
            <div className={styles.metallicDpad} role="group" aria-label="Nokia D-Pad">
              <button
                type="button"
                className={styles.dpadUpArrow}
                onClick={onArrowUp}
                aria-label="Navigate Up"
                title="Up"
              />
              <button
                type="button"
                className={styles.dpadDownArrow}
                onClick={onArrowDown}
                aria-label="Navigate Down"
                title="Down"
              />
              <div className={styles.dpadCrossRims} />
              <button
                type="button"
                className={styles.dpadCenterButton}
                onClick={onCenter}
                aria-label="Confirm Selection"
                title="Center Confirm"
              />
            </div>

            {/* Red Reject / End Button */}
            <button
              type="button"
              className={styles.tactileEndBtn}
              onClick={onHangup}
              disabled={normalizedState === 'idle'}
              aria-label="Reject / End Call"
              title="End Call / Reject"
            >
              <PhoneOff size={15} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* ── 3×4 PHYSICAL KEYPAD ── */}
        <Keypad
          onKey={onKey}
          disabled={keypadDisabled}
          activeKey={activeKey}
        />

        {/* Bottom Chin Microphone Hole */}
        <div className={styles.micHoleGrill}>
          <span className={styles.micPinHole} />
          <span className={styles.micPinHole} />
          <span className={styles.micPinHole} />
        </div>
      </div>
    </div>
  );
});

PhoneShell.displayName = 'PhoneShell';
