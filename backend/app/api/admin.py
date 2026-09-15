from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.admin_service import halt_procurement, resume_procurement, get_alerts

router = APIRouter(prefix="/admin", tags=["Admin"])


class HaltRequest(BaseModel):
    reason: str = Field(default="Rain / Weather Delay", description="Reason for halting procurement")
    from_time: str = Field(default="00:00", description="Cutoff time from which bookings are halted")


@router.post("/halt", summary="Halt mandi procurement")
def halt_api(req: HaltRequest, db: Session = Depends(get_db)):
    return halt_procurement(db, reason=req.reason, from_time=req.from_time)


@router.post("/resume", summary="Resume mandi procurement")
def resume_api(db: Session = Depends(get_db)):
    return resume_procurement(db)


@router.get("/alerts", summary="Get reschedule alerts")
@router.get("/notifications", summary="Get notifications")
def alerts_api(db: Session = Depends(get_db)):
    return get_alerts(db)