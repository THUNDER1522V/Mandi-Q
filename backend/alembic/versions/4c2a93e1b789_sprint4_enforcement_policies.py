"""sprint4_enforcement_policies

Revision ID: 4c2a93e1b789
Revises: 0a8d1440ec18
Create Date: 2026-09-12 23:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c2a93e1b789'
down_revision: Union[str, None] = '0a8d1440ec18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add ip_address column to audit_logs
    op.add_column('audit_logs', sa.Column('ip_address', sa.String(45), nullable=True))

    # 2. Seed Sprint 4 enforcement policies into system_policies if missing
    bind = op.get_bind()
    policies_to_seed = [
        ('slot_grace_period', '15', 'INTEGER', 'Grace period in minutes after scheduled slot end before marked as late'),
        ('late_arrival_limit', '60', 'INTEGER', 'Maximum late arrival limit in minutes after slot before requiring supervisor override'),
        ('queue_reorder_allowed', 'false', 'BOOLEAN', 'Whether out-of-turn queue reordering is permitted without supervisor override'),
        ('supervisor_pin', '1234', 'STRING', 'Master PIN for supervisor override authorization'),
    ]

    for key, val, dt, desc in policies_to_seed:
        bind.execute(
            sa.text(
                """
                INSERT INTO system_policies (id, policy_key, policy_value, data_type, description, is_active, created_at, updated_at)
                SELECT gen_random_uuid(), :key, :val, :dt, :desc, TRUE, NOW(), NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM system_policies WHERE policy_key = :key
                )
                """
            ),
            {"key": key, "val": val, "dt": dt, "desc": desc},
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            DELETE FROM system_policies
            WHERE policy_key IN ('slot_grace_period', 'late_arrival_limit', 'queue_reorder_allowed', 'supervisor_pin')
            """
        )
    )
    op.drop_column('audit_logs', 'ip_address')
