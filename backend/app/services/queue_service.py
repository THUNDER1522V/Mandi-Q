import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Booking, Farmer, Token, Procurement, WeighbridgeBay, ActivityLog

logger = logging.getLogger("mandiq.queue")


def format_booking_item(b: Booking, idx: int = 1) -> Dict[str, Any]:
    """
    Transforms a Booking ORM instance into the full, rich JSON structure
    matching the React FarmerBooking domain model.
    """
    token_num = b.token.token_number if (b.token and b.token.token_number) else idx
    token_formatted = f"TK-{str(token_num).zfill(3)}"
    farmer_name = b.farmer.farmer_name if b.farmer else f"Farmer {token_num}"
    phone = b.farmer.phone_number if b.farmer else f"+9198120{str(token_num).zfill(5)}"
    village = b.farmer.village if b.farmer else "Karnal Mandi"
    crop = b.commodity.commodity_name if b.commodity else "Wheat (गेहूँ)"
    slot_time = b.booking_slot if b.booking_slot else "10:00 AM - 12:00 PM"
    slot_start = slot_time.split(' - ')[0] if ' - ' in slot_time else slot_time

    # Normalize status: SERVING, WAITING, SERVED, NO_SHOW, RESCHEDULED
    raw_status = (b.status or "WAITING").upper().strip()
    if raw_status in ("WAITING", "BOOKED"):
        status_str = "WAITING"
    elif raw_status in ("SERVING",):
        status_str = "SERVING"
    elif raw_status in ("SERVED", "COMPLETED"):
        status_str = "SERVED"
    elif raw_status in ("NO_SHOW", "NOSHOW"):
        status_str = "NO_SHOW"
    elif raw_status == "RESCHEDULED":
        status_str = "RESCHEDULED"
    else:
        status_str = raw_status

    quantity = b.net_weight_quintals if b.net_weight_quintals else (b.estimated_quantity or 50)
    served_str = b.payment_time if b.payment_time else (b.served_at.strftime("%I:%M %p") if b.served_at else None)

    return {
        "id": str(b.id),
        "farmer_id": str(b.farmer_id) if b.farmer_id else None,
        "booking_id": str(b.id),
        "token": token_num,
        "token_formatted": token_formatted,
        "name": farmer_name,
        "phone": phone,
        "village": village,
        "crop": crop,
        "quantity_quintals": float(quantity),
        "vehicle_type": b.vehicle_type or "Tractor Trolley",
        "vehicle_number": b.vehicle_number or f"HR 05 AM {1000 + (token_num * 87) % 9000}",
        "slot_start": slot_start,
        "slot_time": slot_time,
        "status": status_str,
        "bay_number": b.bay_number,
        "booked_via": b.booked_via or "Voice (Sarvam AI)",
        "booking_timestamp": b.booking_timestamp or "08:00 AM",
        "served_timestamp": served_str,
        "payment_status": b.payment_status or ("CREDITED" if status_str == "SERVED" else "PENDING"),
        "payment_amount": b.payment_amount,
        "payment_reference": b.payment_reference,
        "payment_time": b.payment_time,
        "moisture_pct": b.moisture_pct,
        "gross_weight_kg": b.gross_weight_kg,
        "tare_weight_kg": b.tare_weight_kg,
        "net_weight_quintals": b.net_weight_quintals,
        "notes": b.notes,
    }


def get_live_queue(db: Session) -> List[Dict[str, Any]]:
    """
    Returns the live queue of bookings joined with farmer, token, and commodity.
    Preserves exact priority ordering: SERVING first, then WAITING by token, then others.
    """
    logger.debug("Fetching live queue items")

    bookings = (
        db.query(Booking)
        .options(
            joinedload(Booking.farmer),
            joinedload(Booking.token),
            joinedload(Booking.commodity),
        )
        .order_by(Booking.booking_date.asc(), Booking.created_at.asc())
        .all()
    )

    # Sort so SERVING are on top, followed by WAITING in FIFO order, then SERVED, etc.
    def sort_key(b: Booking):
        tok = b.token.token_number if (b.token and b.token.token_number) else 999
        st = (b.status or "WAITING").upper()
        if st == "SERVING":
            return (0, tok)
        if st in ("WAITING", "BOOKED"):
            return (1, tok)
        if st == "SERVED":
            return (2, -tok)
        return (3, tok)

    sorted_bookings = sorted(bookings, key=sort_key)
    return [format_booking_item(b, idx) for idx, b in enumerate(sorted_bookings, start=1)]


