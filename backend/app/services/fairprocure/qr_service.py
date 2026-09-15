"""FairProcure QR Identity & Verification Service.
Handles permanent farmer digital identity generation, HMAC-SHA256 digital signing,
dynamic PNG/SVG generation, multi-stage verification pipeline, and telemetry tracking.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import qrcode
import qrcode.image.svg
from sqlalchemy import func, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants.fairprocure import (
    AUDIT_QR_FAILED,
    AUDIT_QR_GENERATED,
    AUDIT_QR_REGENERATED,
    AUDIT_QR_REVOKED,
    AUDIT_QR_VERIFIED,
    ENTITY_FARMER,
    ENTITY_QR_TOKEN,
)
from app.core.enums.fairprocure import QRStatus
from app.models.audit_log import AuditLog
from app.models.bookings import Booking
from app.models.farmer import Farmer
from app.models.qr_token import QRToken
from app.models.token import Token
from app.services.fairprocure.audit_service import AuditService

logger = logging.getLogger("mandiq.fairprocure.qr")


class QRService:
    """Enterprise service managing permanent digital QR identity tokens for farmers."""

    def __init__(self, db: Session) -> None:
        """Initialize QRService with active database session and audit integration."""
        self.db = db
        self.audit_service = AuditService(db)
        self.secret_key = settings.SECRET_KEY.encode("utf-8")
        logger.debug("QRService initialized with cryptographic HMAC signing")

    # =========================================================================
    # Cryptographic Signing & Validation
    # =========================================================================

    @staticmethod
    def _canonical_payload_string(payload: Dict[str, Any]) -> str:
        """Constructs a deterministic canonical string from payload fields for signing."""
        farmer_id = str(payload.get("farmer_id") or "").strip()
        booking_id = str(payload.get("booking_id") or "").strip()
        token_num = str(payload.get("token_number") or "").strip()
        slot_start = str(payload.get("slot_start") or "").strip()
        slot_end = str(payload.get("slot_end") or "").strip()
        issued_at = str(payload.get("issued_at") or "").strip()
        version = str(payload.get("version") or "1").strip()
        return f"{farmer_id}:{booking_id}:{token_num}:{slot_start}:{slot_end}:{issued_at}:{version}"

    def compute_signature(self, payload: Dict[str, Any]) -> str:
        """Computes a cryptographically secure HMAC-SHA256 signature for the QR payload."""
        canonical = self._canonical_payload_string(payload)
        sig = hmac.new(self.secret_key, canonical.encode("utf-8"), hashlib.sha256).hexdigest()
        return sig

    def validate_signature(self, payload: Dict[str, Any], provided_sig: str) -> bool:
        """Validates payload integrity against the provided signature using constant-time comparison."""
        expected_sig = self.compute_signature(payload)
        return hmac.compare_digest(expected_sig, (provided_sig or "").strip())

    # =========================================================================
    # QR Token Generation & Lifecycle
    # =========================================================================

    def get_active_token(self, farmer_id: uuid.UUID) -> Optional[QRToken]:
        """Fetches currently active QR token for a farmer."""
        return (
            self.db.query(QRToken)
            .filter(
                QRToken.farmer_id == farmer_id,
                QRToken.is_active.is_(True),
                QRToken.status == QRStatus.ACTIVE.value,
            )
            .first()
        )

    def build_payload(self, farmer: Farmer, qr_token: QRToken) -> Dict[str, Any]:
        """Constructs the complete verified payload dictionary including digital signature."""
        # Find active booking / token for context if available
        active_booking = (
            self.db.query(Booking)
            .filter(Booking.farmer_id == farmer.id)
            .order_by(Booking.created_at.desc())
            .first()
        )
        token_num = None
        slot_start = None
        slot_end = None
        booking_id = None

        if active_booking:
            booking_id = str(active_booking.id)
            slot_str = active_booking.booking_slot or "10:00 AM - 12:00 PM"
            if " - " in slot_str:
                parts = slot_str.split(" - ")
                slot_start = parts[0].strip()
                slot_end = parts[1].strip()
            else:
                slot_start = slot_str.strip()
                slot_end = slot_str.strip()

            if active_booking.token:
                token_num = active_booking.token.token_number

        issued_iso = (
            qr_token.generated_at.isoformat()
            if qr_token.generated_at
            else datetime.utcnow().isoformat()
        )

        base_data = {
            "farmer_id": str(farmer.id),
            "booking_id": booking_id,
            "token_number": token_num,
            "slot_start": slot_start,
            "slot_end": slot_end,
            "issued_at": issued_iso,
            "version": qr_token.version,
        }
        signature = self.compute_signature(base_data)
        base_data["signature"] = signature
        return base_data

    def generate_farmer_qr(
        self,
        farmer_id: uuid.UUID,
        booking_id: Optional[uuid.UUID] = None,
        created_by: str = "MANDIQ Inbound Registration",
    ) -> Tuple[QRToken, Dict[str, Any]]:
        """Generates or retrieves a permanent signed QR identity for a registered farmer."""
        farmer = self.db.query(Farmer).filter(Farmer.id == farmer_id).first()
        if not farmer:
            raise KeyError(f"Farmer with ID '{farmer_id}' does not exist")

        existing = self.get_active_token(farmer.id)
        if existing:
            payload = self.build_payload(farmer, existing)
            return existing, payload

        now = datetime.utcnow()
        expires_at = now + timedelta(hours=settings.QR_EXPIRY_HOURS)

        # Temporary dummy token to build initial signature
        dummy_token = QRToken(farmer_id=farmer.id, version=1, generated_at=now)
        payload = self.build_payload(farmer, dummy_token)
        qr_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

        qr_token = QRToken(
            farmer_id=farmer.id,
            qr_code=f"MANDIQ-QR-{farmer.id}",
            qr_hash=qr_hash,
            status=QRStatus.ACTIVE.value,
            version=1,
            verification_count=0,
            is_active=True,
            generated_at=now,
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )
        self.db.add(qr_token)
        self.db.commit()
        self.db.refresh(qr_token)

        # Log immutable audit entry
        self.audit_service.log_action(
            action=AUDIT_QR_GENERATED,
            performed_by=created_by,
            entity_type=ENTITY_QR_TOKEN,
            entity_id=str(qr_token.id),
            new_value={
                "farmer_id": str(farmer.id),
                "version": qr_token.version,
                "expires_at": expires_at.isoformat(),
            },
            remarks=f"Permanent QR identity issued for farmer {farmer.farmer_name} ({farmer.phone_number})",
        )

        final_payload = self.build_payload(farmer, qr_token)
        return qr_token, final_payload

    def regenerate_qr(
        self,
        farmer_id: uuid.UUID,
        reason: str = "Physical slip lost / Phone replaced",
        operator_id: str = "SUPERVISOR-DESK-01",
    ) -> Tuple[QRToken, Dict[str, Any]]:
        """Soft-revokes existing QR token, increments version, and generates a new signed QR identity."""
        farmer = self.db.query(Farmer).filter(Farmer.id == farmer_id).first()
        if not farmer:
            raise KeyError(f"Farmer with ID '{farmer_id}' does not exist")

        old_token = self.get_active_token(farmer.id)
        new_version = 1
        old_state = None

        now = datetime.utcnow()
        if old_token:
            new_version = old_token.version + 1
            old_state = {
                "id": str(old_token.id),
                "version": old_token.version,
                "status": old_token.status,
                "is_active": old_token.is_active,
            }
            old_token.is_active = False
            old_token.status = QRStatus.REVOKED.value
            old_token.updated_at = now

        expires_at = now + timedelta(hours=settings.QR_EXPIRY_HOURS)
        dummy_token = QRToken(farmer_id=farmer.id, version=new_version, generated_at=now)
        payload = self.build_payload(farmer, dummy_token)
        qr_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

        new_token = QRToken(
            farmer_id=farmer.id,
            qr_code=f"MANDIQ-QR-{farmer.id}-v{new_version}",
            qr_hash=qr_hash,
            status=QRStatus.ACTIVE.value,
            version=new_version,
            verification_count=0,
            is_active=True,
            generated_at=now,
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )
        self.db.add(new_token)
        self.db.commit()
        self.db.refresh(new_token)

        # Audit logging
        self.audit_service.log_action(
            action=AUDIT_QR_REGENERATED,
            performed_by=operator_id,
            entity_type=ENTITY_QR_TOKEN,
            entity_id=str(new_token.id),
            old_value=old_state,
            new_value={
                "id": str(new_token.id),
                "version": new_version,
                "reason": reason,
            },
            remarks=f"QR identity regenerated for {farmer.farmer_name}. Previous version revoked. Reason: {reason}",
        )

        final_payload = self.build_payload(farmer, new_token)
        return new_token, final_payload

    def revoke_qr(
        self,
        farmer_id: uuid.UUID,
        reason: str = "Manual revocation",
        operator_id: str = "SUPERVISOR-DESK-01",
    ) -> QRToken:
        """Instantly revokes a farmer's active QR without deleting history."""
        active_token = self.get_active_token(farmer_id)
        if not active_token:
            raise KeyError(f"No active QR token found for farmer '{farmer_id}'")

        now = datetime.utcnow()
        old_val = {"status": active_token.status, "is_active": active_token.is_active}
        active_token.is_active = False
        active_token.status = QRStatus.REVOKED.value
        active_token.updated_at = now
        self.db.commit()
        self.db.refresh(active_token)

        self.audit_service.log_action(
            action=AUDIT_QR_REVOKED,
            performed_by=operator_id,
            entity_type=ENTITY_QR_TOKEN,
            entity_id=str(active_token.id),
            old_value=old_val,
            new_value={"status": QRStatus.REVOKED.value, "is_active": False},
            remarks=f"QR token revoked for farmer {farmer_id}. Reason: {reason}",
        )
        return active_token

    # =========================================================================
    # Rendering Engines (PNG / SVG)
    # =========================================================================

    def render_png(self, payload: Dict[str, Any] | str, box_size: int = 10, border: int = 2) -> bytes:
        """Dynamically renders high-resolution PNG image bytes from signed QR payload."""
        data_str = json.dumps(payload, sort_keys=True) if isinstance(payload, dict) else str(payload)
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=box_size,
            border=border,
        )
        qr.add_data(data_str)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return buffer.getvalue()

    def render_svg(self, payload: Dict[str, Any] | str) -> str:
        """Dynamically renders crisp vector SVG XML string from signed QR payload."""
        data_str = json.dumps(payload, sort_keys=True) if isinstance(payload, dict) else str(payload)
        factory = qrcode.image.svg.SvgPathImage
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
            image_factory=factory,
        )
        qr.add_data(data_str)
        qr.make(fit=True)
        img = qr.make_image()

        buffer = io.BytesIO()
        img.save(buffer)
        buffer.seek(0)
        return buffer.getvalue().decode("utf-8")

    # =========================================================================
    # Verification Pipeline
    # =========================================================================

    def verify_qr(
        self,
        qr_input: str | Dict[str, Any],
        operator_id: str = "GATE-OFFICER-01",
        device_id: str = "GATE-SCANNER-01",
    ) -> Tuple[bool, str, Optional[QRToken], Optional[Dict[str, Any]], str]:
        """Executes full 7-step verification pipeline.

        Returns:
            Tuple of (is_valid, message, qr_token_model, payload_dict, status_code_string).
        """
        now = datetime.utcnow()

        # 1. Parse payload input
        payload: Dict[str, Any] = {}
        if isinstance(qr_input, dict):
            payload = qr_input
        else:
            raw_str = str(qr_input).strip()
            # Try parsing raw JSON
            try:
                payload = json.loads(raw_str)
            except Exception:
                # Try parsing base64 encoded JSON
                try:
                    decoded = base64.b64decode(raw_str).decode("utf-8")
                    payload = json.loads(decoded)
                except Exception:
                    self.audit_service.log_action(
                        action=AUDIT_QR_FAILED,
                        performed_by=operator_id,
                        device_id=device_id,
                        remarks="QR scan failed: Payload malformed or unreadable",
                    )
                    return False, "Malformed QR payload format. Cannot parse QR content.", None, None, "MALFORMED"

        farmer_id_str = payload.get("farmer_id")
        provided_sig = payload.get("signature")

        if not farmer_id_str or not provided_sig:
            self.audit_service.log_action(
                action=AUDIT_QR_FAILED,
                performed_by=operator_id,
                device_id=device_id,
                remarks="QR scan failed: Missing farmer_id or cryptographic signature",
            )
            return False, "Missing farmer_id or digital signature in QR payload.", None, None, "INCOMPLETE_PAYLOAD"

        try:
            farmer_uuid = uuid.UUID(str(farmer_id_str))
        except ValueError:
            return False, f"Invalid farmer UUID format: {farmer_id_str}", None, None, "INVALID_UUID"

        # 2. Validate HMAC-SHA256 signature
        is_sig_valid = self.validate_signature(payload, provided_sig)
        if not is_sig_valid:
            self.audit_service.log_action(
                action=AUDIT_QR_FAILED,
                performed_by=operator_id,
                device_id=device_id,
                entity_type=ENTITY_FARMER,
                entity_id=str(farmer_uuid),
                new_value={"tampered_payload": payload},
                remarks=f"SECURITY ALERT: Cryptographic signature mismatch on QR for farmer {farmer_uuid}",
            )
            return False, "Tamper alert: Digital signature mismatch. QR payload has been forged or altered.", None, None, "INVALID_SIGNATURE"

        # 3. Query QRToken record
        version = int(payload.get("version") or 1)
        token = (
            self.db.query(QRToken)
            .filter(QRToken.farmer_id == farmer_uuid, QRToken.version == version)
            .first()
        )
        if not token:
            self.audit_service.log_action(
                action=AUDIT_QR_FAILED,
                performed_by=operator_id,
                device_id=device_id,
                entity_type=ENTITY_FARMER,
                entity_id=str(farmer_uuid),
                remarks=f"QR verification failed: No database record found for farmer {farmer_uuid} v{version}",
            )
            return False, "QR identity token record not found in APMC platform registry.", None, None, "NOT_FOUND"

        # 4. Check if Farmer exists
        farmer = self.db.query(Farmer).filter(Farmer.id == farmer_uuid).first()
        if not farmer:
            return False, "Associated farmer profile no longer exists in APMC records.", None, None, "FARMER_NOT_FOUND"

        # 5. Check Active status
        if not token.is_active or token.status != QRStatus.ACTIVE.value:
            self.audit_service.log_action(
                action=AUDIT_QR_FAILED,
                performed_by=operator_id,
                device_id=device_id,
                entity_type=ENTITY_QR_TOKEN,
                entity_id=str(token.id),
                remarks=f"QR verification failed: Token inactive/revoked (Status: {token.status})",
            )
            return False, f"QR identity is inactive or revoked (Status: {token.status}).", token, payload, "REVOKED"

        # 6. Check Expiration
        if token.expires_at and token.expires_at < now:
            self.audit_service.log_action(
                action=AUDIT_QR_FAILED,
                performed_by=operator_id,
                device_id=device_id,
                entity_type=ENTITY_QR_TOKEN,
                entity_id=str(token.id),
                remarks=f"QR verification failed: Expired at {token.expires_at.isoformat()}",
            )
            return False, f"QR identity expired on {token.expires_at.strftime('%Y-%m-%d %H:%M')}.", token, payload, "EXPIRED"

        # 7. Verification Succeeded! Update counters atomically via SQL
        old_count = token.verification_count
        self.db.execute(
            update(QRToken)
            .where(QRToken.id == token.id)
            .values(
                verification_count=QRToken.verification_count + 1,
                last_scanned_at=now,
                last_verified_by=operator_id,
                updated_at=now,
            )
        )
        self.db.commit()
        self.db.refresh(token)

        # Audit successful scan
        self.audit_service.log_action(
            action=AUDIT_QR_VERIFIED,
            performed_by=operator_id,
            device_id=device_id,
            entity_type=ENTITY_QR_TOKEN,
            entity_id=str(token.id),
            old_value={"verification_count": old_count},
            new_value={
                "verification_count": token.verification_count,
                "verified_at": now.isoformat(),
            },
            remarks=f"QR identity verified successfully for {farmer.farmer_name} at gate barrier",
        )

        return True, "QR identity authenticity and slot verified successfully.", token, payload, "VALID"

    # =========================================================================
    # Dashboard Metrics Telemetry
    # =========================================================================

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Aggregates real-time QR identity and gate verification metrics for Mandi Dashboard."""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        today_generated = (
            self.db.query(func.count(QRToken.id))
            .filter(QRToken.created_at >= today_start)
            .scalar()
            or 0
        )

        today_verified = (
            self.db.query(func.count(AuditLog.id))
            .filter(AuditLog.action == AUDIT_QR_VERIFIED, AuditLog.created_at >= today_start)
            .scalar()
            or 0
        )

        verification_failures = (
            self.db.query(func.count(AuditLog.id))
            .filter(AuditLog.action == AUDIT_QR_FAILED, AuditLog.created_at >= today_start)
            .scalar()
            or 0
        )

        total_active = (
            self.db.query(func.count(QRToken.id))
            .filter(QRToken.is_active.is_(True))
            .scalar()
            or 0
        )

        total_revoked = (
            self.db.query(func.count(QRToken.id))
            .filter(QRToken.is_active.is_(False))
            .scalar()
            or 0
        )

        total_expired = (
            self.db.query(func.count(QRToken.id))
            .filter(QRToken.expires_at < datetime.utcnow(), QRToken.is_active.is_(True))
            .scalar()
            or 0
        )

        total_attempts = today_verified + verification_failures
        success_rate = (
            round((today_verified / total_attempts) * 100.0, 2)
            if total_attempts > 0
            else 100.0
        )

        return {
            "today_qr_generated": today_generated,
            "today_qr_verified": today_verified,
            "verification_failures": verification_failures,
            "expired_qr": total_expired,
            "active_qr": total_active,
            "revoked_qr": total_revoked,
            "verification_success_rate": success_rate,
        }
