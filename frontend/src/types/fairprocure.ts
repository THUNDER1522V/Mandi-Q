/**
 * TypeScript domain definitions for MANDIQ FairProcure Layer (Sprint 5)
 */

export type RuleDecision = 'ALLOW' | 'DENY' | 'OVERRIDE_REQUIRED';

export type ProcurementStatus =
  | 'ARRIVED'
  | 'QR_VERIFIED'
  | 'QUEUE_ENTERED'
  | 'WAITING'
  | 'WEIGHMENT_STARTED'
  | 'WEIGHMENT_COMPLETED'
  | 'PROCUREMENT_STARTED'
  | 'PROCUREMENT_COMPLETED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'EXITED'
  | 'FAILED'
  | 'CANCELLED'
  | 'INITIATED';

export type OverrideStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type ApprovalMethod = 'PIN' | 'OTP' | 'QR' | 'BIOMETRIC' | 'SYSTEM';

export interface OverrideRequestPayload {
  farmer_id?: string;
  booking_id?: string;
  token_number?: number;
  reason: string;
  requested_by?: string;
}

export interface OverrideApprovePayload {
  override_id: string;
  supervisor_id: string;
  supervisor_name?: string;
  pin: string;
  method?: ApprovalMethod;
}

export interface OverrideRejectPayload {
  override_id: string;
  supervisor_id: string;
  reason: string;
}

export interface OverrideItem {
  id: string;
  farmer_id?: string;
  booking_id?: string;
  token_number?: number;
  farmer_name?: string;
  reason: string;
  requested_by: string;
  approved_by?: string;
  approval_status: OverrideStatus | string;
  approval_method: ApprovalMethod | string;
  proof_hash?: string;
  created_at: string;
  approved_at?: string;
}

export interface ProcurementStartPayload {
  booking_id?: string;
  token_number?: number;
  farmer_id?: string;
  bay_number?: number;
  operator_id?: string;
  device_id?: string;
  qr_data?: string;
}

export interface ProcurementStartResponse {
  decision: RuleDecision;
  message: string;
  procurement_event_id?: string;
  booking_id?: string;
  token_number?: number;
  farmer_name?: string;
  status: string;
  bay_number?: number;
  started_at: string;
  reason?: string;
  slot?: string;
  current_time?: string;
  details?: string;
}

export interface ProcurementTransitionPayload {
  event_id: string;
  target_status: ProcurementStatus;
  remarks?: string;
  operator_id?: string;
}

export interface ProcurementEventItem {
  id: string;
  farmer_id?: string;
  booking_id?: string;
  queue_id?: string;
  status: ProcurementStatus | string;
  started_at?: string;
  completed_at?: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface FairnessMetrics {
  today_procurements: number;
  today_overrides: number;
  pending_overrides: number;
  denied_attempts: number;
  queue_jump_attempts: number;
  early_arrival_attempts: number;
  average_waiting_time_minutes: number;
  qr_success_rate: number;
  qr_failure_rate: number;
  queue_compliance: number;
  fairness_score: number;
  audit_events_today: number;
  timestamp: string;
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface FairnessAlert {
  id: string;
  type: string;
  severity: AlertSeverity | string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface QRVerificationResponse {
  valid: boolean;
  status: 'VALID' | 'REVOKED' | 'EXPIRED' | 'INVALID_SIGNATURE' | 'NOT_FOUND' | 'FARMER_NOT_FOUND' | string;
  message: string;
  rule_decision: RuleDecision;
  rule_reason?: string;
  farmer_id?: string;
  farmer_name?: string;
  booking_id?: string;
  token_number?: number;
  version?: number;
  verification_count?: number;
  last_scanned_at?: string;
  verified_at?: string;
  device_id?: string;
  operator_id?: string;
  farmer?: {
    id: string;
    name: string;
    phone: string;
    village: string;
    district?: string;
  };
  booking?: {
    id: string;
    slot_time: string;
    commodity: string;
    estimated_quantity?: number;
    status?: string;
  };
  token?: {
    token_number?: number;
    token_formatted?: string;
    queue_position?: number;
    status?: string;
  };
}

export interface QRPayloadData {
  farmer_id: string;
  booking_id?: string | null;
  token_number?: number | null;
  slot_start?: string | null;
  slot_end?: string | null;
  issued_at: string;
  version: number;
  signature: string;
}

export interface QRMetadataResponse {
  id: string;
  farmer_id: string;
  farmer_name: string;
  phone: string;
  qr_code: string;
  version: number;
  verification_count: number;
  is_active: boolean;
  status: string;
  generated_at: string;
  expires_at?: string | null;
  last_scanned_at?: string | null;
  last_verified_by?: string | null;
  qr_png_url: string;
  qr_svg_url: string;
  payload: QRPayloadData;
}

export interface QRDashboardMetrics {
  today_qr_generated: number;
  today_qr_verified: number;
  verification_failures: number;
  expired_qr: number;
  active_qr: number;
  revoked_qr: number;
  verification_success_rate: number;
  total_qr_issued: number;
  timestamp: string;
}