def call_next_to_bay(db: Session, bay_number: int) -> Dict[str, Any]:
    """
    Assigns the next FIFO waiting farmer to the specified weighbridge bay.
    If a farmer is already in this bay, completes their weighment (marks SERVED,
    credits PFMS payment, logs audit), then advances the next waiting farmer.
    """
    logger.info("Calling next waiting farmer to Bay %d", bay_number)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    now_str = now.strftime("%I:%M %p")

    # 1. Complete existing farmer in this bay if any
    existing = (
        db.query(Booking)
        .options(joinedload(Booking.farmer), joinedload(Booking.token), joinedload(Booking.commodity))
        .filter(Booking.bay_number == bay_number, Booking.status.in_(["SERVING", "Serving"]))
        .first()
    )

    if existing:
        existing.status = "SERVED"
        existing.bay_number = None
        existing.served_at = now
        existing.payment_status = "CREDITED"
        existing.payment_time = now_str
        existing_tok = existing.token.token_number if existing.token else 0
        if not existing.payment_reference:
            existing.payment_reference = f"PFMS{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Record Procurement
        proc = db.query(Procurement).filter(Procurement.booking_id == existing.id).first()
        if not proc:
            net_qtl = existing.net_weight_quintals or existing.estimated_quantity or 50.0
            msp = existing.commodity.minimum_support_price if existing.commodity else 2275.0
            proc = Procurement(
                booking_id=existing.id,
                actual_quantity=net_qtl,
                quality_grade="Grade FAQ A",
                final_price=existing.payment_amount or (net_qtl * msp),
                procurement_status="Completed",
                procured_at=now,
            )
            db.add(proc)

        # Activity Logs
        tok_formatted = f"TK-{str(existing_tok).zfill(3)}"
        db.add(ActivityLog(
            title=f"Procurement completed · Token {tok_formatted}",
            detail=f"{existing.net_weight_quintals or existing.estimated_quantity} Qtl {existing.commodity.commodity_name if existing.commodity else 'Wheat'} verified at Bay 0{bay_number}",
            event_type="served",
            created_at=now,
        ))
        db.add(ActivityLog(
            title=f"PFMS payment credited · Token {tok_formatted}",
            detail=f"Beneficiary A/c ({existing.farmer.farmer_name if existing.farmer else 'Farmer'}) credited via DBT",
            event_type="payment",
            created_at=now,
        ))

    # 2. Find next WAITING farmer by token_number (FIFO)
    next_booking = (
        db.query(Booking)
        .join(Booking.token)
        .options(joinedload(Booking.farmer), joinedload(Booking.token), joinedload(Booking.commodity))
        .filter(Booking.status.in_(["WAITING", "Waiting", "BOOKED", "Booked"]))
        .order_by(Token.token_number.asc())
        .first()
    )

    if not next_booking:
        # Update bay to READY
        bay = db.query(WeighbridgeBay).filter(WeighbridgeBay.bay_number == bay_number).first()
        if bay:
            bay.status = "READY"
            bay.current_token = None
        db.commit()
        return {"message": "No waiting farmers in queue", "called_farmer": None}

    # 3. Assign next waiting farmer to bay
    next_tok = next_booking.token.token_number if next_booking.token else 1
    next_booking.status = "SERVING"
    next_booking.bay_number = bay_number
    if next_booking.token:
        next_booking.token.status = "SERVING"

    # Update WeighbridgeBay
    bay = db.query(WeighbridgeBay).filter(WeighbridgeBay.bay_number == bay_number).first()
    if bay:
        bay.status = "SERVING"
        bay.current_token = next_tok
        bay.updated_at = now

    tok_formatted = f"TK-{str(next_tok).zfill(3)}"
    db.add(ActivityLog(
        title=f"Token {tok_formatted} called to Bay 0{bay_number}",
        detail=f"{next_booking.farmer.farmer_name if next_booking.farmer else 'Farmer'} ({next_booking.farmer.village if next_booking.farmer else 'Mandi'}) called to weighbridge scale",
        event_type="bay",
        created_at=now,
    ))

    db.commit()
    db.refresh(next_booking)
    logger.info("Successfully called Token %s to Bay %d", tok_formatted, bay_number)
    return {
        "message": f"Token {tok_formatted} called to Bay 0{bay_number}",
        "called_farmer": format_booking_item(next_booking),
    }


