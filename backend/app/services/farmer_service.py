import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Farmer
from app.schemas import FarmerCreate, FarmerUpdate

logger = logging.getLogger("mandiq.farmers")


def _to_uuid(val: UUID | str) -> UUID:
    """Normalize string or UUID to uuid.UUID object."""
    if isinstance(val, UUID):
        return val
    try:
        return UUID(str(val).strip())
    except (ValueError, AttributeError) as err:
        logger.warning("Failed to parse UUID from '%s': %s", val, err)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid UUID format: '{val}'"
        ) from err


def create_farmer(db: Session, farmer: FarmerCreate) -> Farmer:
    """
    Create a new farmer record.
    Checks for duplicate phone number before insert and ensures transaction safety.
    """
    normalized_phone = farmer.phone_number.strip()
    logger.info("[POST] Before insert: name='%s', phone='%s', village='%s'", farmer.farmer_name, normalized_phone, farmer.village)

    # 1. Pre-check for duplicate phone number
    existing_farmer = db.query(Farmer).filter(Farmer.phone_number == normalized_phone).first()
    if existing_farmer:
        logger.warning("[POST] Duplicate phone number conflict: '%s'", normalized_phone)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already exists"
        )

    new_farmer = Farmer(
        farmer_name=farmer.farmer_name.strip(),
        phone_number=normalized_phone,
        village=farmer.village.strip(),
        district=farmer.district.strip(),
        state=farmer.state.strip(),
        preferred_language=farmer.preferred_language
    )

    try:
        db.add(new_farmer)
        db.commit()
        db.refresh(new_farmer)
        logger.info("[POST] After commit: generated UUID=%s", new_farmer.id)
        return new_farmer
    except IntegrityError as exc:
        db.rollback()
        logger.warning("[POST] IntegrityError on concurrent insert for phone: '%s'", normalized_phone)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already exists"
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("[POST] Database error creating farmer: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while creating farmer"
        ) from exc


def get_all_farmers(db: Session, skip: int = 0, limit: int = 100) -> List[Farmer]:
    """Retrieve all farmers with pagination."""
    logger.debug("[GET ALL] Fetching farmers: skip=%d, limit=%d", skip, limit)
    return db.query(Farmer).order_by(Farmer.created_at.desc()).offset(skip).limit(limit).all()


def get_farmer_by_id(db: Session, farmer_id: UUID | str) -> Optional[Farmer]:
    """Retrieve a single farmer by UUID or UUID string."""
    uuid_obj = _to_uuid(farmer_id)
    logger.info("[GET] Received UUID=%s", uuid_obj)
    logger.info("[GET] SQL executed: SELECT * FROM farmers WHERE id = '%s'", uuid_obj)

    farmer = db.query(Farmer).filter(Farmer.id == uuid_obj).first()
    if farmer:
        logger.info("[GET] Object returned: id=%s, name='%s', phone='%s'", farmer.id, farmer.farmer_name, farmer.phone_number)
    else:
        logger.info("[GET] Object returned: None (farmer not found for UUID=%s)", uuid_obj)

    return farmer


def update_farmer(
    db: Session,
    farmer_id: UUID | str,
    farmer_data: FarmerUpdate
) -> Optional[Farmer]:
    """
    Update an existing farmer record.
    Validates phone number uniqueness and updates timestamps.
    """
    uuid_obj = _to_uuid(farmer_id)
    logger.info("[PUT] Received UUID=%s", uuid_obj)

    farmer = db.query(Farmer).filter(Farmer.id == uuid_obj).first()
    if not farmer:
        logger.warning("[PUT] Farmer not found for update: UUID=%s", uuid_obj)
        return None

    logger.info("[PUT] Fetched object: id=%s, current name='%s', current phone='%s'", farmer.id, farmer.farmer_name, farmer.phone_number)

    update_dict = farmer_data.model_dump(exclude_unset=True)
    if not update_dict:
        return farmer

    logger.info("[PUT] Updated values: %s", update_dict)

    # If updating phone number, verify it is not already used by another farmer
    if "phone_number" in update_dict:
        new_phone = update_dict["phone_number"].strip()
        update_dict["phone_number"] = new_phone
        if new_phone != farmer.phone_number:
            existing_phone = db.query(Farmer).filter(
                Farmer.phone_number == new_phone,
                Farmer.id != uuid_obj
            ).first()
            if existing_phone:
                logger.warning("[PUT] Phone number conflict during update: '%s'", new_phone)
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Phone number already exists"
                )

    # Clean string values
    for key, value in update_dict.items():
        if isinstance(value, str):
            setattr(farmer, key, value.strip())
        else:
            setattr(farmer, key, value)

    farmer.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    try:
        db.commit()
        db.refresh(farmer)
        logger.info("[PUT] After commit: id=%s, updated_at=%s", farmer.id, farmer.updated_at)
        return farmer
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already exists"
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("[PUT] Database error updating farmer %s: %s", uuid_obj, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while updating farmer"
        ) from exc


def delete_farmer(db: Session, farmer_id: UUID | str) -> bool:
    """
    Delete a farmer record by UUID.
    Safely rolls back in case of foreign key constraint errors or DB failures.
    """
    uuid_obj = _to_uuid(farmer_id)
    logger.info("[DELETE] Received UUID=%s", uuid_obj)

    farmer = db.query(Farmer).filter(Farmer.id == uuid_obj).first()
    if not farmer:
        logger.warning("[DELETE] Farmer not found for delete: UUID=%s", uuid_obj)
        return False

    logger.info("[DELETE] Fetched object: id=%s, name='%s'", farmer.id, farmer.farmer_name)

    try:
        db.delete(farmer)
        db.commit()
        logger.info("[DELETE] Deleted object: id=%s", uuid_obj)
        return True
    except IntegrityError as exc:
        db.rollback()
        logger.warning("[DELETE] Cannot delete farmer %s due to foreign key constraints", uuid_obj)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete farmer because linked records (bookings, tokens, or calls) exist"
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("[DELETE] Database error deleting farmer %s: %s", uuid_obj, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while deleting farmer"
        ) from exc
