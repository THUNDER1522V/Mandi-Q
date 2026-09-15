import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import WeighbridgeBay

logger = logging.getLogger("mandiq.weighbridge")

router = APIRouter(prefix="/weighbridge", tags=["Weighbridge"])


@router.get("/bays", summary="Get status of all weighbridge bays")
def get_weighbridge_bays_api(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    bays = db.query(WeighbridgeBay).order_by(WeighbridgeBay.bay_number.asc()).all()
    return [
        {
            "id": b.id,
            "bay_number": b.bay_number,
            "bay_name": b.bay_name,
            "scale_type": b.scale_type,
            "capacity_tons": b.capacity_tons,
            "operator_name": b.operator_name,
            "status": b.status,
            "current_token": b.current_token,
            "updated_at": b.updated_at.isoformat() if b.updated_at else None,
        }
        for b in bays
    ]
