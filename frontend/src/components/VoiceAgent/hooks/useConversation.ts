// Hook: useConversation
// Drives conversation progression, Hindi subtitles, AI speech simulation, and booking dispatch

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PhoneState,
  CallerConfig,
  BookingResult,
  CropOption,
  TimelineEvent,
  TranscriptLine,
} from '../types';
import {
  IVR_SCRIPTS,
  CROP_OPTIONS,
  buildBookingResult,
  generateToken,
  createTimelineEvent,
  createTranscriptLine,
} from '../conversation';

interface UseConversationProps {
  phoneState: PhoneState;
  setPhoneState: (state: PhoneState) => void;
  config: CallerConfig;
  onBookingComplete?: (booking: BookingResult) => void;
}

export function useConversation({
  phoneState,
  setPhoneState,
  config,
  onBookingComplete,
}: UseConversationProps) {
  const [subtitles, setSubtitles] = useState<string>('');
  const [isAISpeaking, setIsAISpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropOption | null>(null);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to add timeline entry
  const pushTimeline = useCallback((event: string, type: TimelineEvent['type']) => {
    setTimeline((prev) => [createTimelineEvent(event, type), ...prev.slice(0, 19)]);
  }, []);

  // Helper to add transcript entry
  const pushTranscript = useCallback((speaker: 'AI' | 'Farmer', text: string) => {
    setTranscript((prev) => [...prev, createTranscriptLine(speaker, text)]);
  }, []);

  // Reset conversation data
  const resetConversation = useCallback(() => {
    setSubtitles('');
    setIsAISpeaking(false);
    setTranscript([]);
    setTimeline([]);
    setBooking(null);
    setSelectedCrop(null);
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
  }, []);

  // ── AUTOMATED STATE PROGRESSION ──────────────────────────────────────────
  useEffect(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    if (phoneState === 'incoming') {
      pushTimeline('Incoming call from MANDIQ AI Assistant', 'system');
      setSubtitles('Incoming call: MANDIQ AI Assistant');
    } else if (phoneState === 'connecting') {
      pushTimeline('Call answered — Connecting to MANDIQ AI', 'system');
      setSubtitles('Connecting...');
      // 1s connecting delay -> speaking
      transitionTimerRef.current = setTimeout(() => {
        setPhoneState('speaking');
      }, 1100);
    } else if (phoneState === 'speaking') {
      pushTimeline('AI Greeting started', 'ai');
      setIsAISpeaking(true);
      setSubtitles(IVR_SCRIPTS.greeting);
      pushTranscript('AI', IVR_SCRIPTS.greeting);

      // After 2.2s -> transition to DTMF main menu
      transitionTimerRef.current = setTimeout(() => {
        setIsAISpeaking(false);
        setPhoneState('dtmf_menu');
      }, 2300);
    } else if (phoneState === 'dtmf_menu') {
      pushTimeline('Presented IVR Main Menu', 'ai');
      setIsAISpeaking(true);
      setSubtitles(IVR_SCRIPTS.mainMenu);
      pushTranscript('AI', IVR_SCRIPTS.mainMenu);

      transitionTimerRef.current = setTimeout(() => {
        setIsAISpeaking(false);
      }, 2000);
    } else if (phoneState === 'crop_menu') {
      pushTimeline('Presented Crop Selection Menu', 'ai');
      setIsAISpeaking(true);
      setSubtitles(IVR_SCRIPTS.cropMenu);
      pushTranscript('AI', IVR_SCRIPTS.cropMenu);

      transitionTimerRef.current = setTimeout(() => {
        setIsAISpeaking(false);
      }, 2000);
    } else if (phoneState === 'processing') {
      pushTimeline('Processing slot reservation...', 'system');
      setIsAISpeaking(false);
      setSubtitles(IVR_SCRIPTS.processing);

      // Simulate reservation allotment (1.4s)
      transitionTimerRef.current = setTimeout(() => {
        const cropName = selectedCrop?.nameEnglish || config.crop || 'Wheat';
        const token = generateToken();
        const result = buildBookingResult(config, cropName, token);
        setBooking(result);
        setPhoneState('confirmation');
      }, 1400);
    } else if (phoneState === 'confirmation') {
      pushTimeline('Slot booking confirmed', 'success');
      setIsAISpeaking(true);
      setSubtitles(IVR_SCRIPTS.confirmation);
      pushTranscript('AI', IVR_SCRIPTS.confirmation);

      // Transition to SMS Sent after 2.0s
      transitionTimerRef.current = setTimeout(() => {
        setIsAISpeaking(false);
        setPhoneState('sms_sent');
      }, 2000);
    } else if (phoneState === 'sms_sent') {
      pushTimeline('SMS confirmation dispatched to farmer', 'sms');
      setSubtitles('SMS sent successfully!');

      if (booking && onBookingComplete) {
        onBookingComplete(booking);
      }

      // Transition to completed state after 2.2s
      transitionTimerRef.current = setTimeout(() => {
        setPhoneState('completed');
      }, 2200);
    } else if (phoneState === 'idle') {
      setSubtitles('');
      setIsAISpeaking(false);
    }

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [phoneState, config, selectedCrop, booking, setPhoneState, pushTimeline, pushTranscript, onBookingComplete]);

  // ── HANDLE DTMF KEY PRESS ────────────────────────────────────────────────
  const handleDTMF = useCallback(
    (key: string) => {
      if (phoneState === 'dtmf_menu') {
        if (key === '1') {
          pushTimeline('Farmer pressed 1 — Slot Booking', 'user');
          pushTranscript('Farmer', '1 (Slot Booking)');
          setPhoneState('crop_menu');
        } else if (key === '2') {
          pushTimeline('Farmer pressed 2 — Status Check', 'user');
          pushTranscript('Farmer', '2 (Status Check)');
          setIsAISpeaking(true);
          setSubtitles(IVR_SCRIPTS.statusResponse);
          pushTranscript('AI', IVR_SCRIPTS.statusResponse);
          setTimeout(() => setIsAISpeaking(false), 2400);
        }
      } else if (phoneState === 'crop_menu') {
        const crop = CROP_OPTIONS.find((c) => c.key === key);
        if (crop) {
          setSelectedCrop(crop);
          pushTimeline(`Farmer pressed ${key} — Selected ${crop.nameEnglish}`, 'user');
          pushTranscript('Farmer', `${key} (${crop.nameHindi})`);
          setPhoneState('processing');
        }
      }
    },
    [phoneState, pushTimeline, pushTranscript, setPhoneState]
  );

  return {
    subtitles,
    isAISpeaking,
    transcript,
    timeline,
    booking,
    selectedCrop,
    handleDTMF,
    resetConversation,
    pushTimeline,
    pushTranscript,
  };
}
