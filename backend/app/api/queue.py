from typing import Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.queue_service import (
    get_live_queue,
    call_next_to_bay,
    assign_farmer_to_bay,
    update_queue_status,
)

router = APIRouter(prefix="/queue", tags=["Queue"])


class QueueUpdateRequest(BaseModel):
    token_number: int = Field(..., description="Token number to update")
    status: str = Field(..., description="New status, e.g. SERVED or NO_SHOW")


class CallNextRequest(BaseModel):
    bay_number: int = Field(default=1, description="Weighbridge Bay number to assign (1 or 2)")


class AssignBayRequest(BaseModel):
    token_number: int = Field(..., description="Farmer token number")
    bay_number: int = Field(..., description="Target Weighbridge Bay (1 or 2)")


@router.get("", summary="Get queue")
@router.get("/live", summary="Get live queue")
def live_queue_api(db: Session = Depends(get_db)):
    return get_live_queue(db)


@router.post("/call-next", summary="Call next waiting farmer to weighbridge bay")
def call_next_api(req: CallNextRequest, db: Session = Depends(get_db)):
    return call_next_to_bay(db, req.bay_number)


@router.post("/assign-bay", summary="Assign specific token to weighbridge bay")
def assign_bay_api(req: AssignBayRequest, db: Session = Depends(get_db)):
    return assign_farmer_to_bay(db, req.token_number, req.bay_number)


@router.post("/update", summary="Update farmer queue status")
def update_queue_api(req: QueueUpdateRequest, db: Session = Depends(get_db)):
    return update_queue_status(db, req.token_number, req.status)