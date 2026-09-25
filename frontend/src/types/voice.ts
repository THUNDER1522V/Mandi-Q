// MANDIQ — Voice Agent & IVR Engine Domain Types (Sprint 8A)

export type CallState =
  | 'IDLE'
  | 'INCOMING_CALL'
  | 'RINGING'
  | 'CONNECTED'
  | 'GREETING'
  | 'MAIN_MENU'
  | 'CROP_MENU'
  | 'STATUS_CHECK'
  | 'AI_SPEAKING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'SMS_SENT'
  | 'CALL_ENDED'
  | 'ERROR';

export type DTMFDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '*' | '#';

export type KeypadKey =
  | DTMFDigit
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'CENTER'
  | 'CALL'
  | 'END'
  | 'SOFT_LEFT'
  | 'SOFT_RIGHT';

export type IVRMenuId = 'main' | 'crop_select' | 'status_check' | 'ai_speak' | 'error';

export interface IVROption {
  key: string;
  label: string;
  subtext?: string;
  hindiLabel?: string;
  actionId: string;
}

export interface ConversationTurn {
  id: string;
  speaker: 'AI' | 'USER';
  message: string;
  hindiMessage?: string;
  timestamp: string;
  type?: 'speech' | 'dtmf' | 'system';
}

export interface CallerProfile {
  id: string;
  name: string;
  phone: string;
  village: string;
  district?: string;
  state?: string;
  language: string;
  crop: string;
  farmerId?: string;
}

export interface BookingDetails {
  token: string;
  rawTokenNumber: number;
  name: string;
  phone: string;
  crop: string;
  date: string;
  slotTime: string;
  gate: string;
  smsText: string;
  status: string;
  queuePos?: string | number;
}

export interface BookingStatusResult {
  found: boolean;
  token?: string;
  rawTokenNumber?: number;
  farmerName?: string;
  status?: string;
  crop?: string;
  gate?: string;
  slotTime?: string;
  message: string;
}

export interface VoiceTelemetry {
  callState: CallState;
  voiceEngine: string;
  latencyMs: number;
  sttTtsStatus: 'Listening' | 'Transmitting' | 'Idle' | 'Processing';
  connectionQuality: 'Excellent' | 'Good' | 'Fair';
  signalBars: number;
  batteryLevel: number;
}
