from app.database.session import engine, SessionLocal
from sqlalchemy import inspect, text
from app.models import (
    Farmer,
    Booking,
    Token,
    QRToken,
    ProcurementEvent,
    OverrideRequest,
    AuditLog,
    SystemPolicy,
)
import uuid
from datetime import datetime

def inspect_schema():
    insp = inspect(engine)
    tables = insp.get_table_names()
    print("PostgreSQL Tables:")
    for t in tables:
        print(f"  - {t}")

    required_tables = [
        "qr_tokens",
        "procurement_events",
        "override_requests",
        "audit_logs",
        "system_policies",
    ]

    for tbl in required_tables:
        assert tbl in tables, f"Missing table: {tbl}"
        print(f"\n[TABLE: {tbl}]")
        cols = insp.get_columns(tbl)
        for c in cols:
            print(f"  Col: {c['name']} ({c['type']}) - Nullable: {c['nullable']}")
        fks = insp.get_foreign_keys(tbl)
        for fk in fks:
            print(f"  FK: {fk['name']} -> {fk['referred_table']}.{fk['referred_columns']}")
        idxs = insp.get_indexes(tbl)
        for idx in idxs:
            print(f"  Index: {idx['name']} -> cols={idx['column_names']} unique={idx['unique']}")

def verify_system_policies():
    print("\n--- Verifying System Policies ---")
    db = SessionLocal()
    policies = db.query(SystemPolicy).all()
    print(f"Total seeded policies: {len(policies)}")
    for p in policies:
        print(f"  - {p.policy_key}: {p.policy_value} (active={p.is_active}) | {p.description}")
    assert len(policies) >= 4, "System policies not seeded properly"
    db.close()

def verify_orm_relationships():
    print("\n--- Verifying ORM Entity Creation & Traversal ---")
    db = SessionLocal()
    
    # 1. Get an existing farmer
    farmer = db.query(Farmer).first()
    assert farmer is not None, "No farmers found in database"
    print(f"Testing with Farmer: {farmer.farmer_name} ({farmer.id})")

    # 2. Test QRToken
    existing_qr = db.query(QRToken).filter(QRToken.farmer_id == farmer.id).first()
    if not existing_qr:
        qr = QRToken(
            farmer_id=farmer.id,
            qr_code=f"MANDIQ-FARMER-{farmer.id}",
            qr_hash="hash_test_1234567890abcdef",
            status="active",
        )
        db.add(qr)
        db.commit()
        db.refresh(farmer)
        print(f"Created QRToken: {farmer.qr_token.qr_code} for {farmer.farmer_name}")
    else:
        print(f"Found existing QRToken via relationship: {farmer.qr_token.qr_code}")

    assert farmer.qr_token is not None
    assert farmer.qr_token.farmer.id == farmer.id

    # 3. Test ProcurementEvent
    booking = db.query(Booking).filter(Booking.farmer_id == farmer.id).first()
    token = booking.token if booking else None
    
    pe = ProcurementEvent(
        farmer_id=farmer.id,
        booking_id=booking.id if booking else None,
        queue_id=token.id if token else None,
        status="INITIATED",
        remarks="Gate check-in completed via QR",
        created_by="Gate System",
    )
    db.add(pe)
    db.commit()
    db.refresh(pe)
    print(f"Created ProcurementEvent: ID={pe.id}, status={pe.status}, farmer={pe.farmer.farmer_name}")
    assert pe.farmer.id == farmer.id
    if booking:
        assert pe.booking.id == booking.id
        print(f"ProcurementEvent Booking traversal: Booking slot={pe.booking.booking_slot}")

    # 4. Test OverrideRequest
    override = OverrideRequest(
        farmer_id=farmer.id,
        booking_id=booking.id if booking else None,
        reason="Priority perishable intake",
        requested_by="Officer Pushkar",
        approved_by="Supervisor Desk",
        approval_status="APPROVED",
        approved_at=datetime.utcnow(),
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    print(f"Created OverrideRequest: ID={override.id}, status={override.approval_status}, farmer={override.farmer.farmer_name if override.farmer else None}")

    # 5. Test AuditLog with JSONB
    audit = AuditLog(
        entity_type="PROCUREMENT_EVENT",
        entity_id=str(pe.id),
        action="PROCUREMENT_STARTED",
        performed_by="Gate Officer 01",
        old_value={"status": "WAITING"},
        new_value={"status": "INITIATED"},
        remarks="Farmer entered premises after QR scan",
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    print(f"Created AuditLog: ID={audit.id}, action={audit.action}, entity={audit.entity_type}, old={audit.old_value}, new={audit.new_value}")
    assert audit.old_value == {"status": "WAITING"}
    assert audit.new_value == {"status": "INITIATED"}

    # Cleanup test event/override/audit/qr
    db.delete(audit)
    db.delete(override)
    db.delete(pe)
    if not existing_qr:
        db.delete(qr)
    db.commit()
    db.close()
    print("All ORM relationship tests PASSED cleanly!")

if __name__ == "__main__":
    inspect_schema()
    verify_system_policies()
    verify_orm_relationships()
    print("\n>>> ALL PHASE 4 ARCHITECTURAL VERIFICATIONS PASSED SUCCESSFULLY! <<<")
