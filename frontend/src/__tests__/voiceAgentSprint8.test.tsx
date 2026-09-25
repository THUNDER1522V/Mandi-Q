import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  VoiceAgentPage,
  audioEngine,
  CROP_OPTIONS,
  DEMO_PERSONAS,
  generateToken,
  buildBookingResult,
  simulateAIResponse,
} from '../components/VoiceAgent';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Sprint 8 — AI Voice Calling Agent (Nokia Simulator)', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  describe('Audio Engine & DTMF Synthesizer', () => {
    it('initializes safely in test environment without throwing', () => {
      expect(() => audioEngine.playDTMF('1')).not.toThrow();
      expect(() => audioEngine.playKeyClick()).not.toThrow();
      expect(() => audioEngine.playNokiaRingtone()).not.toThrow();
      expect(() => audioEngine.stopNokiaRingtone()).not.toThrow();
      expect(() => audioEngine.playCallConnectedTone()).not.toThrow();
      expect(() => audioEngine.playCallEndTone()).not.toThrow();
    });

    it('manages master mute state correctly', () => {
      audioEngine.setMuted(true);
      expect(audioEngine.isAudioMuted()).toBe(true);

      audioEngine.setMuted(false);
      expect(audioEngine.isAudioMuted()).toBe(false);
    });
  });

  describe('Central Conversation Engine', () => {
    it('exports required crops: Gehu, Dhaan, Jowar, Makka and personas', () => {
      const keys = CROP_OPTIONS.map((c) => c.key);
      expect(keys).toEqual(['1', '2', '3', '4']);

      const names = CROP_OPTIONS.map((c) => c.nameEnglish);
      expect(names).toContain('Wheat');
      expect(names).toContain('Paddy');
      expect(names).toContain('Jowar');
      expect(names).toContain('Maize');

      expect(DEMO_PERSONAS.length).toBeGreaterThanOrEqual(3);
    });

    it('generates valid tokens in TK-XXX format', () => {
      const token = generateToken();
      expect(token).toMatch(/^TK-\d{3}$/);
    });

    it('builds comprehensive booking results with APMC gate and SMS text', () => {
      const config = {
        name: 'Ramesh Singh',
        phone: '9812034501',
        language: 'Hindi' as const,
        crop: 'Wheat' as const,
        provider: 'Sarvam AI' as const,
      };
      const result = buildBookingResult(config, 'Wheat', 'TK-250');
      expect(result.token).toBe('TK-250');
      expect(result.crop).toBe('Wheat');
      expect(result.apmcGate).toContain('Gate 1');
      expect(result.smsText).toContain('Token: TK-250');
      expect(result.smsText).toContain('Wheat');
    });

    it('simulateAIResponse returns dialogue for Sarvam AI extension point', async () => {
      const resp = await simulateAIResponse('greeting');
      expect(resp.text).toContain('Mandi-Q');
      expect(resp.delayMs).toBeGreaterThan(0);
    });
  });

  describe('VoiceAgentPage UI & Phone Interaction', () => {
    it('renders the Nokia 3310 phone shell and control center', async () => {
      const root = createRoot(container!);

      await act(async () => {
        root.render(<VoiceAgentPage />);
      });

      expect(container!.textContent).toContain('MANDIQ 3310');
      expect(container!.textContent).toContain('Voice Agent Simulator');
      expect(container!.textContent).toContain('Simulate Incoming Call');

      await act(async () => {
        root.unmount();
      });
    });

    it('displays the 12-key tactile physical keypad', async () => {
      const root = createRoot(container!);

      await act(async () => {
        root.render(<VoiceAgentPage />);
      });

      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
      keys.forEach((digit) => {
        const btn = container!.querySelector(`button[aria-label*="Key ${digit === '*' ? '\\*' : digit}"]`);
        expect(btn).not.toBeNull();
      });

      await act(async () => {
        root.unmount();
      });
    });

    it('auto-triggers or responds to simulated incoming call', async () => {
      const root = createRoot(container!);

      await act(async () => {
        root.render(<VoiceAgentPage />);
      });

      // Advance timer by 1300ms for incoming call trigger
      await act(async () => {
        vi.advanceTimersByTime(1300);
      });

      expect(container!.textContent).toContain('INCOMING CALL');
      expect(container!.textContent).toContain('MANDIQ AI Assistant');
      expect(container!.textContent).toContain('PRESS GREEN TO ANSWER');

      await act(async () => {
        root.unmount();
      });
    });

    it('pressing green button answers incoming call and transitions to connecting', async () => {
      const root = createRoot(container!);

      await act(async () => {
        root.render(<VoiceAgentPage />);
      });

      await act(async () => {
        vi.advanceTimersByTime(1300);
      });

      const acceptBtn = container!.querySelector('button[aria-label="Accept / Call"]');
      expect(acceptBtn).not.toBeNull();

      await act(async () => {
        (acceptBtn as HTMLButtonElement).click();
      });

      expect(container!.textContent).toContain('CALLING');
      expect(container!.textContent).toContain('Connecting line...');

      await act(async () => {
        root.unmount();
      });
    });

    it('allows changing demo personas', async () => {
      const root = createRoot(container!);

      await act(async () => {
        root.render(<VoiceAgentPage />);
      });

      const harpreetBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Harpreet Singh')
      );
      expect(harpreetBtn).toBeDefined();

      await act(async () => {
        harpreetBtn!.click();
      });

      expect(container!.textContent).toContain('Selected persona: Harpreet Singh (Paddy)');

      await act(async () => {
        root.unmount();
      });
    });

    it('toggles audio mute button', async () => {
      const root = createRoot(container!);

      await act(async () => {
        root.render(<VoiceAgentPage />);
      });

      const audioBtn = container!.querySelector('button[title*="Mute Sound Effects"]');
      expect(audioBtn).not.toBeNull();

      await act(async () => {
        (audioBtn as HTMLButtonElement).click();
      });

      expect(container!.textContent).toContain('Audio Muted');

      await act(async () => {
        root.unmount();
      });
    });
  });
});
