"""Pydantic v2 schemas for MANDIQ FairProcure Enforcement Engine."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.core.enums.fairprocure import ApprovalMethod, OverrideStatus, ProcurementStatus, RuleDecision


class OverrideCreateRequest(BaseModel):
    farmer_id: Optional[uuid.UUID] = Field(None, description="Target farmer UUID")
    booking_id: Optional[uuid.UUID] = Field(None, description="Associated booking UUID")
    token_number: Optional[int] = Field(None, description="Associated queue token number")
    reason: str = Field(..., min_length=3, description="Mandatory justification for out-of-turn or early override")
    requested_by: str = Field(default="Gate Security Officer", description="Role or name of person submitting request")


class OverrideApproveRequest(BaseModel):
    override_id: uuid.UUID = Field(..., description="UUID of the pending override request")
    supervisor_id: str = Field(..., description="APMC Supervisor ID")
    supervisor_name: str = Field(default="APMC Mandi Secretary", description="Supervisor display name")
    pin: str = Field(..., description="Supervisor PIN for dual authorization")
    method: ApprovalMethod = Field(default=ApprovalMethod.PIN, description="Method of authorization")


class OverrideRejectRequest(BaseModel):
    override_id: uuid.UUID = Field(..., description="UUID of the pending override request")
    supervisor_id: str = Field(..., description="APMC Supervisor ID")
    reason: str = Field(..., min_length=3, description="Mandatory reason for rejection")


class OverrideResponse(BaseModel):
    id: str
    farmer_id: Optional[str] = None
    booking_id: Optional[str] = None
    token_number: Optional[int] = None
    farmer_name: Optional[str] = None
    reason: str
    requested_by: str
    approved_by: Optional[str] = None
    approval_status: str
    approval_method: str
    proof_hash: Optional[str] = None
    created_at: str
    approved_at: Optional[str] = None


class ProcurementStartRequest(BaseModel):
    booking_id: Optional[uuid.UUID] = Field(None, description="Booking UUID to start procurement for")
    token_number: Optional[int] = Field(None, description="Farmer queue token number")
    farmer_id: Optional[uuid.UUID] = Field(None, description="Farmer UUID")
    bay_number: int = Field(default=1, description="Assigned Weighbridge bay (1 or 2)")
    operator_id: str = Field(default="Weighbridge Terminal 01", description="Gatekeeper / Terminal Operator")
    device_id: Optional[str] = Field(default="GATE-TERMINAL-01", description="Hardware kiosk or terminal identifier")
    qr_data: Optional[str] = Field(None, description="Optional raw scanned QR payload for gate validation")


class ProcurementStartResponse(BaseModel):
    decision: RuleDecision
    message: str
    procurement_event_id: Optional[str] = None
    booking_id: Optional[str] = None
    token_number: Optional[int] = None
    farmer_name: Optional[str] = None
    status: str
    bay_number: Optional[int] = None
    started_at: str


class ProcurementTransitionRequest(BaseModel):
    event_id: uuid.UUID = Field(..., description="ProcurementEvent UUID")
    target_status: ProcurementStatus = Field(..., description="Next lifecycle milestone")
    remarks: Optional[str] = Field(None, description="Milestone notes, e.g. weighment tare/gross")
    operator_id: str = Field(default="Weighbridge Bay 01", description="Operator executing transition")


class ProcurementTransitionResponse(BaseModel):
    event_id: str
    previous_status: str
    status: str
    remarks: Optional[str] = None
    updated_at: str


class FairnessMetricsResponse(BaseModel):
    today_procurements: int
    today_overrides: int
    pending_overrides: int
    denied_attempts: int
    queue_jump_attempts: int
    early_arrival_attempts: int
    average_waiting_time_minutes: float
    qr_success_rate: float
    qr_failure_rate: float
    queue_compliance: float
    fairness_score: float
    audit_events_today: int
    timestamp: str


class FairnessAlertItem(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    created_at: str


class ProcurementErrorResponse(BaseModel):
    decision: RuleDecision
    reason: str
    slot: Optional[str] = None
    current_time: Optional[str] = None
    details: Optional[str] = None
