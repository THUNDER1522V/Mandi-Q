from fastapi import APIRouter

from . import farmer
from . import bookings
from . import queue
from . import dashboard
from . import analytics
from . import admin
from . import voice
from . import activity
from . import weighbridge
from . import fairprocure
from . import qr
from . import procurement
from .admin import halt_api, resume_api, alerts_api
from .queue import call_next_api, assign_bay_api, update_queue_api
from .activity import get_activity_logs_api, get_audit_events_api
from .procurement import start_procurement_api

api_router = APIRouter(prefix="/api/v1")

# Standard modular sub-routers under /api/v1
api_router.include_router(farmer.router)
api_router.include_router(bookings.router)
api_router.include_router(queue.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(admin.router)
api_router.include_router(voice.router)
api_router.include_router(activity.router)
api_router.include_router(weighbridge.router)
api_router.include_router(fairprocure.router)
api_router.include_router(qr.router)
api_router.include_router(procurement.router)

# Direct aliases for clean REST API access:
api_router.add_api_route("/halt", halt_api, methods=["POST"], tags=["Admin"], summary="Direct alias: Halt mandi")
api_router.add_api_route("/resume", resume_api, methods=["POST"], tags=["Admin"], summary="Direct alias: Resume mandi")
api_router.add_api_route("/alerts", alerts_api, methods=["GET"], tags=["Admin"], summary="Direct alias: Get alerts")
api_router.add_api_route("/dashboard/qr-metrics", qr.get_qr_dashboard_metrics_api, methods=["GET"], tags=["Dashboard"], summary="Direct alias: Get QR verification metrics for dashboard")
api_router.add_api_route("/fairprocure/procurement/start", start_procurement_api, methods=["POST"], tags=["FairProcure Procurement"], summary="Direct alias: Start procurement")