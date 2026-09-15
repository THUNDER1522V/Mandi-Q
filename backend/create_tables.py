from app.database.connection import engine
from app.database.base import Base

from app.models import (
    Farmer,
    Commodity,
    Booking,
    Token,
    Procurement,
    VoiceCall,
    Notification,
    AuditLog,
    SystemState,
    WeighbridgeBay,
    ActivityLog,
    OverrideRequest,
    QRToken,
    ProcurementEvent,
    SystemPolicy,
)

print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("Done.")