def assign_farmer_to_bay(db: Session, token_number: int, bay_number: int) -> Dict[str, Any]:
    """
    Assigns a specific farmer token directly to Bay 1 or Bay 2.
    """
    logger.info("Assigning Token %d to Bay %d", token_number, bay_number)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    token = db.query(Token).filter(Token.token_number == token_number).first()
    if not token or not token.booking:
        raise HTTPException(status_code=404, detail=f"Token {token_number} not found")

    booking = token.booking

    # If another farmer is currently in this bay, complete them
    existing = (
        db.query(Booking)
        .filter(Booking.bay_number == bay_number, Booking.id != booking.id, Booking.status == "SERVING")
        .first()
    )
    if existing:
        existing.status = "SERVED"
        existing.bay_number = None
        existing.served_at = now
        existing.payment_status = "CREDITED"

    booking.status = "SERVING"
    booking.bay_number = bay_number
    token.status = "SERVING"

    bay = db.query(WeighbridgeBay).filter(WeighbridgeBay.bay_number == bay_number).first()
    if bay:
        bay.status = "SERVING"
        bay.current_token = token_number
        bay.updated_at = now

    tok_formatted = f"TK-{str(token_number).zfill(3)}"
    db.add(ActivityLog(
        title=f"Token {tok_formatted} dispatched to Bay 0{bay_number}",
        detail=f"{booking.farmer.farmer_name if booking.farmer else 'Farmer'} called to weighbridge scale",
        event_type="bay",
        created_at=now,
    ))

    db.commit()
    return {"message": f"Token {tok_formatted} assigned to Bay {bay_number}"}


def update_queue_status(db: Session, token_number: int, new_status: str) -> Dict[str, str]:
    """
    Updates the status of a booking/token in PostgreSQL.
    Accepts: 'SERVED' | 'NO_SHOW' | 'WAITING' | 'RESCHEDULED'
    """
    normalized_status = new_status.upper().strip()
    logger.info("Updating queue status for token %d to %s", token_number, normalized_status)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    token = db.query(Token).filter(Token.token_number == token_number).first()
    if not token or not token.booking:
        # Fallback search
        booking = db.query(Booking).filter(Booking.id == token_number).first()
        if not booking:
            booking = db.query(Booking).offset(max(0, token_number - 1)).first()
        if not booking:
            raise HTTPException(status_code=404, detail=f"Token or booking {token_number} not found")
    else:
        booking = token.booking

    old_bay = booking.bay_number
    booking.status = normalized_status
    if token:
        token.status = normalized_status

    if normalized_status in ("SERVED", "COMPLETED"):
        booking.status = "SERVED"
        booking.bay_number = None
        booking.served_at = now
        booking.payment_status = "CREDITED"
        booking.payment_time = now.strftime("%I:%M %p")
        if not booking.payment_reference:
            booking.payment_reference = f"PFMS{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Activity log
        farmer_name = booking.farmer.farmer_name if booking.farmer else f"Farmer {token_number}"
        db.add(ActivityLog(
            title=f"Farmer TK-{token_number:03d} marked Served",
            detail=f"{farmer_name} · Weighment finalized · Gate pass generated",
            event_type="served",
            created_at=now,
        ))
        db.add(ActivityLog(
            title=f"Payment processed · Token TK-{token_number:03d}",
            detail="Direct Bank Transfer (DBT) credited via PFMS gateway",
            event_type="payment",
            created_at=now,
        ))

    elif normalized_status in ("NO_SHOW", "NOSHOW"):
        booking.status = "NO_SHOW"
        booking.bay_number = None
        farmer_name = booking.farmer.farmer_name if booking.farmer else f"Farmer {token_number}"
        db.add(ActivityLog(
            title=f"Farmer TK-{token_number:03d} marked as No-show",
            detail=f"{farmer_name} · Arrival window expired · Slot released",
            event_type="queue",
            created_at=now,
        ))

    # If this booking was in a bay, update bay to READY
    if old_bay:
        bay = db.query(WeighbridgeBay).filter(WeighbridgeBay.bay_number == old_bay).first()
        if bay and bay.current_token == token_number:
            bay.status = "READY"
            bay.current_token = None

    db.commit()
    return {"message": f"Token {token_number} updated to {normalized_status}"}
