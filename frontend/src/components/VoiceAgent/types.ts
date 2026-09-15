// Voice Agent — Shared Types
// Architecture designed for Sarvam AI / Bhashini / Fast2SMS API integration later

export type PhoneState =
  | 'idle'
  | 'calling'
  | 'connected'
  | 'ivr_menu'
  | 'crop_selection'
  | 'confirmation'
  | 'completed';

export type Language = 'Hindi' | 'Punjabi' | 'Haryanvi' | 'Bhojpuri' | 'English';
export type VoiceProvider = 'Sarvam AI' | 'Bhashini';
export type CropType = 'Wheat' | 'Paddy' | 'Mustard' | 'Cotton' | 'Maize' | 'Bajra' | 'Sugarcane';

export interface Persona {
  id: string;
  name: string;
  language: Language;
  phone: string;
  crop: CropType;
  village: string;
}

export interface CallerConfig {
  name: string;
  phone: string;
  language: Language;
  crop: CropType;
  provider: VoiceProvider;
}

export interface TimelineEvent {
  id: string;
  time: string;
  event: string;
  type: 'system' | 'user' | 'ai' | 'sms' | 'success';
}

export interface TranscriptLine {
  id: string;
  speaker: 'AI' | 'Farmer';
  text: string;
  timestamp: string;
}

export interface CallStatus {
  state: PhoneState;
  provider: VoiceProvider;
  latencyMs: number;
  sttStatus: 'Working' | 'Idle' | 'Error';
  ttsStatus: 'Working' | 'Idle' | 'Error';
  smsStatus: 'Connected' | 'Idle' | 'Error';
  durationSeconds: number;
  lastKey: string;
}

export interface BookingResult {
  token: string;
  slotTime: string;
  date: string;
  smsText: string;
}
