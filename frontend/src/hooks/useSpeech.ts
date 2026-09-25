// MANDIQ — Subtitle & Speech Engine Hook (Sprint 8A)

import { useState, useEffect, useRef, useCallback } from 'react';
import { voiceAgentService } from '../services/voiceAgent';

interface UseSpeechOptions {
  typingSpeedMs?: number;
}

export function useSpeech({ typingSpeedMs = 28 }: UseSpeechOptions = {}) {
  const [subtitles, setSubtitles] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [waveformBars, setWaveformBars] = useState<number[]>([40, 65, 85, 55, 95, 45, 75]);

  // Synchronize state with VoiceAgentService
  useEffect(() => {
    voiceAgentService.setSubtitles(subtitles);
  }, [subtitles]);

  useEffect(() => {
    voiceAgentService.setWaveformBars(waveformBars);
  }, [waveformBars]);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveformTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetTextRef = useRef<string>('');
  const currentIndexRef = useRef<number>(0);
  const onCompleteRef = useRef<(() => void) | null>(null);

  // Animate dynamic waveform bars while speaking
  useEffect(() => {
    if (isSpeaking) {
      waveformTimerRef.current = setInterval(() => {
        setWaveformBars([
          20 + Math.floor(Math.random() * 80),
          30 + Math.floor(Math.random() * 70),
          40 + Math.floor(Math.random() * 60),
          25 + Math.floor(Math.random() * 75),
          35 + Math.floor(Math.random() * 65),
          20 + Math.floor(Math.random() * 80),
          30 + Math.floor(Math.random() * 70),
        ]);
      }, 100);
    } else {
      if (waveformTimerRef.current) {
        clearInterval(waveformTimerRef.current);
        waveformTimerRef.current = null;
      }
      setWaveformBars([20, 20, 20, 20, 20, 20, 20]);
    }

    return () => {
      if (waveformTimerRef.current) {
        clearInterval(waveformTimerRef.current);
      }
    };
  }, [isSpeaking]);

  // Progressive typewriter for IVR subtitles
  const stepTypewriter = useCallback(() => {
    const target = targetTextRef.current;
    const currentIdx = currentIndexRef.current;

    if (currentIdx < target.length) {
      const nextIdx = Math.min(target.length, currentIdx + 2);
      currentIndexRef.current = nextIdx;
      setSubtitles(target.slice(0, nextIdx));

      typingTimerRef.current = setTimeout(stepTypewriter, typingSpeedMs);
    } else {
      // Completed typing
      setIsSpeaking(false);
      if (onCompleteRef.current) {
        const cb = onCompleteRef.current;
        onCompleteRef.current = null;
        cb();
      }
    }
  }, [typingSpeedMs]);

  // Trigger speech with subtitles
  const speak = useCallback(
    (text: string, onComplete?: () => void) => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }

      targetTextRef.current = text;
      currentIndexRef.current = 0;
      setSubtitles('');
      setIsSpeaking(true);
      onCompleteRef.current = onComplete || null;

      typingTimerRef.current = setTimeout(stepTypewriter, 50);
    },
    [stepTypewriter]
  );

  const stopSpeech = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsSpeaking(false);
    onCompleteRef.current = null;
  }, []);

  const clearSubtitles = useCallback(() => {
    stopSpeech();
    setSubtitles('');
  }, [stopSpeech]);

  return {
    subtitles,
    isSpeaking,
    waveformBars,
    speak,
    stopSpeech,
    clearSubtitles,
  };
}
