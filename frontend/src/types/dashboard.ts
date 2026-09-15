export type QueueStatus = 'SERVING' | 'WAITING' | 'SERVED' | 'NO_SHOW' | 'RESCHEDULED';

export type CropType = 'Wheat (गेहूँ)' | 'Paddy PR-126 (धान)' | 'Basmati 1121 (बासमती)' | 'Mustard (सरसों)' | string;

/**
 * Payment lifecycle states returned by the backend.
 * When the backend does not return this field, the UI derives a
 * provisional status from QueueStatus — see derivePaymentStatus().
 */
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'CREDITED' | 'FAILED';

export interface FarmerBooking {
  id: string;
  token: string;
  rawTokenNumber?: number;
  farmerName: string;
  phone: string;
  village: string;
  crop: CropType;
  quantityQuintals: number;
  vehicleType: 'Tractor Trolley' | 'Pickup 407' | 'Canter' | 'Bullock Cart';
  vehicleNumber: string;
  slotTime: string;
  originalSlot?: string;
  originalToken?: string;
  status: QueueStatus;
  bayNumber?: number;
  bookedVia: 'Voice (Sarvam AI)' | 'Keypad (IVR)' | 'Web Assisted' | 'Walk-in Desk';
  bookingTimestamp: string;
  servedTimestamp?: string;
  notes?: string;

  // ── Payment fields (populated by backend; all optional) ──────────
  // When absent the UI derives a provisional state from `status`.
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;          // Amount in INR, e.g. 45000
  paymentReference?: string;       // UTR / transaction ID
  paymentTime?: string;            // "HH:MM" or full timestamp string
  paymentFailureReason?: string;   // Only present when paymentStatus === 'FAILED'

  // ── Intake & Weighbridge Quality Telemetry (Optional) ────────────
  moisturePct?: number;            // Moisture percentage, e.g. 11.8%
  grossWeightKg?: number;          // Gross laden vehicle weight in kg
  tareWeightKg?: number;           // Unladen vehicle weight in kg
  netWeightQuintals?: number;      // Net crop weight in quintals
  farmer_id?: string;
}

// ── Backend API contracts (Source of truth from FastAPI backend) ──
export interface BackendMandiState {
  active: boolean;
  halted_reason: string | null;
  halted_at?: string | null;
  resumed_at?: string | null;
  haltedReason?: string | null;
  haltedAt?: string | null;
  resumedAt?: string | null;
}

export interface BackendDashboardSummary {
  mandi: BackendMandiState;
  waiting: number;
  served: number;
  no_show: number;
  rescheduled: number;
  total_farmers: number;
  total_slots: number;
  total_quintals_procured?: number;
  // camelCase aliases
  noShow?: number;
  totalFarmers?: number;
  totalSlots?: number;
  totalQuintalsProcured?: number;
  waitingCount?: number;
  servedCount?: number;
  rescheduledCount?: number;
}

export interface BackendLiveQueueItem {
  id?: string;
  token: number;
  token_formatted?: string;
  name: string;
  village: string;
  crop: string;
  slot_start: string;
  slot_time?: string;
  status: string;
  bay_number?: number | null;
  phone?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  quantity_quintals?: number | null;
  moisture_pct?: number | null;
  gross_weight_kg?: number | null;
  tare_weight_kg?: number | null;
  net_weight_quintals?: number | null;
  payment_status?: PaymentStatus | null;
  payment_amount?: number | null;
  payment_reference?: string | null;
  payment_time?: string | null;
  notes?: string | null;
  booked_via?: string | null;
  booking_timestamp?: string | null;
  served_at?: string | null;
  booking_id?: string | number | null;
  farmer_id?: string | null;
}

export interface BackendAlertItem {
  id: number;
  name: string;
  phone: string;
  channel: string;
  message: string;
  status: string;
  created_at: string | null;
}

export interface BackendHaltResponse {
  halted: boolean;
  reason: string;
  from_time: string;
  affected_count: number;
  rescheduled: Array<{
    name: string;
    phone: string;
    old_token: number;
    token: number;
    old_date: string;
    old_time: string;
    new_date: string | null;
    new_time: string | null;
    sms: string;
    voice_hindi: string;
  }>;
}

export interface HaltEvent {
  id: string;
  timestamp: string;
  reason: string;
  haltedBy: string;
  affectedCount: number;
  rescheduledSlot: string;
}

export interface SmsNotification {
  id: string;
  phone: string;
  farmerName: string;
  channel: string;
  message: string;
  status: string;
  timestamp: string;
  oldToken?: string;
  newToken?: string;
  newSlot?: string;
  messageHindi?: string;
  dltTemplateId?: string;
}

export interface MandiMetrics {
  nowServingCount: number;
  waitingCount: number;
  servedCount: number;
  noShowCount: number;
  rescheduledCount: number;
  totalRegistered: number;
  totalQuintalsProcured: number;
  avgWaitMinutes: number;
  capacityUtilizationPct: number;
  activeBays: number;
  totalBays: number;
  isHalted: boolean;
  haltReason?: string;
  totalSlots?: number;
}

export interface RaceTestResult {
  candidateA: { name: string; phone: string; timestampMs: number; status: 'WON (Booked)' | 'LOST (Auto-Rescheduled)'; token?: string };
  candidateB: { name: string; phone: string; timestampMs: number; status: 'WON (Booked)' | 'LOST (Auto-Rescheduled)'; token?: string };
  slotContested: string;
  resolvedInMs: number;
  lockType: 'Postgres SELECT FOR UPDATE / Atomic Redis Lock';
}

export interface ActivityEvent {
  id: string;
  timestamp: string; // "11:42:18"
  title: string;
  detail?: string;
  type: 'queue' | 'bay' | 'served' | 'payment' | 'sms' | 'halt' | 'system';
}

// ── Farmer CRUD Models (FastAPI /api/v1/farmers) ───────────────────
export interface Farmer {
  id: string;
  farmer_name: string;
  phone_number: string;
  village: string;
  district: string;
  state: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface FarmerCreate {
  farmer_name: string;
  phone_number: string;
  village: string;
  district: string;
  state: string;
  preferred_language?: string;
}

export interface FarmerUpdate {
  farmer_name?: string;
  phone_number?: string;
  village?: string;
  district?: string;
  state?: string;
  preferred_language?: string;
}

