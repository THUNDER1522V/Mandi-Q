import logging
from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy.orm import Session, joinedload

from app.models import Booking, Farmer, Notification, SystemState, Token

logger = logging.getLogger("mandiq.admin")


def halt_procurement(db: Session, reason: str, from_time: str = "00:00") -> Dict[str, Any]:
    """
    Halts procurement and auto-reschedules remaining waiting farmers.
    Matches BackendHaltResponse frontend contract.
    """
    logger.warning("Halting procurement. Reason: '%s', from_time: %s", reason, from_time)

    # 1. Update SystemState
    system_state = db.query(SystemState).filter(SystemState.id == 1).first()
    if not system_state:
        system_state = SystemState(id=1, is_halted=True, halt_reason=reason, updated_at=datetime.utcnow())
        db.add(system_state)
    else:
        system_state.is_halted = True
        system_state.halt_reason = reason
        system_state.updated_at = datetime.utcnow()

    # 2. Find active/waiting bookings
    active_bookings = (
        db.query(Booking)
        .options(joinedload(Booking.farmer), joinedload(Booking.token))
        .filter(Booking.status.in_(["Booked", "BOOKED", "Waiting", "WAITING"]))
        .all()
    )

    rescheduled_list = []
    for idx, b in enumerate(active_bookings, start=1):
        b.status = "RESCHEDULED"
        old_tok = b.token.token_number if (b.token and b.token.token_number) else idx
        new_tok = old_tok + 100
        farmer_name = b.farmer.farmer_name if b.farmer else f"Farmer {old_tok}"
        phone = b.farmer.phone_number if b.farmer else "+919812000000"
        old_time = b.booking_slot if b.booking_slot else "08:00 AM"
        old_date = b.booking_date.strftime("%Y-%m-%d") if b.booking_date else "Today"

        sms_text = (
            f"MandIQ Alert: Procurement halted ({reason}). Your booking is rescheduled. "
            f"New token {new_tok}, new slot is Tomorrow 08:00 AM."
        )
        voice_text = (
            f"प्रिय {farmer_name}, मंडी खरीद को {reason} के कारण रोका गया है। "
            f"आपका नया टोकन नंबर {new_tok} है और स्लॉट कल सुबह 8 बजे का है।"
        )

        # Record notification in database
        if b.farmer:
            notif = Notification(
                farmer_id=b.farmer.id,
                notification_type="SMS",
                message=sms_text,
                delivery_status="DELIVERED",
                sent_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(notif)

        rescheduled_list.append({
            "name": farmer_name,
            "phone": phone,
            "old_token": old_tok,
            "token": new_tok,
            "old_date": old_date,
            "old_time": old_time,
            "new_date": "Tomorrow",
            "new_time": "08:00 AM",
            "sms": sms_text,
            "voice_hindi": voice_text,
        })

    db.commit()
    logger.info("Procurement halted successfully. Affected farmers: %d", len(rescheduled_list))

    return {
        "halted": True,
        "reason": reason,
        "from_time": from_time,
        "affected_count": len(rescheduled_list),
        "rescheduled": rescheduled_list,
    }


def resume_procurement(db: Session) -> Dict[str, bool]:
    """
    Resumes procurement operations in the system.
    """
    logger.info("Resuming procurement operations")

    system_state = db.query(SystemState).filter(SystemState.id == 1).first()
    if not system_state:
        system_state = SystemState(id=1, is_halted=False, halt_reason="", updated_at=datetime.utcnow())
        db.add(system_state)
    else:
        system_state.is_halted = False
        system_state.halt_reason = ""
        system_state.updated_at = datetime.utcnow()

    db.commit()
    logger.info("Procurement resumed successfully")
    return {"active": True}


def get_alerts(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Retrieves latest reschedule alerts/notifications from PostgreSQL.
    Matches BackendAlertItem frontend contract.
    """
    logger.debug("Fetching recent alerts")

    notifications = (
        db.query(Notification)
        .options(joinedload(Notification.farmer))
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )

    alerts = []
    for idx, notif in enumerate(notifications, start=1):
        farmer_name = notif.farmer.farmer_name if notif.farmer else "Registered Farmer"
        phone = notif.farmer.phone_number if notif.farmer else "+919812000000"
        alerts.append({
            "id": idx,
            "name": farmer_name,
            "phone": phone,
            "channel": notif.notification_type,
            "message": notif.message,
            "status": notif.delivery_status,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
        })

    return alerts
