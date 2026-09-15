/**
 * Mandi Public Address (PA) Audio System & Synthesizer
 * Uses Web Audio API for industrial acoustic chimes and Web Speech API (Rung 2 Fallback) for Hindi announcements.
 */

const PA_LOG_STORAGE_KEY = 'mandiq_pa_log_v1';

// ── PA Announcement Log ──────────────────────────────────────────────────────
export interface PAAnnouncementEntry {
  id: string;
  token: string;
  farmerName: string;
  bayNumber: number;
  textHindi: string;
  timestamp: string;
}

export function writePALog(entry: PAAnnouncementEntry) {
  try {
    const raw = localStorage.getItem(PA_LOG_STORAGE_KEY);
    const existing: PAAnnouncementEntry[] = raw ? JSON.parse(raw) : [];
    // Keep newest first; cap at 50 entries to avoid storage bloat
    const updated = [entry, ...existing].slice(0, 50);
    localStorage.setItem(PA_LOG_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage quota — skip silently
  }
}

export function readPALog(): PAAnnouncementEntry[] {
  try {
    const raw = localStorage.getItem(PA_LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPALog() {
  try { localStorage.removeItem(PA_LOG_STORAGE_KEY); } catch { /* ignore */ }
}

class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play industrial two-tone railway/station PA chime before announcement
   */
  playChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Tone 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.18);
      gain2.gain.setValueAtTime(0.22, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.7);
    } catch {
      // Audio context may be restricted by browser policy
    }
  }

  /**
   * Play emergency halt alarm pulse
   */
  playEmergencyAlarm() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now + i * 0.25);
        osc.frequency.exponentialRampToValueAtTime(220, now + i * 0.25 + 0.2);
        gain.gain.setValueAtTime(0.25, now + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.25);
        osc.stop(now + i * 0.25 + 0.22);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Positive verification beep for status marked Served
   */
  playSuccessBeep() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEffects();

/**
 * Public Address Speech Synthesizer with Hindi pronunciation
 */
export function announceHindi(text: string, enabled = true) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  sound.playChime();

  setTimeout(() => {
    try {
      window.speechSynthesis.cancel(); // Clear any ongoing queue
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.95; // Clear speaking cadence for mandi environment
      utterance.pitch = 1.0;

      // Try to find a Hindi voice if available on system
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi') || v.name.includes('India'));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio speech synthesis failed silently
    }
  }, 400);
}

/**
 * Convenience method to announce next farmer to weighbridge bay.
 * Side-effect: persists the announcement to the PA log in localStorage.
 */
export function announceNextFarmer(token: string, farmerName: string, bay = 1, enabled = true) {
  const hindiToken = token.replace('T-', 'टी ');
  const text = `ध्यान दें। टोकन नंबर ${hindiToken}, श्री ${farmerName}, वे-ब्रिज संख्या ${bay} पर रिपोर्ट करें।`;

  // Persist to PA log
  writePALog({
    id: `pa-${Date.now()}`,
    token,
    farmerName,
    bayNumber: bay,
    textHindi: text,
    timestamp: new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  });

  announceHindi(text, enabled);
}

/**
 * Emergency broadcast announcement when Mandi halts
 */
export function announceHaltBroadcast(enabled = true) {
  sound.playEmergencyAlarm();
  const text = `आपातकालीन सूचना। करनाल अनाज मंडी में आज की खरीद तुरंत प्रभाव से स्थगित की जाती है। सभी किसान भाइयों को नया टोकन और स्लॉट एसएमएस द्वारा भेज दिया गया है।`;
  setTimeout(() => {
    announceHindi(text, enabled);
  }, 800);
}
