import uuid
from datetime import datetime
from app.database.session import SessionLocal
from app.core.enums.fairprocure import (
    QRStatus,
    ProcurementStatus,
    OverrideStatus,
    ApprovalMethod,
    PolicyDataType,
)
from app.core.constants.fairprocure import (
    POLICY_ARRIVAL_BUFFER_MINUTES,
    POLICY_QR_REQUIRED,
    POLICY_OVERRIDE_REQUIRES_SUPERVISOR,
    POLICY_MAX_DAILY_PROCUREMENT,
    AUDIT_QR_SCANNED,
    AUDIT_OVERRIDE_APPROVED,
)
from app.models import (
    Farmer,
    QRToken,
    ProcurementEvent,
    OverrideRequest,
    AuditLog,
    SystemPolicy,
)
from app.services.fairprocure import (
    FairProcureRuleEngine,
    PolicyService,
    AuditService,
    QRService,
    OverrideService,
    ProcurementLifecycleService,
)

def test_enums_and_constants():
    assert QRStatus.ACTIVE.value == "active"
    assert ProcurementStatus.ARRIVED.value == "ARRIVED"
    assert ProcurementStatus.WEIGHMENT_STARTED.value == "WEIGHMENT_STARTED"
    assert ProcurementStatus.PROCUREMENT_COMPLETED.value == "PROCUREMENT_COMPLETED"
    assert OverrideStatus.APPROVED.value == "APPROVED"
    assert ApprovalMethod.PIN.value == "PIN"
    assert ApprovalMethod.BIOMETRIC.value == "BIOMETRIC"
    assert PolicyDataType.INTEGER.value == "INTEGER"

def test_models_and_services_scaffolding():
    db = SessionLocal()
    try:
        # Verify PolicyService reads seeded policies
        policy_svc = PolicyService(db)
        buf = policy_svc.get_int(POLICY_ARRIVAL_BUFFER_MINUTES)
        assert buf == 30
        qr_req = policy_svc.get_bool(POLICY_QR_REQUIRED)
        assert qr_req is True
        
        # Verify Rule Engine methods
        rule_eng = FairProcureRuleEngine(db)
        ok, msg = rule_eng.detect_queue_jumping(token_number=10, target_bay=1)
        assert ok is False  # no violation
        
        # Verify AuditService
        audit_svc = AuditService(db)
        audit = audit_svc.log_action(
            action=AUDIT_QR_SCANNED,
            performed_by="TEST-OFFICER",
            device_id="SCANNER-TEST-01",
            remarks="Automated test log",
        )
        assert audit.id is not None
        assert audit.device_id == "SCANNER-TEST-01"
        
        # Cleanup
        db.delete(audit)
        db.commit()
    finally:
        db.close()
