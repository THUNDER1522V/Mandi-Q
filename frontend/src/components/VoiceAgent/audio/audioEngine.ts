// Web Audio API Sound Synthesizer for Nokia AI Calling Phone
// Completely self-contained client-side synth: DTMF dual-tones, Nokia ringtone, key clicks.
// Zero external audio assets required.

class AudioEngine {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: ReturnType<typeof setInterval> | null = null;
  private isRinging: boolean = false;
  private muted: boolean = false;

  private getAudioContext(): AudioContext | null {
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

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (mute) {
      this.stopNokiaRingtone();
    }
  }

  public isAudioMuted(): boolean {
    return this.muted;
  }

  // ── DTMF DUAL-TONE SYNTHESIZER ──────────────────────────────────────────────
  // Telephony standard: Row frequencies + Column frequencies
  private dtmfFrequencies: Record<string, [number, number]> = {
    '1': [697, 1209],
    '2': [697, 1336],
    '3': [697, 1477],
    '4': [770, 1209],
    '5': [770, 1336],
    '6': [770, 1477],
    '7': [852, 1209],
    '8': [852, 1336],
    '9': [852, 1477],
    '*': [941, 1209],
    '0': [941, 1336],
    '#': [941, 1477],
  };

  public playDTMF(digit: string, durationMs: number = 140) {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const freqs = this.dtmfFrequencies[digit];
    if (!freqs) {
      this.playKeyClick();
      return;
    }

    try {
      const [f1, f2] = freqs;
      const now = ctx.currentTime;
      const duration = durationMs / 1000;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(f1, now);
      osc2.frequency.setValueAtTime(f2, now);

      // Smooth anti-click envelope
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gainNode.gain.setValueAtTime(0.12, now + duration - 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // AudioContext fallback
    }
  }

  // ── MECHANICAL PLASTIC KEY CLICK ───────────────────────────────────────────
  public playKeyClick() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sharp 1800Hz transient click like a Nokia tactile dome switch
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.025);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // AudioContext fallback
    }
  }

  // ── NOKIA RINGTONE (GRAN VALS MONOPHONIC SYNTH) ─────────────────────────────
  // Iconic 13-note motif: E5, D5, F#4, G#4, C#5, B4, D4, E4, B4, A4, C#4, E4, A4
  private playNote(freq: number, startTime: number, duration: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Retro pulse/square sound with slight low-pass softness
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.09, startTime + 0.015);
    gain.gain.setValueAtTime(0.09, startTime + duration - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  public playNokiaRingtone() {
    if (this.muted || this.isRinging) return;
    this.isRinging = true;

    const nokiaTune: [number, number][] = [
      // [freq Hz, duration in seconds]
      [659.25, 0.16], // E5
      [587.33, 0.16], // D5
      [369.99, 0.32], // F#4
      [415.30, 0.32], // G#4
      [554.37, 0.16], // C#5
      [493.88, 0.16], // B4
      [293.66, 0.32], // D4
      [329.63, 0.32], // E4
      [493.88, 0.16], // B4
      [440.00, 0.16], // A4
      [277.18, 0.32], // C#4
      [329.63, 0.32], // E4
      [440.00, 0.65], // A4 (long)
    ];

    const playSequence = () => {
      if (!this.isRinging || this.muted) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      let t = ctx.currentTime + 0.05;
      for (const [freq, dur] of nokiaTune) {
        if (!this.isRinging) break;
        this.playNote(freq, t, dur);
        t += dur + 0.03;
      }
    };

    playSequence();
    // Repeat phrase every 4 seconds
    this.ringtoneInterval = setInterval(() => {
      if (this.isRinging && !this.muted) {
        playSequence();
      }
    }, 4000);
  }

  public stopNokiaRingtone() {
    this.isRinging = false;
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  // ── CALL CONNECTED CHIME ──────────────────────────────────────────────────
  public playCallConnectedTone() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playNote(784, now, 0.08); // G5
      this.playNote(1046.5, now + 0.09, 0.14); // C6
    } catch {
      // AudioContext fallback
    }
  }

  // ── CALL HANGUP / DISCONNECT TONE ──────────────────────────────────────────
  public playCallEndTone() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playNote(480, now, 0.12);
      this.playNote(380, now + 0.15, 0.18);
    } catch {
      // AudioContext fallback
    }
  }

  // ── ALIASES FOR SPRINT 8A CONVENIENCE ──────────────────────────────────────
  public startRingtone() {
    this.playNokiaRingtone();
  }

  public stopRingtone() {
    this.stopNokiaRingtone();
  }

  public playConnectTone() {
    this.playCallConnectedTone();
  }

  public playHangupTone() {
    this.playCallEndTone();
  }
}

export const audioEngine = new AudioEngine();
