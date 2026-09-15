"""FairProcure Policy Service.
Provides type-safe retrieval and administration of configurable APMC government rules.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.enums.fairprocure import PolicyDataType
from app.models.system_policy import SystemPolicy

logger = logging.getLogger("mandiq.fairprocure.policy")


class PolicyService:
    """Enterprise policy manager for reading, casting, and mutating system parameters."""

    def __init__(self, db: Session) -> None:
        """Initialize PolicyService with database session.

        Args:
            db: Active SQLAlchemy database session.
        """
        self.db = db
        logger.debug("PolicyService initialized")

    def get_policy(self, policy_key: str) -> Optional[SystemPolicy]:
        """Retrieves raw policy entity by key.

        Args:
            policy_key: Unique policy string identifier.

        Returns:
            SystemPolicy model or None if not found.
        """
        logger.debug("Fetching system policy: %s", policy_key)
        return (
            self.db.query(SystemPolicy)
            .filter(SystemPolicy.policy_key == policy_key, SystemPolicy.is_active.is_(True))
            .first()
        )

    def get_int(self, policy_key: str, default: int = 0) -> int:
        """Type-safe helper returning policy value cast to integer.

        Args:
            policy_key: Key name in system_policies.
            default: Fallback if policy missing.

        Returns:
            Integer value.
        """
        policy = self.get_policy(policy_key)
        if not policy:
            return default
        try:
            return int(policy.policy_value)
        except (ValueError, TypeError):
            logger.error("Failed to parse policy %s as integer: %s", policy_key, policy.policy_value)
            return default

    def get_bool(self, policy_key: str, default: bool = False) -> bool:
        """Type-safe helper returning policy value cast to boolean.

        Args:
            policy_key: Key name in system_policies.
            default: Fallback if policy missing.

        Returns:
            Boolean value.
        """
        policy = self.get_policy(policy_key)
        if not policy:
            return default
        return policy.policy_value.strip().lower() in ("true", "1", "yes", "on")

    def get_float(self, policy_key: str, default: float = 0.0) -> float:
        """Type-safe helper returning policy value cast to float.

        Args:
            policy_key: Key name in system_policies.
            default: Fallback if policy missing.

        Returns:
            Float value.
        """
        policy = self.get_policy(policy_key)
        if not policy:
            return default
        try:
            return float(policy.policy_value)
        except (ValueError, TypeError):
            logger.error("Failed to parse policy %s as float: %s", policy_key, policy.policy_value)
            return default

    def get_str(self, policy_key: str, default: str = "") -> str:
        """Type-safe helper returning policy value as string.

        Args:
            policy_key: Key name in system_policies.
            default: Fallback if policy missing.

        Returns:
            String value.
        """
        policy = self.get_policy(policy_key)
        return policy.policy_value if policy else default

    def update_policy(
        self,
        policy_key: str,
        new_value: Any,
        performed_by: str = "APMC Secretary",
    ) -> SystemPolicy:
        """Updates a policy value and triggers structured audit logging.

        Args:
            policy_key: Unique key identifier.
            new_value: New value to persist.
            performed_by: Identity of administrator.

        Returns:
            Updated SystemPolicy instance.
        """
        logger.info("Updating policy %s to %s by %s", policy_key, new_value, performed_by)
        # TODO: Persist update, generate AuditLog record, invalidate in-memory cache in Sprint 3
        policy = self.get_policy(policy_key)
        if policy:
            policy.policy_value = str(new_value)
            self.db.commit()
            self.db.refresh(policy)
            return policy
        raise KeyError(f"Policy key '{policy_key}' not found")
