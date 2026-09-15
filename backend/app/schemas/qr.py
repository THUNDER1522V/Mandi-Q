"""Pydantic v2 schemas for QR Identity & Verification module.
Includes full OpenAPI schema metadata, descriptions, and request/response examples.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums.fairprocure import RuleDecision


class QRPayloadData(BaseModel):
    """Decoded and cryptographically verified QR identity payload."""
    farmer_id: str = Field(..., description="Unique UUID of the registered farmer")
    booking_id: Optional[str] = Field(None, description="UUID of the associated scheduled booking, if present")
    token_number: Optional[int] = Field(None, description="Queue token sequence number assigned for today")
    slot_start: Optional[str] = Field(None, description="Scheduled arrival window start time (e.g. 10:00 AM)")
    slot_end: Optional[str] = Field(None, description="Scheduled arrival window end time (e.g. 12:00 PM)")
    issued_at: str = Field(..., description="ISO 8601 UTC timestamp of QR issuance")
    version: int = Field(default=1, description="Version counter of this farmer's QR identity")
    signature: str = Field(..., description="HMAC-SHA256 cryptographic tamper-proof digital signature")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "farmer_id": "3b5b5983-727f-4c30-9f59-d1f3a95484d7",
                "booking_id": "000c9c2f-b8d0-4546-9ce3-ec64d655fbad",
                "token_number": 48,
                "slot_start": "10:00 AM",
                "slot_end": "12:00 PM",
                "issued_at": "2026-09-12T10:00:00Z",
                "version": 1,
                "signature": "3f8b92c10a4e76d54c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d",
            }
        }
    )


class QRVerificationRequest(BaseModel):
    """Payload received from optical gate scanner or handheld verification device."""
    qr_data: str = Field(
        ...,
        description="Raw scanned payload string, serialized JSON, or Base64 payload",
        examples=['{"farmer_id": "3b5b5983-727f-4c30-9f59-d1f3a95484d7", "version": 1, "signature": "..."}']
    )
    device_id: Optional[str] = Field(
        default="GATE-SCANNER-01",
        description="Hardware identifier of the scanning barrier kiosk or tablet",
        examples=["GATE-SCANNER-NORTH-01"]
    )
    operator_id: Optional[str] = Field(
        default="GATE-OFFICER-01",
        description="Employee ID of the gate security officer operating the scanner",
        examples=["SEC-PUSH-891"]
    )


class QRVerificationResponse(BaseModel):
    """Comprehensive gate verification result synthesized with Rule Engine decision."""
    valid: bool = Field(..., description="Whether the QR signature and status passed all security checks")
    status: str = Field(..., description="Validation outcome code (e.g. VALID, INVALID_SIGNATURE, EXPIRED, REVOKED, NOT_FOUND)")
    rule_decision: RuleDecision = Field(..., description="Rule Engine operational verdict: ALLOW | DENY | OVERRIDE_REQUIRED")
    message: str = Field(..., description="Actionable explanation for gate personnel and driver display")
    farmer: Optional[Dict[str, Any]] = Field(None, description="Verified farmer registration details")
    booking: Optional[Dict[str, Any]] = Field(None, description="Active booking slot and commodity specifications")
    token: Optional[Dict[str, Any]] = Field(None, description="Current queue token sequence position")
    verified_at: str = Field(..., description="ISO 8601 UTC timestamp of verification")
    device_id: Optional[str] = Field(None, description="Terminal hardware ID logging this scan")
    operator_id: Optional[str] = Field(None, description="Staff member who processed the scan")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "valid": True,
                "status": "VALID",
                "rule_decision": "ALLOW",
                "message": "Farmer identity and scheduled slot verified. Entry granted to Bay scale.",
                "farmer": {
                    "id": "3b5b5983-727f-4c30-9f59-d1f3a95484d7",
                    "name": "Ramesh Kumar",
                    "phone": "+919812000048",
                    "village": "Nilokheri, Karnal",
                },
                "booking": {
                    "id": "000c9c2f-b8d0-4546-9ce3-ec64d655fbad",
                    "slot_time": "10:00 AM - 12:00 PM",
                    "commodity": "Wheat (गेहूँ)",
                    "estimated_quantity": 50,
                    "status": "WAITING",
                },
                "token": {
                    "token_number": 48,
                    "token_formatted": "TK-048",
                    "queue_position": 3,
                },
                "verified_at": "2026-09-12T10:15:30Z",
                "device_id": "GATE-SCANNER-01",
                "operator_id": "GATE-OFFICER-01",
            }
        }
    )


class QRRegenerateRequest(BaseModel):
    """Request payload to revoke existing QR and issue an incremented version."""
    reason: str = Field(
        default="Routine renewal / Device replaced",
        description="Justification for QR regeneration",
        examples=["Previous printed physical slip lost by farmer"]
    )
    operator_id: Optional[str] = Field(
        default="SUPERVISOR-DESK-01",
        description="Staff member authorizing the new version generation",
        examples=["APMC-SEC-01"]
    )


class QRMetadataResponse(BaseModel):
    """Complete metadata and asset URLs for a farmer's active QR identity."""
    id: str = Field(..., description="Unique QR token database UUID")
    farmer_id: str = Field(..., description="Associated farmer UUID")
    farmer_name: str = Field(..., description="Farmer full name")
    phone: str = Field(..., description="Registered phone number")
    qr_code: str = Field(..., description="QR code string identifier")
    version: int = Field(..., description="Current version counter")
    verification_count: int = Field(..., description="Cumulative successful scans")
    is_active: bool = Field(..., description="Whether this QR is active")
    status: str = Field(..., description="Lifecycle status (active / revoked / expired)")
    generated_at: str = Field(..., description="ISO timestamp of generation")
    expires_at: Optional[str] = Field(None, description="ISO timestamp of expiry")
    last_scanned_at: Optional[str] = Field(None, description="Timestamp of latest scan")
    last_verified_by: Optional[str] = Field(None, description="Staff ID of latest verifier")
    qr_png_url: str = Field(..., description="Direct download URL for high-resolution PNG image")
    qr_svg_url: str = Field(..., description="Direct download URL for vector SVG graphic")
    payload: QRPayloadData = Field(..., description="Signed cryptographic payload")


class QRDashboardMetricsResponse(BaseModel):
    """Real-time telemetry and health metrics for the APMC QR verification infrastructure."""
    today_qr_generated: int = Field(..., description="Total new QR identities issued today")
    today_qr_verified: int = Field(..., description="Total successful gate check-ins processed today")
    verification_failures: int = Field(..., description="Tampered, expired, or invalid scan attempts today")
    expired_qr: int = Field(..., description="Count of expired QR tokens in system")
    active_qr: int = Field(..., description="Total currently active QR tokens")
    revoked_qr: int = Field(..., description="Total revoked QR tokens")
    verification_success_rate: float = Field(..., description="Percentage of valid scans vs total attempts today")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "today_qr_generated": 14,
                "today_qr_verified": 86,
                "verification_failures": 3,
                "expired_qr": 0,
                "active_qr": 120,
                "revoked_qr": 4,
                "verification_success_rate": 96.63,
            }
        }
    )


class QRErrorResponse(BaseModel):
    """Standardized FairProcure error model."""
    detail: str = Field(..., description="Human-readable error explanation")
    error_code: str = Field(..., description="Machine-readable error category")
    timestamp: str = Field(..., description="Error occurrence timestamp")
