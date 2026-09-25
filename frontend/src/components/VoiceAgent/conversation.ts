// MANDIQ Voice Agent — Central Conversation Engine
// All IVR scripts, mock AI responses, and dialog trees originate here.
// In Sprint 9, replace simulateAIResponse() with Sarvam AI / Bhashini streaming API.

import type {
  CallerConfig,
  BookingResult,
  CropOption,
  Persona,
  TimelineEvent,
  TranscriptLine,
} from './types';

// ── IVR PROMPT SCRIPTS (HINDI & ROMANIZED HINDI) ─────────────────────────────
export const IVR_SCRIPTS = {
  greeting: 'Namaskar! Mandi-Q Voice Assistant mein aapka swagat hai.',
  mainMenu: 'Slot booking ke liye 1 dabaiye. Booking status ke liye 2 dabaiye.',
  cropMenu: 'Fasal chuniye: 1 Gehu, 2 Dhaan, 3 Jowar, 4 Makka.',
  processing: 'Aapka slot allocate kiya ja raha hai...',
  confirmation: 'Aapka slot book ho gaya. SMS safalta se bhej diya gaya hai.',
  statusResponse: 'Aapka Token TK-318 active hai. Karnal APMC Gate 1, Kal subah 10 baje.',
};

// ── CROPS LIST ───────────────────────────────────────────────────────────────
export const CROP_OPTIONS: CropOption[] = [
  { key: '1', code: 'Wheat', nameHindi: 'गेहूं (Gehu)', nameEnglish: 'Wheat' },
  { key: '2', code: 'Paddy', nameHindi: 'धान (Dhaan)', nameEnglish: 'Paddy' },
  { key: '3', code: 'Jowar', nameHindi: 'ज्वार (Jowar)', nameEnglish: 'Jowar' },
  { key: '4', code: 'Maize', nameHindi: 'मक्का (Makka)', nameEnglish: 'Maize' },
];

// ── DEMO PERSONAS ────────────────────────────────────────────────────────────
export const DEMO_PERSONAS: Persona[] = [
  { id: 'p1', name: 'Ramesh Singh', language: 'Hindi', phone: '9812034501', crop: 'Wheat', village: 'Nilokheri' },
  { id: 'p2', name: 'Harpreet Singh', language: 'Punjabi', phone: '9815067823', crop: 'Paddy', village: 'Taraori' },
  { id: 'p3', name: 'Birju Yadav', language: 'Hindi', phone: '9897045612', crop: 'Jowar', village: 'Gharaunda' },
];

export const DEFAULT_CONFIG: CallerConfig = {
  name: 'Ramesh Singh',
  phone: '9812034501',
  language: 'Hindi',
  crop: 'Wheat',
  provider: 'Sarvam AI',
};

// ── TOKEN GENERATOR ──────────────────────────────────────────────────────────
export function generateToken(): string {
  const num = 200 + Math.floor(Math.random() * 800);
  return `TK-${num}`;
}

// ── BOOKING RESULT BUILDER ───────────────────────────────────────────────────
export function buildBookingResult(config: CallerConfig, cropName: string, token: string): BookingResult {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const slotTime = '10:00 AM – 12:00 PM';
  const gate = 'Gate 1 (North Entry)';

  return {
    token,
    slotTime,
    date: dateStr,
    crop: cropName,
    name: config.name,
    phone: config.phone,
    apmcGate: gate,
    smsText: `MANDIQ APMC: Slot confirmed! Token: ${token} | Crop: ${cropName} | Date: ${dateStr} ${slotTime} | Entry: ${gate}. Please carry your Gate Pass QR. -MandiQ`,
  };
}

// ── TIMELINE EVENT FACTORY ───────────────────────────────────────────────────
export function createTimelineEvent(event: string, type: TimelineEvent['type']): TimelineEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
    event,
    type,
  };
}

// ── TRANSCRIPT ENTRY FACTORY ─────────────────────────────────────────────────
export function createTranscriptLine(speaker: 'AI' | 'Farmer', text: string): TranscriptLine {
  return {
    id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    speaker,
    text,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
  };
}

// ── EXTENSION POINT FOR SARVAM AI / BHASHINI (SPRINT 9) ──────────────────────
// Currently returns local mock dialogue. In the next sprint, this single function
// will connect to `https://api.sarvam.ai/v1/voice` or `bhashini.gov.in/ulca/apis`.
export async function simulateAIResponse(
  intent: 'greeting' | 'main_menu' | 'crop_menu' | 'select_crop' | 'status_check' | 'confirm_booking',
  payload?: { key?: string; config?: CallerConfig; token?: string }
): Promise<{ text: string; audioUrl?: string; delayMs: number }> {
  // Simulate natural network + STT/TTS roundtrip latency (220ms - 400ms)
  const simulatedLatency = 240;

  switch (intent) {
    case 'greeting':
      return { text: IVR_SCRIPTS.greeting, delayMs: simulatedLatency };
    case 'main_menu':
      return { text: IVR_SCRIPTS.mainMenu, delayMs: simulatedLatency };
    case 'crop_menu':
      return { text: IVR_SCRIPTS.cropMenu, delayMs: simulatedLatency };
    case 'select_crop': {
      const selectedCrop = CROP_OPTIONS.find((c) => c.key === payload?.key)?.nameEnglish || 'Wheat';
      return {
        text: `${selectedCrop} chuna gaya hai. Slot allocate kiya ja raha hai...`,
        delayMs: simulatedLatency,
      };
    }
    case 'status_check':
      return { text: IVR_SCRIPTS.statusResponse, delayMs: simulatedLatency };
    case 'confirm_booking':
      return { text: IVR_SCRIPTS.confirmation, delayMs: simulatedLatency };
    default:
      return { text: 'Kripya vikalp chuniye.', delayMs: simulatedLatency };
  }
}
