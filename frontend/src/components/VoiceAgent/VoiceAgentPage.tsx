import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Phone, PhoneOff, Mic, MicOff, CheckCircle2 } from 'lucide-react';
import type {
  PhoneState,
  Persona,
  CallerConfig,
  TimelineEvent,
  TranscriptLine,
  BookingResult,
  Language,
  CropType,
  VoiceProvider,
} from './types';
import {
  IVR_SCRIPTS,
  createTimelineEvent,
  generateToken,
  buildBookingResult,
  generateVoiceConversation,
} from './simulation';
import { LCD, Keypad, VoiceTranscript, SMSCard } from './PhoneComponents';
import styles from './VoiceAgent.module.css';

// ── PERSONAS ──────────────────────────────────────────────────────────────────
const PERSONAS: Persona[] = [
  { id: 'p1', name: 'Ramesh Singh', language: 'Hindi', phone: '9812034501', crop: 'Wheat', village: 'Nilokheri' },
  { id: 'p2', name: 'Harpreet Singh', language: 'Punjabi', phone: '9815067823', crop: 'Paddy', village: 'Taraori' },
  { id: 'p3', name: 'Birju Yadav', language: 'Hindi', phone: '9897045612', crop: 'Mustard', village: 'Gharaunda' },
];

const DEFAULT_CONFIG: CallerConfig = {
  name: 'Ramesh Singh',
  phone: '9812034501',
  language: 'Hindi',
  crop: 'Wheat',
  provider: 'Sarvam AI',
};

