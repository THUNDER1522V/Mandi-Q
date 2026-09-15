from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.fairprocure import FairnessAlertItem, FairnessMetricsResponse
from app.services.dashboard_service import get_dashboard_summary
from app.services.fairprocure.fairness_service import FairnessService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", summary="Get dashboard summary")
def dashboard_summary_api(db: Session = Depends(get_db)):
    return get_dashboard_summary(db)


@router.get(
    "/fairness",
    response_model=FairnessMetricsResponse,
    summary="Get real-time Mandi FairProcure governance telemetry and fairness score (0-100)",
)
def get_dashboard_fairness_api(db: Session = Depends(get_db)):
    svc = FairnessService(db)
    return svc.get_fairness_metrics()


@router.get(
    "/alerts",
    response_model=List[FairnessAlertItem],
    summary="Get real-time FairProcure alerts feed (queue jumps, expired QR, pending overrides, etc.)",
)
def get_dashboard_alerts_api(limit: int = 50, db: Session = Depends(get_db)):
    svc = FairnessService(db)
    return svc.get_live_alerts(limit=limit)