import React, { memo, useState, useEffect } from 'react';
import type { PhoneState, TranscriptLine } from './types';
import styles from './VoiceAgent.module.css';

// ── LCD Screen — Monochrome Nokia 3310 Display ────────────────────────────────
interface LCDProps {
  state: PhoneState;
  durationSeconds: number;
  lastKey: string;
  booking?: { token: string; slotTime: string; date: string } | null;
  isVoiceMode?: boolean;
}

const WAVE_BARS = [0.3, 0.7, 1.0, 0.6, 0.9, 0.4, 0.8, 0.5, 1.0, 0.7];

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Battery Icon (pixel-art with animated segments) ──────────────────────────
const BatteryIcon: React.FC<{ charging?: boolean }> = memo(({ charging }) => {
  const [segments, setSegments] = useState(3);

  useEffect(() => {
    if (!charging) return;
    const interval = setInterval(() => {
      setSegments(s => s >= 3 ? 1 : s + 1);
    }, 1200);
    return () => clearInterval(interval);
  }, [charging]);

  return (
    <div className={styles.lcdBattery}>
      <div className={styles.lcdBatteryBody}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`${styles.lcdBatterySegment} ${i < segments ? styles.filled : ''}`}
          />
        ))}
      </div>
      <div className={styles.lcdBatteryTip} />
    </div>
  );
});
BatteryIcon.displayName = 'BatteryIcon';

// ── Signal Bars ──────────────────────────────────────────────────────────────
const SignalBars: React.FC<{ connected: boolean }> = memo(({ connected }) => {
  const [animFrame, setAnimFrame] = useState(4);

  useEffect(() => {
    if (!connected) {
      setAnimFrame(4);
      return;
    }
    const interval = setInterval(() => {
      setAnimFrame(f => f === 4 ? 3 : 4);
    }, 3000);
    return () => clearInterval(interval);
  }, [connected]);

  const heights = [4, 6, 9, 12];

  return (
    <div className={styles.lcdSignal}>
      {heights.map((h, i) => (
        <div
          key={i}
          className={`${styles.lcdSignalBar} ${i < animFrame ? styles.active : ''}`}
          style={{ height: h }}
        />
      ))}
    </div>
  );
});
SignalBars.displayName = 'SignalBars';

