"""fairprocure_enterprise_refinement

Revision ID: 8ea727dd4d6c
Revises: 156e40c1f773
Create Date: 2026-09-12 23:05:44.594992

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ea727dd4d6c'
down_revision: Union[str, None] = '156e40c1f773'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # 1. QRToken Enterprise Improvements
    # ---------------------------------------------------------
    op.add_column('qr_tokens', sa.Column('version', sa.Integer(), server_default='1', nullable=False))
    op.add_column('qr_tokens', sa.Column('verification_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('qr_tokens', sa.Column('last_verified_by', sa.String(length=100), nullable=True))
    op.add_column('qr_tokens', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    op.create_index(op.f('ix_qr_tokens_is_active'), 'qr_tokens', ['is_active'], unique=False)
    op.create_index(op.f('ix_qr_tokens_created_at'), 'qr_tokens', ['created_at'], unique=False)

    # ---------------------------------------------------------
    # 2. AuditLog Enterprise Hardware Device Tracking
    # ---------------------------------------------------------
    op.add_column('audit_logs', sa.Column('device_id', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_audit_logs_device_id'), 'audit_logs', ['device_id'], unique=False)

    # ---------------------------------------------------------
    # 3. OverrideRequest Multi-Method Authorization
    # ---------------------------------------------------------
    op.add_column('override_requests', sa.Column('approval_method', sa.String(length=20), server_default='PIN', nullable=False))
    op.create_index(op.f('ix_override_requests_approval_method'), 'override_requests', ['approval_method'], unique=False)
    op.create_index(op.f('ix_override_requests_created_at'), 'override_requests', ['created_at'], unique=False)

    # ---------------------------------------------------------
    # 4. SystemPolicy Data Type Discriminator
    # ---------------------------------------------------------
    op.add_column('system_policies', sa.Column('data_type', sa.String(length=20), server_default='STRING', nullable=False))
    op.create_index(op.f('ix_system_policies_data_type'), 'system_policies', ['data_type'], unique=False)

    # Populate explicit data types for seeded policies
    op.execute(
        """
        UPDATE system_policies SET data_type = 'INTEGER' WHERE policy_key = 'arrival_buffer_minutes';
        UPDATE system_policies SET data_type = 'BOOLEAN' WHERE policy_key = 'qr_required';
        UPDATE system_policies SET data_type = 'BOOLEAN' WHERE policy_key = 'override_requires_supervisor';
        UPDATE system_policies SET data_type = 'INTEGER' WHERE policy_key = 'max_daily_procurement';
        """
    )

    # ---------------------------------------------------------
    # 5. ProcurementEvent Performance Timeline Index
    # ---------------------------------------------------------
    op.create_index(op.f('ix_procurement_events_created_at'), 'procurement_events', ['created_at'], unique=False)


def downgrade() -> None:
    # 5. Drop ProcurementEvent index
    op.drop_index(op.f('ix_procurement_events_created_at'), table_name='procurement_events')

    # 4. Drop SystemPolicy data_type
    op.drop_index(op.f('ix_system_policies_data_type'), table_name='system_policies')
    op.drop_column('system_policies', 'data_type')

    # 3. Drop OverrideRequest additions
    op.drop_index(op.f('ix_override_requests_created_at'), table_name='override_requests')
    op.drop_index(op.f('ix_override_requests_approval_method'), table_name='override_requests')
    op.drop_column('override_requests', 'approval_method')

    # 2. Drop AuditLog additions
    op.drop_index(op.f('ix_audit_logs_device_id'), table_name='audit_logs')
    op.drop_column('audit_logs', 'device_id')

    # 1. Drop QRToken additions
    op.drop_index(op.f('ix_qr_tokens_created_at'), table_name='qr_tokens')
    op.drop_index(op.f('ix_qr_tokens_is_active'), table_name='qr_tokens')
    op.drop_column('qr_tokens', 'is_active')
    op.drop_column('qr_tokens', 'last_verified_by')
    op.drop_column('qr_tokens', 'verification_count')
    op.drop_column('qr_tokens', 'version')
