// Voice Agent — Simulation Engine
// All conversations and events are simulated via local state.
// Replace simulate* functions with real API calls to Sarvam AI / Bhashini / Fast2SMS later.

import type {
  PhoneState,
  TranscriptLine,
  TimelineEvent,
  BookingResult,
  CallerConfig,
} from './types';

// ── IVR Script (Hindi) ───────────────────────────────────────────────────────
export const IVR_SCRIPTS: Partial<Record<PhoneState, string[]>> = {
  idle: [],
  calling: [],
  connected: [
    'Namaskar. MANDIQ mein aapka swagat hai.',
    'Main MANDIQ Voice Assistant bol rahi hoon.',
    'Aapka token number verify ho raha hai...',
  ],
  ivr_menu: [
    'Slot booking ke liye 1 dabaye.',
    'Booking status ke liye 2 dabaye.',
    'Complaint ke liye 3 dabaye.',
  ],
  crop_selection: [
    'Kripya apni fasal chune.',
    '1 dabaye Gehun (Wheat) ke liye.',
    '2 dabaye Dhan (Paddy) ke liye.',
    '3 dabaye Sarson (Mustard) ke liye.',
    '4 dabaye Kapas (Cotton) ke liye.',
  ],
  confirmation: [
    'Aapka slot safalta se book ho gaya hai.',
    'SMS bheja ja raha hai...',
    'Dhanyawaad. MANDIQ aapka istemal karne ke liye shukriya.',
  ],
  completed: [],
};

// ── Auto-Script for Voice AI Mode ────────────────────────────────────────────
export function generateVoiceConversation(config: CallerConfig): TranscriptLine[] {
  const cropHindi: Record<string, string> = {
    Wheat: 'gehu',
    Paddy: 'dhan',
    Mustard: 'sarson',
    Cotton: 'kapas',
    Maize: 'makai',
    Bajra: 'bajra',
    Sugarcane: 'ganna',
  };
  const crop = cropHindi[config.crop] || config.crop.toLowerCase();
  const now = new Date();
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const lines: TranscriptLine[] = [
    { id: '1', speaker: 'AI', text: 'Namaskar. Main MANDIQ Voice Assistant bol rahi hoon.', timestamp: fmt(now) },
    { id: '2', speaker: 'Farmer', text: `Mera ${crop} ka slot kal book kar do.`, timestamp: fmt(new Date(now.getTime() + 4000)) },
    { id: '3', speaker: 'AI', text: 'Thik hai. Pehle aapka naam aur gaon batayein.', timestamp: fmt(new Date(now.getTime() + 6000)) },
    { id: '4', speaker: 'Farmer', text: `${config.name}, ${config.phone.slice(-4)} number se.`, timestamp: fmt(new Date(now.getTime() + 9000)) },
    { id: '5', speaker: 'AI', text: 'Kal subah 10 baje ka slot available hai. Kya confirm karun?', timestamp: fmt(new Date(now.getTime() + 12000)) },
    { id: '6', speaker: 'Farmer', text: 'Haan, confirm karo.', timestamp: fmt(new Date(now.getTime() + 15000)) },
    { id: '7', speaker: 'AI', text: 'Dhanyawaad. Aapka slot book ho gaya hai. SMS bhej diya gaya hai.', timestamp: fmt(new Date(now.getTime() + 18000)) },
  ];
  return lines;
}

// ── Timeline Event Generator ─────────────────────────────────────────────────
export function createTimelineEvent(
  event: string,
  type: TimelineEvent['type']
): TimelineEvent {
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

// ── Token Generator ─────────────────────────────────────────────────────────
export function generateToken(): string {
  const num = 200 + Math.floor(Math.random() * 99);
  return `TK-${num}`;
}

// ── Booking Result Builder ───────────────────────────────────────────────────
export function buildBookingResult(config: CallerConfig, token: string): BookingResult {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const slotTime = '10:00 AM – 12:00 PM';

  return {
    token,
    slotTime,
    date: dateStr,
    crop: config.crop,
    apmcGate: 'Gate 1 (North Entry)',
    smsText: `MANDIQ: Token ${token} confirmed. ${config.crop} slot: ${dateStr} ${slotTime}. Karnal APMC Gate 1. -MANDIQ`,
  };
}
