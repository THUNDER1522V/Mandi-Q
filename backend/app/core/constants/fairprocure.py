"""FairProcure domain constants.
Defines all default policy keys, audit actions, entity types, and operational thresholds.
"""

# =====================================================================
# System Policy Keys
# =====================================================================
POLICY_ARRIVAL_BUFFER_MINUTES = "arrival_buffer_minutes"
POLICY_QR_REQUIRED = "qr_required"
POLICY_OVERRIDE_REQUIRES_SUPERVISOR = "override_requires_supervisor"
POLICY_MAX_DAILY_PROCUREMENT = "max_daily_procurement"
POLICY_SLOT_GRACE_PERIOD = "slot_grace_period"
POLICY_LATE_ARRIVAL_LIMIT = "late_arrival_limit"
POLICY_QUEUE_REORDER_ALLOWED = "queue_reorder_allowed"
POLICY_SUPERVISOR_PIN = "supervisor_pin"

DEFAULT_POLICIES = {
    POLICY_ARRIVAL_BUFFER_MINUTES: {
        "value": "30",
        "type": "INTEGER",
        "description": "Permissible arrival window buffer in minutes before/after scheduled time slot",
    },
    POLICY_QR_REQUIRED: {
        "value": "true",
        "type": "BOOLEAN",
        "description": "Enforce mandatory permanent QR identity scan at APMC inbound gate",
    },
    POLICY_OVERRIDE_REQUIRES_SUPERVISOR: {
        "value": "true",
        "type": "BOOLEAN",
        "description": "Mandate supervisor credentials and cryptographic signature for out-of-turn overrides",
    },
    POLICY_MAX_DAILY_PROCUREMENT: {
        "value": "500",
        "type": "INTEGER",
        "description": "Maximum procurement quantity cap in quintals per farmer per operational day",
    },
    POLICY_SLOT_GRACE_PERIOD: {
        "value": "15",
        "type": "INTEGER",
        "description": "Grace period in minutes after scheduled slot end before marked as late",
    },
    POLICY_LATE_ARRIVAL_LIMIT: {
        "value": "60",
        "type": "INTEGER",
        "description": "Maximum late arrival limit in minutes after slot before requiring supervisor override",
    },
    POLICY_QUEUE_REORDER_ALLOWED: {
        "value": "false",
        "type": "BOOLEAN",
        "description": "Whether out-of-turn queue reordering is permitted without supervisor override",
    },
    POLICY_SUPERVISOR_PIN: {
        "value": "1234",
        "type": "STRING",
        "description": "Master PIN for supervisor override authorization",
    },
}

# =====================================================================
# Audit Actions
# =====================================================================
AUDIT_QR_SCANNED = "QR_SCANNED"
AUDIT_QR_GENERATED = "QR_GENERATED"
AUDIT_QR_VERIFIED = "QR_VERIFIED"
AUDIT_QR_FAILED = "QR_FAILED"
AUDIT_QR_REGENERATED = "QR_REGENERATED"
AUDIT_QR_REVOKED = "QR_REVOKED"
AUDIT_OVERRIDE_REQUESTED = "OVERRIDE_REQUESTED"
AUDIT_OVERRIDE_APPROVED = "OVERRIDE_APPROVED"
AUDIT_OVERRIDE_REJECTED = "OVERRIDE_REJECTED"
AUDIT_PROCUREMENT_STARTED = "PROCUREMENT_STARTED"
AUDIT_PROCUREMENT_COMPLETED = "PROCUREMENT_COMPLETED"
AUDIT_QUEUE_STATUS_CHANGED = "QUEUE_STATUS_CHANGED"
AUDIT_POLICY_UPDATED = "POLICY_UPDATED"
AUDIT_FAIRPROCURE_EARLY_OVERRIDE = "FAIRPROCURE_EARLY_OVERRIDE"
AUDIT_QUEUE_ENTERED = "QUEUE_ENTERED"
AUDIT_QUEUE_SKIPPED = "QUEUE_SKIPPED"
AUDIT_RULE_ENGINE_DENIED = "RULE_ENGINE_DENIED"
AUDIT_DUPLICATE_PROCUREMENT_ATTEMPT = "DUPLICATE_PROCUREMENT_ATTEMPT"
AUDIT_POLICY_VIOLATION = "POLICY_VIOLATION"
AUDIT_SUPERVISOR_APPROVAL_PENDING = "SUPERVISOR_APPROVAL_PENDING"

# =====================================================================
# Entity Types for Audit & Tracking
# =====================================================================
ENTITY_FARMER = "FARMER"
ENTITY_BOOKING = "BOOKING"
ENTITY_QUEUE = "QUEUE"
ENTITY_QR_TOKEN = "QR_TOKEN"
ENTITY_PROCUREMENT_EVENT = "PROCUREMENT_EVENT"
ENTITY_OVERRIDE_REQUEST = "OVERRIDE_REQUEST"
ENTITY_SYSTEM_POLICY = "SYSTEM_POLICY"

# =====================================================================
# Operational Defaults & Magic Numbers
# =====================================================================
DEFAULT_ARRIVAL_BUFFER_MINUTES = 30
DEFAULT_MAX_DAILY_PROCUREMENT_QUINTALS = 500.0
DEFAULT_SLOT_GRACE_PERIOD_MINUTES = 15
DEFAULT_LATE_ARRIVAL_LIMIT_MINUTES = 60
DEFAULT_QUEUE_REORDER_ALLOWED = False
DEFAULT_SUPERVISOR_PIN = "1234"
DEFAULT_QR_VERSION = 1
DEFAULT_GATE_DEVICE_ID = "GATE-TERMINAL-01"
DEFAULT_SUPERVISOR_ROLE = "APMC Mandi Secretary"
DEFAULT_GATE_OFFICER_ROLE = "Gate Security Officer"
