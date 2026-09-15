import logging
from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Booking, Farmer, SystemState

logger = logging.getLogger("mandiq.dashboard")


def get_dashboard_summary(db: Session) -> Dict[str, Any]:
    """
    Returns the official Mandi summary: metrics, counts, and active/halted state.
    Matches BackendDashboardSummary frontend type contract.
    """
    logger.debug("Fetching dashboard summary")

    # 1. Mandi State
    system_state = db.query(SystemState).filter(SystemState.id == 1).first()
    if not system_state:
        system_state = SystemState(
            id=1,
            is_halted=False,
            halt_reason="",
            updated_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(system_state)
        db.commit()
        db.refresh(system_state)

    is_halted = bool(system_state.is_halted)
    mandi_state = {
        "active": not is_halted,
        "halted_reason": system_state.halt_reason if is_halted else None,
        "halted_at": system_state.updated_at.isoformat() if is_halted and system_state.updated_at else None,
        "resumed_at": system_state.updated_at.isoformat() if not is_halted and system_state.updated_at else None,
    }

    # 2. Total registered farmers
    total_farmers = db.query(func.count(Farmer.id)).scalar() or 0

    # 3. Status breakdown from Bookings
    counts_query = db.query(
        Booking.status,
        func.count(Booking.id)
    ).group_by(Booking.status).all()

    counts = {str(status).upper(): count for status, count in counts_query}

    waiting = counts.get("BOOKED", 0) + counts.get("WAITING", 0)
    served = counts.get("SERVED", 0) + counts.get("COMPLETED", 0)
    no_show = counts.get("NO_SHOW", 0) + counts.get("NOSHOW", 0)
    rescheduled = counts.get("RESCHEDULED", 0)

    # 4. Total quintals procured
    total_qtl_procured = db.query(
        func.coalesce(func.sum(Booking.net_weight_quintals), 0)
    ).filter(
        Booking.status.in_(["SERVED", "COMPLETED", "Served", "Completed"])
    ).scalar() or 0.0

    # 5. Total slots capacity
    total_slots = 50

    return {
        "mandi": mandi_state,
        "waiting": waiting,
        "served": served,
        "no_show": no_show,
        "rescheduled": rescheduled,
        "total_farmers": total_farmers,
        "total_slots": total_slots,
        "total_quintals_procured": round(float(total_qtl_procured), 1),
    }
