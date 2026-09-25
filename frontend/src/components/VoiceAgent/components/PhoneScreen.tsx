import React, { memo } from 'react';
import type { PhoneState, BookingResult, CropOption } from '../types';
import type { BookingDetails } from '../../../types/voice';
import { LCDStatusBar } from './LCDStatusBar';
import { IncomingCall } from './IncomingCall';
import { SpeakingScreen } from './SpeakingScreen';
import { MenuScreen } from './MenuScreen';
import { ConfirmationScreen } from './ConfirmationScreen';
import styles from '../VoiceAgent.module.css';

interface PhoneScreenProps {
  phoneState: PhoneState | string;
  durationSeconds: number;
  subtitles: string;
  isAISpeaking: boolean;
  lastKey?: string;
  selectedCrop?: CropOption | null;
  booking?: BookingResult | BookingDetails | null;
  selectedIndex?: number;
  statusMessage?: string;
}

export const PhoneScreen: React.FC<PhoneScreenProps> = memo(({
  phoneState,
  durationSeconds,
  subtitles,
  isAISpeaking,
  lastKey,
  selectedCrop,
  booking,
  selectedIndex = 0,
  statusMessage,
}) => {
  const normalized = phoneState.toString().toLowerCase();

  const isIncoming =
    normalized === 'incoming' ||
    normalized === 'incoming_call' ||
    normalized === 'ringing';

  const isConnected =
    normalized !== 'idle' &&
    normalized !== 'call_ended';

  // Contextual soft key labels at the bottom of the LCD
  const getSoftKeyLabels = (): [string, string] => {
    switch (normalized) {
      case 'idle':
        return ['Menu', 'Names'];
      case 'incoming':
      case 'incoming_call':
      case 'ringing':
        return ['Accept', 'Reject'];
      case 'connecting':
      case 'connected':
        return ['', 'End'];
      case 'speaking':
      case 'greeting':
      case 'ai_speaking':
        return ['Mute', 'End'];
      case 'dtmf_menu':
      case 'main_menu':
      case 'crop_menu':
        return ['Select', 'End'];
      case 'status_check':
        return ['Menu', 'End'];
      case 'processing':
        return ['', ''];
      case 'confirmation':
      case 'success':
      case 'sms_sent':
        return ['OK', 'End'];
      case 'completed':
      case 'call_ended':
        return ['Done', 'Exit'];
      default:
        return ['', ''];
    }
  };

  const [softLeft, softRight] = getSoftKeyLabels();

  // Normalize booking object
  const normalizedBooking = booking
    ? {
        token: booking.token,
        crop: booking.crop,
        date: booking.date,
        slotTime: (booking as any).slotTime || '',
        apmcGate: (booking as any).apmcGate || (booking as any).gate || 'Gate 1',
        tokenNumber: (booking as any).tokenNumber || (booking as any).rawTokenNumber || 0,
        smsText: booking.smsText,
        farmerName: (booking as any).name || (booking as any).farmerName,
      }
    : null;

  return (
    <div className={styles.screenBezel}>
      <div className={`${styles.lcdPanel} ${isIncoming ? styles.lcdRingingPulse : ''}`}>
        {/* Top Status Bar: Signal + Clock + Battery */}
        <LCDStatusBar connected={isConnected} />

        {/* ── SCREEN BODY CONTENT ROUTER ── */}
        <div className={styles.lcdContentArea}>
          {/* STATE: IDLE STANDBY */}
          {normalized === 'idle' && (
            <div className={styles.idleScreen}>
              <div className={styles.idleBrand}>MANDI-Q</div>
              <div className={styles.idleNetworkLabel}>AI VOICE AGENT</div>
              <div className={styles.idleStatusBadge}>
                <span className={styles.idleDot} />
                READY
              </div>
              <div className={styles.idleBigClock}>
                {new Date().toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </div>
              <div className={styles.idleHint}>PRESS CALL TO START</div>
            </div>
          )}

          {/* STATE: INCOMING CALL / RINGING */}
          {isIncoming && (
            <IncomingCall
              callerName="MANDIQ AI Assistant"
              callerNumber="+91 1800-MANDIQ"
            />
          )}

          {/* STATE: CONNECTING */}
          {(normalized === 'connecting' || normalized === 'connected') && (
            <div className={styles.connectingScreen}>
              <div className={styles.connectingTitle}>CALLING</div>
              <div className={styles.connectingMain}>MANDIQ AI</div>
              <div className={styles.connectingDots}>
                <span className={styles.connectingDot} />
                <span className={styles.connectingDot} />
                <span className={styles.connectingDot} />
              </div>
              <div className={styles.connectingSub}>Connecting line...</div>
            </div>
          )}

          {/* STATE: GREETING & AI SPEAKING */}
          {(normalized === 'speaking' || normalized === 'greeting' || normalized === 'ai_speaking') && (
            <SpeakingScreen
              durationSeconds={durationSeconds}
              subtitles={subtitles}
              isSpeaking={isAISpeaking}
            />
          )}

          {/* STATE: DTMF MAIN MENU */}
          {(normalized === 'dtmf_menu' || normalized === 'main_menu') && (
            <MenuScreen
              mode="main"
              durationSeconds={durationSeconds}
              lastKey={lastKey}
              subtitles={subtitles}
              selectedIndex={selectedIndex}
            />
          )}

          {/* STATE: CROP SELECTION MENU */}
          {normalized === 'crop_menu' && (
            <MenuScreen
              mode="crop"
              durationSeconds={durationSeconds}
              lastKey={lastKey}
              subtitles={subtitles}
              selectedIndex={selectedIndex}
            />
          )}

          {/* STATE: STATUS CHECK RESULT */}
          {normalized === 'status_check' && (
            <MenuScreen
              mode="status"
              durationSeconds={durationSeconds}
              lastKey={lastKey}
              subtitles={subtitles}
              statusMessage={statusMessage}
              selectedIndex={selectedIndex}
            />
          )}

          {/* STATE: ERROR RECOVERY */}
          {normalized === 'error' && (
            <div className={styles.connectingScreen}>
              <div className={styles.connectingTitle}>ERROR</div>
              <div className={styles.connectingMain}>KRIPYA DHYAN DEIN</div>
              <div style={{ fontSize: 9, padding: '8px 0', textAlign: 'center' }}>
                {subtitles || 'Kripya dobara prayas kijiye.'}
              </div>
            </div>
          )}

          {/* STATE: PROCESSING RESERVATION */}
          {normalized === 'processing' && (
            <ConfirmationScreen
              stage="processing"
              cropName={selectedCrop?.nameEnglish}
            />
          )}

          {/* STATE: BOOKING CONFIRMATION / SUCCESS */}
          {(normalized === 'confirmation' || normalized === 'success') && (
            <ConfirmationScreen
              stage="confirmation"
              booking={normalizedBooking}
              cropName={selectedCrop?.nameEnglish}
            />
          )}

          {/* STATE: SMS SENT SCREEN */}
          {normalized === 'sms_sent' && (
            <ConfirmationScreen
              stage="sms_sent"
              booking={normalizedBooking}
            />
          )}

          {/* STATE: COMPLETED SUMMARY / CALL ENDED */}
          {(normalized === 'completed' || normalized === 'call_ended') && (
            <ConfirmationScreen
              stage="completed"
              booking={normalizedBooking}
            />
          )}
        </div>

        {/* Bottom Contextual Soft-Key Labels */}
        <div className={styles.lcdSoftKeysBar}>
          <span className={styles.lcdSoftKeyText}>{softLeft}</span>
          <span className={styles.lcdSoftKeyText}>{softRight}</span>
        </div>
      </div>
    </div>
  );
});

PhoneScreen.displayName = 'PhoneScreen';
