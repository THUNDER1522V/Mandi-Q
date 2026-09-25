import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Volume2,
  VolumeX,
  PhoneCall,
  RotateCcw,
  MessageSquareText,
  Activity,
  User,
  History,
} from 'lucide-react';
import type { Persona } from './types';
import type { BookingDetails } from '../../types/voice';
import { DEMO_PERSONAS } from './conversation';
import { audioEngine } from './audio/audioEngine';
import { useCallSession } from '../../hooks/useCallSession';
import { useIVR } from '../../hooks/useIVR';
import { useSpeech } from '../../hooks/useSpeech';
import { useNotifications } from '../../hooks/useNotifications';
import { PhoneShell } from './components/PhoneShell';
import { PhoneScreen } from './components/PhoneScreen';
import styles from './VoiceAgent.module.css';

interface VoiceAgentPageProps {
  onBookingConfirmed?: (booking: BookingDetails | any) => void;
  onDashboardSync?: () => void;
}

export const VoiceAgentPage: React.FC<VoiceAgentPageProps> = memo(({
  onBookingConfirmed,
  onDashboardSync,
}) => {
  const [activePersonaId, setActivePersonaId] = useState<string>('p1');
  const [isMuted, setIsMuted] = useState<boolean>(() => audioEngine.isAudioMuted());

  // 0. Mock Notifications
  const { notifications: mockNotifications } = useNotifications();

  // 1. Subtitle & Progressive Speech Engine
  const { subtitles, isSpeaking, speak, clearSubtitles } = useSpeech({
    typingSpeedMs: 24,
  });

  // 2. Call Session Lifecycle State Machine
  const {
    callState,
    caller,
    setCaller,
    booking,
    statusResult,
    history,
    durationSeconds,
    isVibrating,
    currentPrompt,
    addTurn,
    triggerVibrate,
    triggerIncomingCall,
    acceptCall,
    rejectCall,
    endCall,
    openCropMenu,
    executeBooking,
    executeStatusCheck,
    executeAIVoiceMode,
    handleError,
    resetSession,
  } = useCallSession({
    onBookingComplete: onBookingConfirmed,
    onDashboardSync,
  });

  // Sync spoken prompts with subtitle typewriter engine
  useEffect(() => {
    if (currentPrompt) {
      speak(currentPrompt);
    } else {
      clearSubtitles();
    }
  }, [currentPrompt, speak, clearSubtitles]);

  // 3. Physical Keypad & D-Pad Engine
  const { activeKey, cursorIndex, setMenu, handleKeyPress } = useIVR({
    onVibrate: triggerVibrate,
    onAcceptCall: acceptCall,
    onEndCall: () => {
      if (callState === 'RINGING' || callState === 'INCOMING_CALL') {
        rejectCall();
      } else {
        endCall();
      }
    },
    onDTMFAction: (digit) => {
      if (callState === 'MAIN_MENU') {
        if (digit === '1') {
          openCropMenu();
        } else if (digit === '2') {
          executeStatusCheck();
        } else if (digit === '3') {
          executeAIVoiceMode();
        } else if (digit === '0') {
          addTurn({
            speaker: 'USER',
            message: 'Key 0 pressed (Repeat Menu)',
            type: 'dtmf',
          });
          if (currentPrompt) speak(currentPrompt);
        } else if (digit === '#') {
          addTurn({
            speaker: 'USER',
            message: 'Key # pressed (End Call)',
            type: 'dtmf',
          });
          endCall();
        } else {
          addTurn({
            speaker: 'USER',
            message: `Key ${digit} pressed (Invalid Option)`,
            type: 'dtmf',
          });
          handleError();
        }
      } else if (callState === 'CROP_MENU') {
        if (digit === '1') executeBooking('Wheat');
        else if (digit === '2') executeBooking('Paddy');
        else if (digit === '3') executeBooking('Jowar');
        else if (digit === '4') executeBooking('Maize');
        else if (digit === '0') {
          addTurn({
            speaker: 'USER',
            message: 'Key 0 pressed (Back to Main Menu)',
            type: 'dtmf',
          });
          setMenu('main');
          openCropMenu(); // or back to main
        } else {
          addTurn({
            speaker: 'USER',
            message: `Key ${digit} pressed (Invalid Option)`,
            type: 'dtmf',
          });
          handleError();
        }
      } else if (callState === 'STATUS_CHECK') {
        if (digit === '1') openCropMenu();
        else if (digit === '0') setMenu('main');
        else if (digit === '#') endCall();
        else handleError();
      }
    },
    onConfirmAction: () => {
      if (callState === 'MAIN_MENU') {
        if (cursorIndex === 0) openCropMenu();
        else if (cursorIndex === 1) executeStatusCheck();
        else if (cursorIndex === 2) executeAIVoiceMode();
        else if (cursorIndex === 3) {
          addTurn({
            speaker: 'USER',
            message: 'Confirmed: Repeat Menu',
            type: 'dtmf',
          });
          if (currentPrompt) speak(currentPrompt);
        } else if (cursorIndex === 4) endCall();
      } else if (callState === 'CROP_MENU') {
        const crops = ['Wheat', 'Paddy', 'Jowar', 'Maize'];
        if (cursorIndex < 4) {
          executeBooking(crops[cursorIndex]);
        } else {
          setMenu('main');
        }
      } else if (callState === 'STATUS_CHECK') {
        if (cursorIndex === 0) openCropMenu();
        else if (cursorIndex === 1) setMenu('main');
        else if (cursorIndex === 2) endCall();
      }
    },
  });

  // 4. Physical Keyboard listener (0-9, *, #, Enter, Arrows, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (/^[0-9*#]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key as any);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleKeyPress('UP');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleKeyPress('DOWN');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (callState === 'RINGING' || callState === 'INCOMING_CALL') {
          handleKeyPress('CALL');
        } else {
          handleKeyPress('CENTER');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleKeyPress('END');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callState, handleKeyPress]);

  // Toggle Audio Mute
  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.setMuted(next);
  }, [isMuted]);

  // Persona Selection
  const handleSelectPersona = useCallback(
    (p: Persona) => {
      setActivePersonaId(p.id);
      setCaller({
        id: p.id,
        name: p.name,
        phone: p.phone,
        village: 'Indri Mandi',
        district: 'Karnal',
        state: 'Haryana',
        language: p.language,
        crop: p.crop,
      });
      addTurn({
        speaker: 'USER',
        message: `Selected persona: ${p.name} (${p.crop})`,
        type: 'dtmf',
      });
    },
    [setCaller, addTurn]
  );

  // Auto-trigger incoming call demo on mount if idle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (callState === 'IDLE') {
        triggerIncomingCall();
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Format Status String for Telemetry
  const statusLabels: Record<string, string> = {
    IDLE: 'Standby / Idle',
    INCOMING_CALL: 'Incoming Call Ringing',
    RINGING: 'Incoming Call Ringing',
    CONNECTED: 'Connecting Line...',
    GREETING: 'AI Greeting Started',
    MAIN_MENU: 'Waiting for Input (1-3, #)',
    CROP_MENU: 'Waiting for Crop Key (1-4)',
    STATUS_CHECK: 'Booking Status Displayed',
    AI_SPEAKING: 'AI Voice Listening',
    PROCESSING: 'Contacting APMC Backend...',
    SUCCESS: 'Slot Confirmed ✓',
    SMS_SENT: 'SMS Dispatched ✓',
    CALL_ENDED: 'Call Ended',
    ERROR: 'Error Recovery',
  };

  return (
    <div className={styles.voicePage}>
      {/* ══════════════════════ LEFT PANEL: CONTROL CENTER ══════════════════════ */}
      <div className={styles.leftPanel}>
        {/* Header Bar */}
        <div className={styles.panelHeaderBar}>
          <div className={styles.panelHeading}>Voice Agent Simulator (Sprint 8A)</div>
          <button
            type="button"
            className={styles.audioToggleBtn}
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} color="#16a34a" />}
            <span>{isMuted ? 'Audio Muted' : 'Sound ON'}</span>
          </button>
        </div>

        {/* Quick Demo Triggers */}
        <div className={styles.quickActionsBar}>
          <button
            type="button"
            className={styles.triggerCallBtn}
            onClick={triggerIncomingCall}
            disabled={callState !== 'IDLE'}
          >
            <PhoneCall size={15} />
            <span>Simulate Incoming Call</span>
          </button>
          <button
            type="button"
            className={styles.resetPhoneBtn}
            onClick={resetSession}
            title="Reset Phone to Standby"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Persona Selector */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <User size={14} />
            One-Click Farmer Persona ({caller.name})
          </div>
          <div className={styles.personaGrid}>
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.personaChip} ${
                  activePersonaId === p.id ? styles.active : ''
                }`}
                onClick={() => handleSelectPersona(p)}
              >
                <span className={styles.personaName}>{p.name}</span>
                <span className={styles.personaCrop}>{p.crop}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Call Telemetry */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <Activity size={14} />
            Call Telemetry & Backend Status
          </div>
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Call State</span>
              <span
                className={`${styles.telemetryValue} ${
                  callState !== 'IDLE' ? styles.telemetryActive : ''
                }`}
              >
                {statusLabels[callState] || callState}
              </span>
            </div>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Voice Engine</span>
              <span className={styles.telemetryValue}>Sarvam AI (Sprint 9)</span>
            </div>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>Latency</span>
              <span
                className={`${styles.telemetryValue} ${
                  callState !== 'IDLE' ? styles.telemetryActive : ''
                }`}
              >
                {callState !== 'IDLE' ? '220ms' : '—'}
              </span>
            </div>
            <div className={styles.telemetryItem}>
              <span className={styles.telemetryLabel}>STT / TTS</span>
              <span
                className={`${styles.telemetryValue} ${
                  callState !== 'IDLE' ? styles.telemetryActive : ''
                }`}
              >
                {isSpeaking ? 'Transmitting' : callState !== 'IDLE' ? 'Listening' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Conversation History (AI -> USER -> AI...) */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <History size={14} />
            Live Conversation History
          </div>
          <div className={styles.timelineScroll} style={{ maxHeight: 180 }}>
            {history.length === 0 ? (
              <div className={styles.timelineEmpty}>
                No call turns yet. Conversation will record live here.
              </div>
            ) : (
              history.map((turn) => (
                <div key={turn.id} className={styles.timelineRow}>
                  <span className={styles.timelineTime}>{turn.timestamp}</span>
                  <span
                    className={`${styles.timelineDot} ${
                      turn.speaker === 'AI' ? styles.ai : styles.user
                    }`}
                  />
                  <span className={styles.timelineText}>
                    <strong>[{turn.speaker}]:</strong> {turn.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notification Center / SMS Preview */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <MessageSquareText size={14} />
            Recent Notifications
          </div>
          <div className={styles.timelineScroll} style={{ maxHeight: 200 }}>
            {mockNotifications.length === 0 ? (
              <div className={styles.timelineEmpty}>
                No notifications yet.
              </div>
            ) : (
              mockNotifications.map((notif) => {
                const diffSecs = Math.floor((new Date().getTime() - new Date(notif.timestamp).getTime()) / 1000);
                const timeAgo = diffSecs < 60 ? `${diffSecs} sec ago` : `${Math.floor(diffSecs / 60)} min ago`;
                
                return (
                  <div key={notif.id} className={styles.timelineRow} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className={styles.smsBadge} style={{ padding: '2px 4px', fontSize: 10 }}>Delivered ✓</span>
                        SMS sent to {notif.farmerName}
                      </span>
                      <span className={styles.timelineTime}>{timeAgo}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Token <strong>{notif.token}</strong>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════ RIGHT PANEL: NOKIA 3310 PHONE ══════════════════════ */}
      <div className={styles.rightPanel}>
        <PhoneShell
          phoneState={callState}
          isVibrating={isVibrating}
          isAISpeaking={isSpeaking}
          activeKey={activeKey}
          onCall={() => handleKeyPress('CALL')}
          onHangup={() => handleKeyPress('END')}
          onKey={(digit) => handleKeyPress(digit as any)}
          onArrowUp={() => handleKeyPress('UP')}
          onArrowDown={() => handleKeyPress('DOWN')}
          onCenter={() => handleKeyPress('CENTER')}
          onSoftLeft={() => handleKeyPress('SOFT_LEFT')}
          onSoftRight={() => handleKeyPress('SOFT_RIGHT')}
        >
          <PhoneScreen
            phoneState={callState}
            durationSeconds={durationSeconds}
            subtitles={subtitles}
            isAISpeaking={isSpeaking}
            lastKey={activeKey || undefined}
            booking={booking}
            selectedIndex={cursorIndex}
            statusMessage={statusResult?.message}
          />
        </PhoneShell>
      </div>
    </div>
  );
});

VoiceAgentPage.displayName = 'VoiceAgentPage';