// ── MAIN VOICE AGENT PAGE ─────────────────────────────────────────────────────
export const VoiceAgentPage: React.FC = memo(() => {
  const [phoneState, setPhoneState] = useState<PhoneState>('idle');
  const [config, setConfig] = useState<CallerConfig>(DEFAULT_CONFIG);
  const [activePersona, setActivePersona] = useState<string>('p1');
  const [durationSecs, setDurationSecs] = useState(0);
  const [lastKey, setLastKey] = useState('');
  const [pressedKey, setPressedKey] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isVibrating, setIsVibrating] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [booking, setBooking] = useState<BookingResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptBodyRef.current) {
      transcriptBodyRef.current.scrollTop = transcriptBodyRef.current.scrollHeight;
    }
  }, [transcript, isTyping]);

  // Duration timer
  useEffect(() => {
    if (phoneState === 'connected' || phoneState === 'ivr_menu' || phoneState === 'crop_selection') {
      timerRef.current = setInterval(() => setDurationSecs((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phoneState === 'idle') setDurationSecs(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phoneState]);

  const pushTimeline = useCallback((event: string, type: TimelineEvent['type']) => {
    setTimeline((prev) => [createTimelineEvent(event, type), ...prev.slice(0, 19)]);
  }, []);

  const pushTranscript = useCallback((speaker: 'AI' | 'Farmer', text: string) => {
    const entry: TranscriptLine = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      speaker,
      text,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
    };
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const triggerVibrate = useCallback(() => {
    setIsVibrating(true);
    setTimeout(() => setIsVibrating(false), 450);
  }, []);

  // ── Call Flow ─────────────────────────────────────────────────────────────
  const handleCall = useCallback(() => {
    if (phoneState !== 'idle') return;
    setPhoneState('calling');
    setTranscript([]);
    setTimeline([]);
    setBooking(null);
    setLastKey('');
    triggerVibrate();
    pushTimeline('Call started', 'system');

    // After 2.5s → connected
    stateTimerRef.current = setTimeout(() => {
      setPhoneState('connected');
      pushTimeline('Connected to MANDIQ IVR', 'ai');
      setIsTyping(true);

      // Greeting
      setTimeout(() => {
        setIsTyping(false);
        IVR_SCRIPTS.connected.forEach((line, i) => {
          setTimeout(() => {
            pushTranscript('AI', line);
            if (i === IVR_SCRIPTS.connected.length - 1) {
              pushTimeline('Greeting played', 'ai');
              setTimeout(() => {
                setPhoneState('ivr_menu');
                pushTimeline('IVR menu presented', 'ai');
                setIsTyping(true);
                setTimeout(() => {
                  setIsTyping(false);
                  IVR_SCRIPTS.ivr_menu.forEach((l, j) => {
                    setTimeout(() => pushTranscript('AI', l), j * 800);
                  });
                }, 600);
              }, 800);
            }
          }, i * 900);
        });
      }, 1200);
    }, 2500);
  }, [phoneState, pushTimeline, pushTranscript, triggerVibrate]);

  const handleHangup = useCallback(() => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    setPhoneState('idle');
    setIsVoiceMode(false);
    setIsTyping(false);
    triggerVibrate();
    if (phoneState !== 'idle') pushTimeline('Call ended', 'system');
  }, [phoneState, pushTimeline, triggerVibrate]);

  // ── Keypad Press ──────────────────────────────────────────────────────────
  const handleKey = useCallback((key: string) => {
    if (isVoiceMode) return;
    setPressedKey(key);
    setTimeout(() => setPressedKey(''), 180);
    setLastKey(key);
    triggerVibrate();

    if (phoneState === 'ivr_menu' && key === '1') {
      pushTimeline('Pressed 1 — Slot Booking', 'user');
      pushTranscript('Farmer', '1');
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setPhoneState('crop_selection');
        pushTimeline('Crop selection menu', 'ai');
        IVR_SCRIPTS.crop_selection.forEach((l, i) => {
          setTimeout(() => pushTranscript('AI', l), i * 800 + 400);
        });
      }, 1000);
    } else if (phoneState === 'ivr_menu' && (key === '2' || key === '3')) {
      pushTimeline(`Pressed ${key}`, 'user');
      pushTranscript('Farmer', key);
      pushTranscript('AI', key === '2' ? 'Aapki booking active hai. Token TK-318.' : 'Complaint department band hai. 9 AM se 5 PM.');
    } else if (phoneState === 'crop_selection') {
      const crops: Record<string, string> = { '1': 'Gehun (Wheat)', '2': 'Dhan (Paddy)', '3': 'Sarson (Mustard)', '4': 'Kapas (Cotton)' };
      if (crops[key]) {
        pushTimeline(`Crop selected: ${crops[key]}`, 'user');
        pushTranscript('Farmer', key);
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setPhoneState('confirmation');
          pushTimeline('Slot booking confirmed', 'success');
          IVR_SCRIPTS.confirmation.forEach((l, i) => {
            setTimeout(() => {
              pushTranscript('AI', l);
              if (i === IVR_SCRIPTS.confirmation.length - 1) {
                const token = generateToken();
                const result = buildBookingResult(config, token);
                setBooking(result);
                pushTimeline('SMS sent to farmer', 'sms');
                setTimeout(() => setPhoneState('completed'), 2000);
              }
            }, i * 900 + 400);
          });
        }, 1200);
      }
    }
  }, [phoneState, isVoiceMode, config, pushTimeline, pushTranscript, triggerVibrate]);

  // ── Voice AI Mode ─────────────────────────────────────────────────────────
  const handleVoiceMode = useCallback(() => {
    if (phoneState === 'idle') {
      // Start call in voice mode
      setPhoneState('calling');
      setTranscript([]);
      setTimeline([]);
      setBooking(null);
      triggerVibrate();
      pushTimeline('Voice AI call started', 'system');

      setTimeout(() => {
        setPhoneState('connected');
        setIsVoiceMode(true);
        pushTimeline('Voice AI connected', 'ai');

        const lines = generateVoiceConversation(config);
        lines.forEach((line, i) => {
          setTimeout(() => {
            if (i < lines.length - 1) setIsTyping(true);
            setTimeout(() => {
              setIsTyping(false);
              pushTranscript(line.speaker, line.text);
              pushTimeline(
                line.speaker === 'AI' ? `AI: ${line.text.slice(0, 40)}...` : `Farmer: ${line.text}`,
                line.speaker === 'AI' ? 'ai' : 'user'
              );

              if (i === lines.length - 1) {
                // Done
                const token = generateToken();
                const result = buildBookingResult(config, token);
                setBooking(result);
                pushTimeline('Booking confirmed via Voice AI', 'success');
                pushTimeline('SMS dispatched', 'sms');
                setTimeout(() => {
                  setPhoneState('completed');
                  setIsVoiceMode(false);
                }, 1500);
              }
            }, 400);
          }, i * 2200);
        });
      }, 2000);
    } else {
      setIsVoiceMode((v) => !v);
    }
  }, [phoneState, config, pushTimeline, pushTranscript, triggerVibrate]);

  // ── Persona Selection ─────────────────────────────────────────────────────
  const handlePersona = useCallback((p: Persona) => {
    setActivePersona(p.id);
    setConfig((c) => ({ ...c, name: p.name, phone: p.phone, language: p.language, crop: p.crop }));
  }, []);

  // ── Status data for display ───────────────────────────────────────────────
  const callStateLabel: Record<PhoneState, string> = {
    idle: 'Idle',
    calling: 'Calling...',
    connected: 'Connected',
    ivr_menu: 'IVR Menu',
    crop_selection: 'Crop Selection',
    confirmation: 'Confirming',
    completed: 'Completed',
  };

  // Nokia 3310 body — no indicator LED needed

  return (
    <div className={styles.voicePage}>
      {/* ══════════════════════ LEFT PANEL ══════════════════════ */}
      <div className={styles.leftPanel}>
        <div className={styles.panelHeading}>Voice Agent Control Center</div>

        {/* One-Click Personas */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>One-Click Demo Personas</div>
          <div className={styles.personaGrid}>
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.personaChip} ${activePersona === p.id ? styles.active : ''}`}
                onClick={() => handlePersona(p)}
              >
                <span className={styles.personaName}>{p.name}</span>
                <span className={styles.personaLang}>{p.language}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Caller Setup */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Caller Setup</div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Voice Provider</label>
              <select
                className={styles.formSelect}
                value={config.provider}
                onChange={(e) => setConfig((c) => ({ ...c, provider: e.target.value as VoiceProvider }))}
              >
                <option>Sarvam AI</option>
                <option>Bhashini</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Language</label>
              <select
                className={styles.formSelect}
                value={config.language}
                onChange={(e) => setConfig((c) => ({ ...c, language: e.target.value as Language }))}
              >
                <option>Hindi</option>
                <option>Punjabi</option>
                <option>Haryanvi</option>
                <option>Bhojpuri</option>
                <option>English</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Crop</label>
              <select
                className={styles.formSelect}
                value={config.crop}
                onChange={(e) => setConfig((c) => ({ ...c, crop: e.target.value as CropType }))}
              >
                <option>Wheat</option>
                <option>Paddy</option>
                <option>Mustard</option>
                <option>Cotton</option>
                <option>Maize</option>
                <option>Bajra</option>
                <option>Sugarcane</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone</label>
              <input
                className={styles.formInput}
                type="tel"
                value={config.phone}
                onChange={(e) => setConfig((c) => ({ ...c, phone: e.target.value }))}
                placeholder="9812034501"
              />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Caller Name</label>
              <input
                className={styles.formInput}
                type="text"
                value={config.name}
                onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
                placeholder="Ramesh Singh"
              />
            </div>
          </div>
        </div>

        {/* Live Call Status */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Live Call Status</div>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>State</span>
              <span className={`${styles.statusValue} ${phoneState !== 'idle' ? styles.success : styles.muted}`}>
                {callStateLabel[phoneState]}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Voice Engine</span>
              <span className={styles.statusValue}>{config.provider}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Latency</span>
              <span className={`${styles.statusValue} ${phoneState !== 'idle' ? styles.success : styles.muted}`}>
                {phoneState !== 'idle' ? '238ms' : '—'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Speech-to-Text</span>
              <span className={`${styles.statusValue} ${phoneState !== 'idle' ? styles.success : styles.muted}`}>
                {phoneState !== 'idle' ? 'Working' : 'Idle'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Text-to-Speech</span>
              <span className={`${styles.statusValue} ${phoneState !== 'idle' ? styles.success : styles.muted}`}>
                {phoneState !== 'idle' ? 'Working' : 'Idle'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>SMS API</span>
              <span className={`${styles.statusValue} ${styles.success}`}>Connected</span>
            </div>
          </div>
        </div>

        {/* Event Timeline */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Real-Time Event Timeline</div>
          <div className={styles.timeline}>
            {timeline.length === 0 ? (
              <div className={styles.timelineEmpty}>No events yet. Start a call to see events.</div>
            ) : (
              timeline.map((evt) => (
                <div key={evt.id} className={styles.timelineItem}>
                  <span className={styles.timelineTime}>{evt.time}</span>
                  <div className={`${styles.timelineDot} ${styles[evt.type]}`} />
                  <span className={styles.timelineEvent}>{evt.event}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SMS Preview */}
        <SMSCard
          visible={!!booking}
          smsText={booking?.smsText}
          token={booking?.token}
        />
      </div>

      {/* ══════════════════════ RIGHT PANEL ══════════════════════ */}
      <div className={styles.rightPanel}>
        {/* Booking Success Banner */}
        {phoneState === 'completed' && booking && (
          <div className={styles.bookingSuccess}>
            <div className={styles.bookingSuccessTitle}>
              <CheckCircle2 size={16} />
              Booking Successful
            </div>
            <div className={styles.bookingMeta}>
              <div className={styles.bookingMetaItem}>
                <span className={styles.bookingMetaLabel}>Token</span>
                <span className={styles.bookingMetaValue}>{booking.token}</span>
              </div>
              <div className={styles.bookingMetaItem}>
                <span className={styles.bookingMetaLabel}>Date</span>
                <span className={styles.bookingMetaValue}>{booking.date}</span>
              </div>
              <div className={styles.bookingMetaItem}>
                <span className={styles.bookingMetaLabel}>Slot</span>
                <span className={styles.bookingMetaValue}>{booking.slotTime}</span>
              </div>
              <div className={styles.bookingMetaItem}>
                <span className={styles.bookingMetaLabel}>SMS</span>
                <span className={`${styles.bookingMetaValue}`} style={{ fontSize: 11 }}>Sent ✓</span>
              </div>
            </div>
          </div>
        )}

        {/* Feature Phone */}
        <div className={`${styles.phoneWrap} ${phoneState === 'calling' ? styles.phoneConnecting : ''}`}>
          <div className={`${styles.phone} ${isVibrating ? styles.phoneVibrating : ''}`}>

            {/* Earpiece perforated grille */}
            <div className={styles.earpiece}>
              <span className={styles.speakerHole} />
              <span className={styles.speakerHole} />
              <span className={styles.speakerHole} />
              <span className={styles.speakerHole} />
              <span className={styles.speakerHole} />
            </div>

            {/* LCD in thick black bezel */}
            <LCD
              state={phoneState}
              durationSeconds={durationSecs}
              lastKey={lastKey}
              booking={booking}
              isVoiceMode={isVoiceMode}
            />

            {/* ── Navigation Area ── */}
            <div className={styles.navArea}>

              {/* Row 1: Soft Left + Soft Right (above call/end) */}
              <div className={styles.softKeyRow}>
                <button
                  type="button"
                  className={styles.softKeyBtn}
                  aria-label="Menu"
                >
                  <span className={styles.softKeyLabel}>Menu</span>
                </button>
                <button
                  type="button"
                  className={styles.softKeyBtn}
                  aria-label="Back"
                >
                  <span className={styles.softKeyLabel}>Back</span>
                </button>
              </div>

              {/* Row 2: Call | D-pad | End */}
              <div className={styles.callDpadRow}>
                <button
                  type="button"
                  className={styles.callBtn}
                  onClick={handleCall}
                  disabled={phoneState !== 'idle'}
                  aria-label="Call"
                >
                  <Phone size={14} />
                </button>

                <div className={styles.dpad}>
                  <div className={styles.dpadCenter} />
                </div>

                <button
                  type="button"
                  className={styles.endBtn}
                  onClick={handleHangup}
                  aria-label="End Call"
                >
                  <PhoneOff size={14} />
                </button>
              </div>

            </div>

            {/* Keypad — immediately below nav */}
            <Keypad
              onKey={handleKey}
              disabled={
                isVoiceMode ||
                phoneState === 'idle' ||
                phoneState === 'calling' ||
                phoneState === 'connected' ||
                phoneState === 'confirmation' ||
                phoneState === 'completed'
              }
              pressedKey={pressedKey}
            />

            {/* Microphone hole */}
            <div className={styles.micHole}>
              <span className={styles.micDot} />
              <span className={styles.micDot} />
              <span className={styles.micDot} />
            </div>

          </div>
        </div>

        {/* IVR Hint */}
        {(phoneState === 'ivr_menu' || phoneState === 'crop_selection') && (
          <div className={styles.ivrHint}>
            Press a key on the phone keypad to respond to the IVR
          </div>
        )}

        {/* Voice AI Button */}
        <button
          type="button"
          className={`${styles.voiceAiBtn} ${isVoiceMode ? styles.active : ''}`}
          onClick={handleVoiceMode}
        >
          <div className={`${styles.micPulse} ${isVoiceMode ? styles.pulsing : ''}`}>
            {isVoiceMode ? <MicOff size={16} /> : <Mic size={16} />}
          </div>
          {isVoiceMode ? 'Voice AI Active — Listening...' : '🎤 Speak to Book (Voice AI)'}
        </button>

        {/* Transcript Panel */}
        <VoiceTranscript lines={transcript} isTyping={isTyping} />
      </div>
    </div>
  );
});

VoiceAgentPage.displayName = 'VoiceAgentPage';