// ── Main LCD Component ──────────────────────────────────────────────────────
export const LCD: React.FC<LCDProps> = memo(({ state, durationSeconds, lastKey, booking, isVoiceMode }) => {
  const isActive = state !== 'idle';
  const isCall = state === 'connected' || state === 'ivr_menu' || state === 'crop_selection';

  // Live clock updating every second for authentic powered-on Nokia LCD
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    };
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Soft key labels — change contextually like a real Nokia
  const getSoftKeys = (): [string, string] => {
    switch (state) {
      case 'idle':           return ['Menu', 'Names'];
      case 'calling':        return ['', 'End'];
      case 'connected':      return ['Options', 'End'];
      case 'ivr_menu':       return ['Select', 'Back'];
      case 'crop_selection': return ['Select', 'Back'];
      case 'confirmation':   return ['', 'End'];
      case 'completed':      return ['Done', 'End'];
      default:               return ['', ''];
    }
  };

  const [leftLabel, rightLabel] = getSoftKeys();

  return (
    <div className={styles.screenBezel}>
      <div className={styles.lcd}>
        {/* Status bar — signal + live clock + battery */}
        <div className={styles.lcdStatusBar}>
          <SignalBars connected={isActive} />
          <span className={styles.lcdTime}>{currentTime}</span>
          <BatteryIcon charging={isCall} />
        </div>

        {/* ── IDLE ────────────────────────────────────── */}
        {state === 'idle' && (
          <>
            <div className={styles.lcdTitle} style={{ marginTop: 10 }}>MANDIQ</div>
            <div className={styles.lcdMain} style={{ marginTop: 6 }}>
              NETWORK
            </div>
            <div className={styles.lcdSub} style={{ marginTop: 8 }}>
              Ready
              <span className={styles.lcdCursor} />
            </div>
            <div className={styles.lcdClockDisplay} style={{ marginTop: 12 }}>
              {currentTime}
            </div>
          </>
        )}

        {/* ── CALLING ─────────────────────────────────── */}
        {state === 'calling' && (
          <>
            <div className={styles.lcdTitle} style={{ marginTop: 8 }}>CALLING</div>
            <div className={styles.lcdMain} style={{ marginTop: 6 }}>
              MANDIQ IVR
            </div>
            <div className={styles.lcdSub} style={{ marginTop: 6 }}>
              Connecting...
            </div>
            <div className={styles.lcdWave}>
              {WAVE_BARS.map((h, i) => (
                <div
                  key={i}
                  className={styles.lcdWaveBar}
                  style={{
                    height: Math.round(h * 12),
                    animationDelay: `${i * 0.08}s`,
                    opacity: 0.5,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* ── CONNECTED ───────────────────────────────── */}
        {state === 'connected' && (
          <>
            <div className={styles.lcdTitle} style={{ marginTop: 6 }}>CONNECTED</div>
            <div className={styles.lcdTimer} style={{ marginTop: 8 }}>{formatDuration(durationSeconds)}</div>
            <div className={styles.lcdTimerLabel}>CALL TIME</div>
            {isVoiceMode && (
              <div className={styles.lcdWave} style={{ marginTop: 4 }}>
                {WAVE_BARS.map((h, i) => (
                  <div
                    key={i}
                    className={styles.lcdWaveBar}
                    style={{ height: Math.round(h * 14), animationDelay: `${i * 0.07}s` }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── IVR MENU ────────────────────────────────── */}
        {state === 'ivr_menu' && (
          <>
            <div className={styles.lcdTitle}>MANDIQ IVR</div>
            <div className={styles.lcdTimer} style={{ marginTop: 4 }}>{formatDuration(durationSeconds)}</div>
            <div className={styles.lcdMain} style={{ fontSize: 7, marginTop: 6 }}>
              1-BOOKING
            </div>
            <div className={styles.lcdSub} style={{ marginTop: 2 }}>
              2-STATUS 3-HELP
            </div>
            {lastKey && (
              <div className={styles.lcdSub} style={{ marginTop: 4 }}>
                KEY: {lastKey}
              </div>
            )}
          </>
        )}

        {/* ── CROP SELECTION ──────────────────────────── */}
        {state === 'crop_selection' && (
          <>
            <div className={styles.lcdTitle}>FASAL CHUNE</div>
            <div className={styles.lcdTimer} style={{ marginTop: 4 }}>{formatDuration(durationSeconds)}</div>
            <div className={styles.lcdMain} style={{ fontSize: 7, marginTop: 6 }}>
              1-GEHUN 2-DHAN
            </div>
            <div className={styles.lcdSub} style={{ marginTop: 2 }}>
              3-SARSON 4-KAPAS
            </div>
            {lastKey && (
              <div className={styles.lcdSub} style={{ marginTop: 4 }}>
                KEY: {lastKey}
              </div>
            )}
          </>
        )}

        {/* ── CONFIRMATION ────────────────────────────── */}
        {state === 'confirmation' && (
          <>
            <div className={styles.lcdTitle} style={{ marginTop: 10 }}>BOOKING OK</div>
            <div className={styles.lcdMain} style={{ marginTop: 8 }}>
              SMS SENT
            </div>
            <div className={styles.lcdSub} style={{ marginTop: 6 }}>
              DHANYAWAAD!
            </div>
          </>
        )}

        {/* ── COMPLETED ───────────────────────────────── */}
        {state === 'completed' && booking && (
          <>
            <div className={styles.lcdTitle} style={{ marginTop: 10 }}>BOOKED</div>
            <div className={styles.lcdMain} style={{ marginTop: 6 }}>
              {booking.token}
            </div>
            <div className={styles.lcdSub} style={{ marginTop: 4 }}>
              {booking.date}
            </div>
            <div className={styles.lcdSub}>
              {booking.slotTime}
            </div>
          </>
        )}

        {/* Soft key labels at bottom of LCD */}
        <div className={styles.lcdSoftKeys}>
          <span className={styles.lcdSoftLabel}>{leftLabel}</span>
          <span className={styles.lcdSoftLabel}>{rightLabel}</span>
        </div>
      </div>
    </div>
  );
});

LCD.displayName = 'LCD';

// ── Keypad — Nokia 3310 Oval Rubber Keys ─────────────────────────────────────
interface KeypadProps {
  onKey: (key: string) => void;
  disabled?: boolean;
  pressedKey?: string;
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
  { digit: '0', letters: '' },
  { digit: '#', letters: '' },
];

export const Keypad: React.FC<KeypadProps> = memo(({ onKey, disabled, pressedKey }) => (
  <div className={styles.keypadGrid}>
    {KEYS.map(({ digit, letters }) => (
      <button
        key={digit}
        type="button"
        className={`${styles.tactileKey} ${disabled ? styles.keyDisabled : ''} ${pressedKey === digit ? styles.keyPressed : ''}`}
        onClick={() => !disabled && onKey(digit)}
        aria-label={`Key ${digit}`}
      >
        {digit === '*' || digit === '#' ? (
          <>
            <span className={styles.keyDigit}>{digit}</span>
            {letters && <span className={styles.keySubLetters}>{letters}</span>}
          </>
        ) : (
          <>
            <span className={styles.keyDigit}>{digit}</span>
            {letters && <span className={styles.keySubLetters}>{letters}</span>}
          </>
        )}
      </button>
    ))}
  </div>
));

Keypad.displayName = 'Keypad';

// ── Voice Transcript ──────────────────────────────────────────────────────────
interface VoiceTranscriptProps {
  lines: TranscriptLine[];
  isTyping: boolean;
}

export const VoiceTranscript: React.FC<VoiceTranscriptProps> = memo(({ lines, isTyping }) => (
  <div className={styles.transcriptPanel}>
    <div className={styles.transcriptHeader}>
      <div className={styles.transcriptDot} />
      AI Voice Transcript
    </div>
    <div className={styles.transcriptBody}>
      {lines.length === 0 && !isTyping && (
        <div className={styles.transcriptEmpty}>
          Press the green call button to start the IVR demo.
        </div>
      )}
      {lines.map((line) => (
        <div key={line.id} className={styles.transcriptLine}>
          <span className={`${styles.transcriptSpeaker} ${line.speaker === 'AI' ? styles.ai : styles.farmer}`}>
            {line.speaker}
          </span>
          <span className={styles.transcriptText}>{line.text}</span>
        </div>
      ))}
      {isTyping && (
        <div className={styles.transcriptLine}>
          <span className={`${styles.transcriptSpeaker} ${styles.ai}`}>AI</span>
          <div className={styles.typingIndicator}>
            <div className={styles.typingDot} />
            <div className={styles.typingDot} />
            <div className={styles.typingDot} />
          </div>
        </div>
      )}
    </div>
  </div>
));

VoiceTranscript.displayName = 'VoiceTranscript';

// ── SMS Preview Card ──────────────────────────────────────────────────────────
interface SMSCardProps {
  smsText?: string;
  token?: string;
  visible: boolean;
}

export const SMSCard: React.FC<SMSCardProps> = memo(({ smsText, token, visible }) => (
  <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
    <div className={styles.cardTitle} style={{ padding: '14px 18px 0' }}>
      📱 SMS Preview
    </div>
    {!visible ? (
      <div className={styles.smsEmpty}>SMS will appear after booking is confirmed.</div>
    ) : (
      <div className={styles.smsCard} style={{ border: 'none', borderRadius: 0 }}>
        <div className={styles.smsHeader}>
          <div className={styles.smsAppIcon}>M</div>
          <div>
            <div className={styles.smsAppName}>MANDIQ</div>
          </div>
          <div className={styles.smsTime}>Now</div>
        </div>
        <div className={styles.smsBody}>
          {smsText}
          {token && (
            <div>
              <span className={styles.smsToken}>{token}</span>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
));

SMSCard.displayName = 'SMSCard';
