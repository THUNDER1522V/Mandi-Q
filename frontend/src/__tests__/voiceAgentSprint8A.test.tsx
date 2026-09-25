// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useCallSession } from '../hooks/useCallSession';
import { useIVR } from '../hooks/useIVR';
import { useSpeech } from '../hooks/useSpeech';
import { voiceAgentService } from '../services/voiceAgent';
import { ivrEngine } from '../services/ivrEngine';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MANDIQ Sprint 8A — Voice Agent Engine & Backend Integration', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    voiceAgentService.clearHistory();
    ivrEngine.reset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
    vi.restoreAllMocks();
  });

  describe('1. Call Lifecycle State Machine (useCallSession)', () => {
    it('enforces strict state transitions: IDLE -> INCOMING_CALL -> RINGING -> CONNECTED -> GREETING -> MAIN_MENU', async () => {
      let sessionHook: ReturnType<typeof useCallSession> | null = null;

      function TestHarness() {
        sessionHook = useCallSession();
        return <div>{sessionHook.callState}</div>;
      }

      await act(async () => {
        root!.render(<TestHarness />);
      });

      expect(sessionHook!.callState).toBe('IDLE');

      // 1. Trigger incoming call
      await act(async () => {
        await sessionHook!.triggerIncomingCall();
      });
      expect(sessionHook!.callState).toBe('INCOMING_CALL');

      // Transition to RINGING after 400ms
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(sessionHook!.callState).toBe('RINGING');

      // 2. Accept call (Green button)
      act(() => {
        sessionHook!.acceptCall();
      });
      expect(sessionHook!.callState).toBe('CONNECTED');

      // Transition to GREETING
      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(sessionHook!.callState).toBe('GREETING');
      expect(sessionHook!.currentPrompt).toContain('Namaskar');

      // Transition to MAIN_MENU
      act(() => {
        vi.advanceTimersByTime(2300);
      });
      expect(sessionHook!.callState).toBe('MAIN_MENU');
      expect(sessionHook!.currentPrompt).toContain('Slot booking');
    });

    it('navigates through slot booking: MAIN_MENU -> CROP_MENU -> PROCESSING -> SUCCESS -> SMS_SENT', async () => {
      const onBookingComplete = vi.fn();
      const onDashboardSync = vi.fn();
      let sessionHook: ReturnType<typeof useCallSession> | null = null;

      function TestHarness() {
        sessionHook = useCallSession({ onBookingComplete, onDashboardSync });
        return <div>{sessionHook.callState}</div>;
      }

      await act(async () => {
        root!.render(<TestHarness />);
      });

      // Advance to MAIN_MENU
      await act(async () => {
        await sessionHook!.triggerIncomingCall();
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      act(() => {
        sessionHook!.acceptCall();
      });
      act(() => {
        vi.advanceTimersByTime(3300);
      });
      expect(sessionHook!.callState).toBe('MAIN_MENU');

      // Open Crop Menu
      act(() => {
        sessionHook!.openCropMenu();
      });
      expect(sessionHook!.callState).toBe('CROP_MENU');
      expect(sessionHook!.currentPrompt).toContain('Fasal chuniye');

      // Execute Booking for Wheat
      await act(async () => {
        await sessionHook!.executeBooking('Wheat');
      });
      expect(sessionHook!.callState).toBe('PROCESSING');

      // Transition to SUCCESS
      act(() => {
        vi.advanceTimersByTime(1300);
      });
      expect(sessionHook!.callState).toBe('SUCCESS');
      expect(sessionHook!.booking).not.toBeNull();
      expect(sessionHook!.booking?.crop).toBe('Wheat');
      expect(sessionHook!.booking?.token).toMatch(/^TK-\d{3}$/);
      expect(onBookingComplete).toHaveBeenCalledWith(sessionHook!.booking);

      // Transition to SMS_SENT and trigger live dashboard sync
      act(() => {
        vi.advanceTimersByTime(1900);
      });
      expect(sessionHook!.callState).toBe('SMS_SENT');
      expect(onDashboardSync).toHaveBeenCalled();

      // Completes strict state flow: SMS_SENT -> CALL_ENDED -> IDLE
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(sessionHook!.callState).toBe('CALL_ENDED');

      act(() => {
        vi.advanceTimersByTime(2100);
      });
      expect(sessionHook!.callState).toBe('IDLE');
    });

    it('ends call gracefully with Red button: Any state -> CALL_ENDED -> IDLE', async () => {
      let sessionHook: ReturnType<typeof useCallSession> | null = null;

      function TestHarness() {
        sessionHook = useCallSession();
        return <div>{sessionHook.callState}</div>;
      }

      await act(async () => {
        root!.render(<TestHarness />);
      });

      await act(async () => {
        await sessionHook!.triggerIncomingCall();
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      act(() => {
        sessionHook!.acceptCall();
      });
      act(() => {
        vi.advanceTimersByTime(3300);
      });
      expect(sessionHook!.callState).toBe('MAIN_MENU');

      // Click Red button
      act(() => {
        sessionHook!.endCall();
      });
      expect(sessionHook!.callState).toBe('CALL_ENDED');

      // Reset to IDLE
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(sessionHook!.callState).toBe('IDLE');
      expect(sessionHook!.durationSeconds).toBe(0);
    });
  });

  describe('2. Keypad & D-Pad Navigation (useIVR)', () => {
    it('handles numeric DTMF keys and dispatches actions', async () => {
      const onDTMFAction = vi.fn();
      let ivrHook: ReturnType<typeof useIVR> | null = null;

      function TestHarness() {
        ivrHook = useIVR({ onDTMFAction });
        return <div>{ivrHook.activeKey}</div>;
      }

      await act(async () => {
        root!.render(<TestHarness />);
      });

      act(() => {
        ivrHook!.handleKeyPress('1');
      });

      expect(onDTMFAction).toHaveBeenCalledWith('1', expect.objectContaining({ key: '1' }));
      expect(ivrHook!.activeKey).toBe('1');

      act(() => {
        vi.advanceTimersByTime(180);
      });
      expect(ivrHook!.activeKey).toBeNull();
    });

    it('supports D-pad UP/DOWN arrow navigation and Center button confirmation', async () => {
      const onConfirmAction = vi.fn();
      let ivrHook: ReturnType<typeof useIVR> | null = null;

      function TestHarness() {
        ivrHook = useIVR({ onConfirmAction });
        return <div>{ivrHook.cursorIndex}</div>;
      }

      await act(async () => {
        root!.render(<TestHarness />);
      });

      expect(ivrHook!.cursorIndex).toBe(0);

      // Navigate Down
      act(() => {
        ivrHook!.handleKeyPress('DOWN');
      });
      expect(ivrHook!.cursorIndex).toBe(1);

      // Navigate Down again
      act(() => {
        ivrHook!.handleKeyPress('DOWN');
      });
      expect(ivrHook!.cursorIndex).toBe(2);

      // Navigate Up
      act(() => {
        ivrHook!.handleKeyPress('UP');
      });
      expect(ivrHook!.cursorIndex).toBe(1);

      // Confirm with Center button
      act(() => {
        ivrHook!.handleKeyPress('CENTER');
      });
      expect(onConfirmAction).toHaveBeenCalledWith(
        expect.objectContaining({ label: expect.stringMatching(/status/i) })
      );
    });

    it('handles # key as telephony hangup', async () => {
      const onEndCall = vi.fn();
      let ivrHook: ReturnType<typeof useIVR> | null = null;

      function TestHarness() {
        ivrHook = useIVR({ onEndCall });
        return <div>IVR</div>;
      }

      await act(async () => {
        root!.render(<TestHarness />);
      });

      act(() => {
        ivrHook!.handleKeyPress('#');
      });

      expect(onEndCall).toHaveBeenCalled();
    });
  });

  describe('3. Subtitle Engine (useSpeech)', () => {
    it('progressively typewrites speech subtitles and tracks speaking state', async () => {
      const onComplete = vi.fn();
      let speechHook: ReturnType<typeof useSpeech> | null = null;

      function TestHarness() {
        speechHook = useSpeech({ typingSpeedMs: 20 });
        return <div>{speechHook.subtitles}</div>;
      }

      await act(async () => {
        root!.render(<TestHarness />);
      });

      act(() => {
        speechHook!.speak('Namaskar!', onComplete);
      });

      expect(speechHook!.isSpeaking).toBe(true);

      // Advance timers partially
      act(() => {
        vi.advanceTimersByTime(60);
      });
      expect(speechHook!.subtitles.length).toBeGreaterThan(0);

      // Complete typewriter
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(speechHook!.subtitles).toBe('Namaskar!');
      expect(speechHook!.isSpeaking).toBe(false);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('4. Error Handling & Recovery', () => {
    it('transitions to ERROR state, speaks "Kripya dobara prayas kijiye", and recovers to MAIN_MENU', async () => {
      let sessionHook: ReturnType<typeof useCallSession> | null = null;

      function TestHarness() {
        sessionHook = useCallSession();
        return <div>{sessionHook.callState}</div>;
      }

      await act(async () => {
        root!.render(<TestHarness />);
      });

      act(() => {
        sessionHook!.handleError();
      });

      expect(sessionHook!.callState).toBe('ERROR');
      expect(sessionHook!.currentPrompt).toBe('Kripya dobara prayas kijiye.');

      // Auto-recovers after 2.2s so phone never freezes
      act(() => {
        vi.advanceTimersByTime(2300);
      });
      expect(sessionHook!.callState).toBe('MAIN_MENU');
    });
  });

  describe('5. VoiceAgentService & Backend Integration', () => {
    it('maintains a persistent conversation turn history across calls', () => {
      voiceAgentService.clearHistory();

      voiceAgentService.addTurn({
        speaker: 'AI',
        message: 'Namaskar! Mandi-Q mein aapka swagat hai.',
      });

      voiceAgentService.addTurn({
        speaker: 'USER',
        message: 'Key 1 pressed (Slot Booking)',
      });

      const history = voiceAgentService.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].speaker).toBe('AI');
      expect(history[1].speaker).toBe('USER');
    });

    it('generates authentic APMC booking details with token and SMS text', async () => {
      const booking = await voiceAgentService.confirmBooking(
        {
          id: 'test-p1',
          name: 'Harpreet Singh',
          phone: '+919812044821',
          village: 'Karnal',
          language: 'Hindi',
          crop: 'Paddy',
        },
        'Paddy'
      );

      expect(booking.crop).toBe('Paddy');
      expect(booking.token).toMatch(/^TK-\d{3}$/);
      expect(booking.name).toBe('Harpreet Singh');
      expect(booking.smsText).toContain('MANDIQ APMC: Slot confirmed!');
      expect(booking.smsText).toContain(booking.token);
    });

    it('records strictly alternating turn sequence AI -> USER -> AI -> USER throughout session', () => {
      voiceAgentService.clearHistory();

      voiceAgentService.addTurn({ speaker: 'AI', message: 'Incoming Call from MANDIQ AI Assistant', type: 'system' });
      voiceAgentService.addTurn({ speaker: 'USER', message: 'Call accepted by farmer', type: 'system' });
      voiceAgentService.addTurn({ speaker: 'AI', message: 'Namaskar! Mandi-Q mein aapka swagat hai.', type: 'speech' });
      voiceAgentService.addTurn({ speaker: 'USER', message: 'Key 1 pressed (Slot Booking)', type: 'dtmf' });
      voiceAgentService.addTurn({ speaker: 'AI', message: 'Fasal chuniye: 1 Gehu, 2 Dhaan, 3 Jowar, 4 Makka.', type: 'speech' });
      voiceAgentService.addTurn({ speaker: 'USER', message: 'Selected crop: Wheat', type: 'dtmf' });
      voiceAgentService.addTurn({ speaker: 'AI', message: 'Aapka slot book ho gaya hai. Token number: TK-105.', type: 'speech' });

      const turns = voiceAgentService.getHistory();
      expect(turns.length).toBe(7);
      expect(turns.map((t) => t.speaker)).toEqual(['AI', 'USER', 'AI', 'USER', 'AI', 'USER', 'AI']);
    });
  });
});
