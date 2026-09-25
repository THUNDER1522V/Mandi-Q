// MANDIQ — Call Session State Machine & Lifecycle Hook (Sprint 8A)

import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../components/VoiceAgent/audio/audioEngine';
import { voiceAgentService } from '../services/voiceAgent';
import { ivrEngine } from '../services/ivrEngine';
import type {
  CallState,
  CallerProfile,
  BookingDetails,
  BookingStatusResult,
  ConversationTurn,
} from '../types/voice';

interface UseCallSessionOptions {
  initialCaller?: CallerProfile;
  onBookingComplete?: (booking: BookingDetails) => void;
  onDashboardSync?: () => void;
}

const DEFAULT_CALLER: CallerProfile = {
  id: 'p1',
  name: 'Ramesh Singh',
  phone: '+91 98120 44821',
  village: 'Taraori Mandi',
  district: 'Karnal',
  state: 'Haryana',
  language: 'Hindi',
  crop: 'Wheat',
};

export function useCallSession({
  initialCaller = DEFAULT_CALLER,
  onBookingComplete,
  onDashboardSync,
}: UseCallSessionOptions = {}) {
  // 1. Strict State Flow
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [caller, setCaller] = useState<CallerProfile>(initialCaller);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [statusResult, setStatusResult] = useState<BookingStatusResult | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isVibrating, setIsVibrating] = useState<boolean>(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vibrateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state changes with voiceAgent telemetry
  const transitionTo = useCallback((nextState: CallState) => {
    console.log(`[CallSession] Transition: ${callState} -> ${nextState}`);
    setCallState(nextState);
    voiceAgentService.setCallState(nextState);
  }, [callState]);

  // Sync prompt changes with voiceAgent
  useEffect(() => {
    voiceAgentService.setCurrentPrompt(currentPrompt);
  }, [currentPrompt]);

  // Elapsed call timer
  useEffect(() => {
    const isCallActive =
      callState === 'CONNECTED' ||
      callState === 'GREETING' ||
      callState === 'MAIN_MENU' ||
      callState === 'CROP_MENU' ||
      callState === 'STATUS_CHECK' ||
      callState === 'AI_SPEAKING' ||
      callState === 'PROCESSING' ||
      callState === 'SUCCESS' ||
      callState === 'SMS_SENT';

    if (isCallActive) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setDurationSeconds((s) => {
            const next = s + 1;
            voiceAgentService.setCallTimer(next);
            return next;
          });
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState]);

  // Haptic vibration feedback
  const triggerVibrate = useCallback(() => {
    setIsVibrating(true);
    if (vibrateTimeoutRef.current) clearTimeout(vibrateTimeoutRef.current);
    vibrateTimeoutRef.current = setTimeout(() => {
      setIsVibrating(false);
    }, 280);
  }, []);

  // ── CALL CONTROL LIFECYCLE ───────────────────────────────────────

  // IDLE -> INCOMING_CALL -> RINGING
  const triggerIncomingCall = useCallback(async () => {
    if (callState !== 'IDLE') return;

    transitionTo('INCOMING_CALL');
    triggerVibrate();

    // Query real backend to enrich farmer profile if available
    const enriched = await voiceAgentService.lookupFarmer(caller.phone, caller.name);
    setCaller(enriched);

    // Transition to RINGING
    setTimeout(() => {
      transitionTo('RINGING');
      audioEngine.startRingtone();
      voiceAgentService.addTurn({
        speaker: 'AI',
        message: 'Incoming Call from MANDIQ AI Assistant',
        hindiMessage: 'मंडी-क्यू एआई सहायक से कॉल',
        type: 'system',
      });
      setHistory(voiceAgentService.getHistory());
    }, 400);
  }, [callState, caller.phone, caller.name, transitionTo, triggerVibrate]);

  // RINGING -> CONNECTED -> GREETING -> MAIN_MENU
  const acceptCall = useCallback(() => {
    if (callState !== 'RINGING' && callState !== 'INCOMING_CALL') return;

    audioEngine.stopRingtone();
    audioEngine.playConnectTone();
    transitionTo('CONNECTED');

    voiceAgentService.addTurn({
      speaker: 'USER',
      message: 'Call accepted by farmer',
      hindiMessage: 'कॉल स्वीकार की गई',
      type: 'system',
    });
    setHistory(voiceAgentService.getHistory());

    // Advance to GREETING
    setTimeout(() => {
      transitionTo('GREETING');
      const greetingText = 'Namaskar! Mandi-Q mein aapka swagat hai.';
      setCurrentPrompt(greetingText);

      voiceAgentService.addTurn({
        speaker: 'AI',
        message: greetingText,
        hindiMessage: 'नमस्कार! मंडी-क्यू में आपका स्वागत है।',
        type: 'speech',
      });
      setHistory(voiceAgentService.getHistory());

      // Advance to MAIN_MENU after greeting
      setTimeout(() => {
        transitionTo('MAIN_MENU');
        ivrEngine.setMenu('main');
        const menuPrompt =
          'Slot booking ke liye 1 dabaiye. Booking status ke liye 2 dabaiye. Voice booking ke liye 3 dabaiye.';
        setCurrentPrompt(menuPrompt);

        voiceAgentService.addTurn({
          speaker: 'AI',
          message: menuPrompt,
          hindiMessage: 'स्लॉट बुकिंग के लिए 1, स्थिति के लिए 2 दबाएँ।',
          type: 'speech',
        });
        setHistory(voiceAgentService.getHistory());
      }, 2200);
    }, 800);
  }, [callState, transitionTo]);

  // Red button: Any state -> CALL_ENDED -> IDLE
  const endCall = useCallback(() => {
    audioEngine.stopRingtone();
    audioEngine.playHangupTone();
    transitionTo('CALL_ENDED');

    voiceAgentService.addTurn({
      speaker: 'USER',
      message: 'Call terminated',
      hindiMessage: 'कॉल समाप्त',
      type: 'system',
    });
    setHistory(voiceAgentService.getHistory());

    setTimeout(() => {
      transitionTo('IDLE');
      setDurationSeconds(0);
      setCurrentPrompt('');
      ivrEngine.reset();
    }, 1400);
  }, [transitionTo]);

  // Reject call when ringing
  const rejectCall = useCallback(() => {
    audioEngine.stopRingtone();
    audioEngine.playHangupTone();
    transitionTo('IDLE');
    setDurationSeconds(0);
    setCurrentPrompt('');
    ivrEngine.reset();
  }, [transitionTo]);

  // ── WORKFLOW: SLOT BOOKING FLOW ─────────────────────────────────

  // Crop Menu navigation
  const openCropMenu = useCallback(() => {
    voiceAgentService.addTurn({
      speaker: 'USER',
      message: 'Key 1 pressed (Slot Booking)',
      hindiMessage: 'कुंजी 1 (स्लॉट बुकिंग)',
      type: 'dtmf',
    });
    transitionTo('CROP_MENU');
    ivrEngine.setMenu('crop_select');
    const prompt = 'Fasal chuniye: 1 Gehu, 2 Dhaan, 3 Jowar, 4 Makka.';
    setCurrentPrompt(prompt);

    voiceAgentService.addTurn({
      speaker: 'AI',
      message: prompt,
      hindiMessage: 'फसल चुनिए: 1 गेहूँ, 2 धान, 3 ज्वार, 4 मक्का।',
      type: 'speech',
    });
    setHistory(voiceAgentService.getHistory());
  }, [transitionTo]);

  // Execute Booking: PROCESSING -> SUCCESS -> SMS_SENT -> CALL_ENDED
  const executeBooking = useCallback(
    async (cropName: string) => {
      transitionTo('PROCESSING');
      const procPrompt = `Aapka slot allocate ho raha hai (${cropName})...`;
      setCurrentPrompt(procPrompt);

      voiceAgentService.addTurn({
        speaker: 'USER',
        message: `Selected crop: ${cropName}`,
        hindiMessage: `चुनी गई फसल: ${cropName}`,
        type: 'dtmf',
      });
      setHistory(voiceAgentService.getHistory());

      try {
        // Real Backend Call to allocate token and booking details
        const { bookingEngine } = await import('../services/bookingEngine');
        const { notificationService } = await import('../services/notificationService');
        
        const confirmedBooking = await bookingEngine.confirmBooking(caller, cropName);
        setBooking(confirmedBooking);

        setTimeout(() => {
          transitionTo('SUCCESS');
          const successPrompt = `Aapka slot safalta purvak book ho gaya hai. Token number: ${confirmedBooking.token}.`;
          setCurrentPrompt(successPrompt);

          voiceAgentService.addTurn({
            speaker: 'AI',
            message: successPrompt,
            hindiMessage: `आपका स्लॉट सफलता पूर्वक बुक हो गया है। टोकन: ${confirmedBooking.token}`,
            type: 'speech',
          });
          setHistory(voiceAgentService.getHistory());

          if (onBookingComplete) {
            onBookingComplete(confirmedBooking);
          }

          // Advance to SMS_SENT
          setTimeout(() => {
            transitionTo('SMS_SENT');
            const smsPrompt = 'SMS Gate Pass aapke mobile par bhej diya gaya hai.';
            setCurrentPrompt(smsPrompt);

            voiceAgentService.addTurn({
              speaker: 'AI',
              message: smsPrompt,
              hindiMessage: 'एसएमएस गेट पास भेजा गया।',
              type: 'system',
            });
            setHistory(voiceAgentService.getHistory());
            
            // Trigger Mock SMS Notification
            notificationService.sendMockSMS({
              phone: caller.phone,
              farmerName: caller.name,
              token: confirmedBooking.token,
              crop: cropName,
              date: confirmedBooking.date,
              time: confirmedBooking.slotTime,
              gate: confirmedBooking.gate,
            });

            if (onDashboardSync) {
              onDashboardSync();
            }

            // Auto-advance: SMS_SENT -> CALL_ENDED -> IDLE (Full state flow completed)
            setTimeout(() => {
              if (voiceAgentService.getTelemetry().callState === 'SMS_SENT') {
                transitionTo('CALL_ENDED');
                audioEngine.playHangupTone();
                const endPrompt = 'Dhanyavaad. Aapka slot safalta purvak book ho gaya hai. Kripya diye gaye samay par mandi pahunche. Shubh din.';
                setCurrentPrompt(endPrompt);

                voiceAgentService.addTurn({
                  speaker: 'AI',
                  message: endPrompt,
                  hindiMessage: 'धन्यवाद। आपका स्लॉट सफलता पूर्वक बुक हो गया है। कृपया दिए गए समय पर मंडी पहुँचें। शुभ दिन।',
                  type: 'system',
                });
                setHistory(voiceAgentService.getHistory());

                setTimeout(() => {
                  transitionTo('IDLE');
                  setDurationSeconds(0);
                  setCurrentPrompt('');
                  ivrEngine.reset();
                }, 4000); // give enough time to read the end prompt
              }
            }, 3000);
          }, 1800);
        }, 3200); // Increased slightly for the animation
      } catch (err) {
        console.error('[CallSession] Booking processing error:', err);
        handleError();
      }
    },
    [caller, transitionTo, onBookingComplete, onDashboardSync]
  );

  // Status Check Workflow
  const executeStatusCheck = useCallback(async () => {
    voiceAgentService.addTurn({
      speaker: 'USER',
      message: 'Key 2 pressed (Booking Status)',
      hindiMessage: 'कुंजी 2 (बुकिंग स्थिति)',
      type: 'dtmf',
    });
    transitionTo('PROCESSING');
    setCurrentPrompt('Booking status jaanch ki ja rahi hai...');
    setHistory(voiceAgentService.getHistory());

    try {
      const result = await voiceAgentService.checkBookingStatus(caller.phone);
      setStatusResult(result);

      setTimeout(() => {
        transitionTo('STATUS_CHECK');
        ivrEngine.setMenu('status_check');
        setCurrentPrompt(result.message);

        voiceAgentService.addTurn({
          speaker: 'AI',
          message: result.message,
          type: 'speech',
        });
        setHistory(voiceAgentService.getHistory());
      }, 1000);
    } catch {
      handleError();
    }
  }, [caller.phone, transitionTo]);

  // AI Voice Conversational Booking Workflow
  const executeAIVoiceMode = useCallback(() => {
    voiceAgentService.addTurn({
      speaker: 'USER',
      message: 'Key 3 pressed (Speak to AI)',
      hindiMessage: 'कुंजी 3 (एआई से बात करें)',
      type: 'dtmf',
    });
    transitionTo('AI_SPEAKING');
    ivrEngine.setMenu('ai_speak');
    const prompt = 'Namaskar! Aap kis fasal ke liye slot chahte hain? 1 dabayein ya bolen.';
    setCurrentPrompt(prompt);

    voiceAgentService.addTurn({
      speaker: 'AI',
      message: prompt,
      type: 'speech',
    });
    setHistory(voiceAgentService.getHistory());
  }, [transitionTo]);

  // Error recovery handler: "Kripya dobara prayas kijiye."
  const handleError = useCallback(() => {
    transitionTo('ERROR');
    ivrEngine.setMenu('error');
    const errPrompt = 'Kripya dobara prayas kijiye.';
    setCurrentPrompt(errPrompt);

    voiceAgentService.addTurn({
      speaker: 'AI',
      message: errPrompt,
      hindiMessage: 'कृपया दोबारा प्रयास कीजिए।',
      type: 'speech',
    });
    setHistory(voiceAgentService.getHistory());

    // Gracefully recover back to MAIN_MENU after 2s so phone never freezes
    setTimeout(() => {
      transitionTo('MAIN_MENU');
      ivrEngine.setMenu('main');
      setCurrentPrompt(
        'Slot booking ke liye 1 dabaiye. Booking status ke liye 2 dabaiye.'
      );
    }, 2200);
  }, [transitionTo]);

  // Full Reset to idle
  const resetSession = useCallback(() => {
    audioEngine.stopRingtone();
    transitionTo('IDLE');
    setDurationSeconds(0);
    setCurrentPrompt('');
    setBooking(null);
    setStatusResult(null);
    voiceAgentService.clearHistory();
    setHistory([]);
    ivrEngine.reset();
  }, [transitionTo]);

  // Manually add conversation turn and sync state
  const addTurn = useCallback((turn: Omit<ConversationTurn, 'id' | 'timestamp'>) => {
    voiceAgentService.addTurn(turn);
    setHistory(voiceAgentService.getHistory());
  }, []);

  return {
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
  };
}
