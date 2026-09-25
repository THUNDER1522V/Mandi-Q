// Voice Agent — Shared Types
// Architecture designed for Sarvam AI / Bhashini / Fast2SMS API integration later

export type PhoneState =
  | 'idle'
  | 'incoming'
  | 'calling'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'dtmf_menu'
  | 'ivr_menu'
  | 'crop_menu'
  | 'crop_selection'
  | 'processing'
  | 'confirmation'
  | 'sms_sent'
  | 'completed';

export type Language = 'Hindi' | 'Punjabi' | 'Haryanvi' | 'Bhojpuri' | 'English';
export type VoiceProvider = 'Sarvam AI' | 'Bhashini';
export type CropType = 'Wheat' | 'Paddy' | 'Jowar' | 'Maize' | 'Mustard' | 'Cotton' | 'Bajra' | 'Sugarcane';

export interface CropOption {
  key: string;
  code: CropType;
  nameHindi: string;
  nameEnglish: string;
}

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
  rawTokenNumber?: number;
  slotTime: string;
  date: string;
  crop?: string;
  name?: string;
  farmerName?: string;
  phone?: string;
  apmcGate?: string;
  gate?: string;
  queuePos?: number | string;
  smsText: string;
}
