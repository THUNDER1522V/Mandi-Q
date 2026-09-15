"""FairProcure domain enums.
Centralizes all enumeration types to guarantee type-safety and avoid hardcoded literals.
"""
from enum import Enum


class QRStatus(str, Enum):
    """Lifecycle status for a farmer's permanent QR token identity."""
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"
    SUSPENDED = "suspended"


class ProcurementStatus(str, Enum):
    """End-to-end procurement lifecycle milestones."""
    ARRIVED = "ARRIVED"
    QR_VERIFIED = "QR_VERIFIED"
    QUEUE_ENTERED = "QUEUE_ENTERED"
    WAITING = "WAITING"
    WEIGHMENT_STARTED = "WEIGHMENT_STARTED"
    WEIGHMENT_COMPLETED = "WEIGHMENT_COMPLETED"
    PROCUREMENT_STARTED = "PROCUREMENT_STARTED"
    PROCUREMENT_COMPLETED = "PROCUREMENT_COMPLETED"
    PAYMENT_INITIATED = "PAYMENT_INITIATED"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    EXITED = "EXITED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"
    # Legacy backward compatibility
    INITIATED = "INITIATED"


class OverrideStatus(str, Enum):
    """Approval lifecycle status for exceptional early intake override requests."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class ApprovalMethod(str, Enum):
    """Authorization verification method used by supervisor for override approval."""
    PIN = "PIN"
    OTP = "OTP"
    QR = "QR"
    BIOMETRIC = "BIOMETRIC"
    SYSTEM = "SYSTEM"


class PolicyDataType(str, Enum):
    """Data type of system policy values for deterministic parsing."""
    STRING = "STRING"
    INTEGER = "INTEGER"
    BOOLEAN = "BOOLEAN"
    FLOAT = "FLOAT"


class RuleDecision(str, Enum):
    """Rule Engine verdict evaluated upon QR verification."""
    ALLOW = "ALLOW"
    DENY = "DENY"
    OVERRIDE_REQUIRED = "OVERRIDE_REQUIRED"

