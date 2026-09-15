"""fairprocure_layer_architecture

Revision ID: 156e40c1f773
Revises: 3f8b92c10a4e
Create Date: 2026-09-12 22:29:33.422088

"""
import uuid
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '156e40c1f773'
down_revision: Union[str, None] = '3f8b92c10a4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # 1. Create qr_tokens Table (Permanent Farmer QR Identity)
    # ---------------------------------------------------------
    op.create_table(
        'qr_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('farmers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('qr_code', sa.String(length=255), nullable=False),
        sa.Column('qr_hash', sa.String(length=128), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('generated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_scanned_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('farmer_id', name='uq_qr_tokens_farmer_id'),
        sa.UniqueConstraint('qr_code', name='uq_qr_tokens_qr_code'),
    )
    op.create_index(op.f('ix_qr_tokens_farmer_id'), 'qr_tokens', ['farmer_id'], unique=True)
    op.create_index(op.f('ix_qr_tokens_qr_code'), 'qr_tokens', ['qr_code'], unique=True)
    op.create_index(op.f('ix_qr_tokens_qr_hash'), 'qr_tokens', ['qr_hash'], unique=False)
    op.create_index(op.f('ix_qr_tokens_status'), 'qr_tokens', ['status'], unique=False)

    # ---------------------------------------------------------
    # 2. Create procurement_events Table (Procurement Lifecycle)
    # ---------------------------------------------------------
    op.create_table(
        'procurement_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('farmers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='SET NULL'), nullable=True),
        sa.Column('queue_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tokens.id', ondelete='SET NULL'), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='INITIATED'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_procurement_events_farmer_id'), 'procurement_events', ['farmer_id'], unique=False)
    op.create_index(op.f('ix_procurement_events_booking_id'), 'procurement_events', ['booking_id'], unique=False)
    op.create_index(op.f('ix_procurement_events_queue_id'), 'procurement_events', ['queue_id'], unique=False)
    op.create_index(op.f('ix_procurement_events_status'), 'procurement_events', ['status'], unique=False)

    # ---------------------------------------------------------
    # 3. Create system_policies Table (Configurable Rules)
    # ---------------------------------------------------------
    op.create_table(
        'system_policies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('policy_key', sa.String(length=100), nullable=False, unique=True),
        sa.Column('policy_value', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_system_policies_policy_key'), 'system_policies', ['policy_key'], unique=True)
    op.create_index(op.f('ix_system_policies_is_active'), 'system_policies', ['is_active'], unique=False)

    # Seed initial government/APMC system policies
    system_policies = sa.table(
        'system_policies',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('policy_key', sa.String),
        sa.column('policy_value', sa.String),
        sa.column('description', sa.Text),
        sa.column('is_active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime),
    )
    now = datetime.utcnow()
    op.bulk_insert(
        system_policies,
        [
            {
                'id': uuid.uuid4(),
                'policy_key': 'arrival_buffer_minutes',
                'policy_value': '30',
                'description': 'Permissible arrival window buffer in minutes before/after scheduled time slot',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': uuid.uuid4(),
                'policy_key': 'qr_required',
                'policy_value': 'true',
                'description': 'Enforce mandatory permanent QR identity scan at APMC inbound gate',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': uuid.uuid4(),
                'policy_key': 'override_requires_supervisor',
                'policy_value': 'true',
                'description': 'Mandate supervisor credentials and cryptographic signature for out-of-turn overrides',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': uuid.uuid4(),
                'policy_key': 'max_daily_procurement',
                'policy_value': '500',
                'description': 'Maximum procurement quantity cap in quintals per farmer per operational day',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
        ]
    )

    # ---------------------------------------------------------
    # 4. Evolve override_requests Table with FairProcure Fields
    # ---------------------------------------------------------
    op.add_column('override_requests', sa.Column('farmer_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_override_requests_farmer_id',
        'override_requests',
        'farmers',
        ['farmer_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_override_requests_farmer_id'), 'override_requests', ['farmer_id'], unique=False)
    op.add_column('override_requests', sa.Column('approved_by', sa.String(length=100), nullable=True))
    op.add_column('override_requests', sa.Column('approval_status', sa.String(length=30), server_default='PENDING', nullable=False))
    op.create_index(op.f('ix_override_requests_approval_status'), 'override_requests', ['approval_status'], unique=False)
    op.add_column('override_requests', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('override_requests', sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

    # Allow nullable legacy fields so new FairProcure overrides can be created via farmer_id/booking_id
    op.alter_column('override_requests', 'token_number', nullable=True)
    op.alter_column('override_requests', 'farmer_name', nullable=True)
    op.alter_column('override_requests', 'authorized_by', nullable=True)

    # Synchronize existing override records
    op.execute(
        """
        UPDATE override_requests o
        SET farmer_id = b.farmer_id,
            approved_by = o.authorized_by,
            approval_status = CASE 
                WHEN o.status = 'AUTHORIZED' THEN 'APPROVED' 
                WHEN o.status = 'REJECTED' THEN 'REJECTED' 
                ELSE 'PENDING' 
            END,
            approved_at = o.created_at,
            updated_at = o.created_at
        FROM bookings b
        WHERE o.booking_id = b.id
        """
    )

    # ---------------------------------------------------------
    # 5. Evolve audit_logs Table with Structured JSON & Entities
    # ---------------------------------------------------------
    op.add_column('audit_logs', sa.Column('entity_type', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.add_column('audit_logs', sa.Column('entity_id', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_audit_logs_entity_id'), 'audit_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.add_column('audit_logs', sa.Column('old_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('audit_logs', sa.Column('new_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('audit_logs', sa.Column('remarks', sa.Text(), nullable=True))
    op.alter_column('audit_logs', 'details', nullable=True)

    # Backfill remarks from existing details where present
    op.execute("UPDATE audit_logs SET remarks = details WHERE details IS NOT NULL AND remarks IS NULL")


def downgrade() -> None:
    # Downgrade audit_logs additions
    op.execute("UPDATE audit_logs SET details = COALESCE(remarks, action, 'Audit event') WHERE details IS NULL")
    op.alter_column('audit_logs', 'details', nullable=False)
    op.drop_column('audit_logs', 'remarks')
    op.drop_column('audit_logs', 'new_value')
    op.drop_column('audit_logs', 'old_value')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_id'), table_name='audit_logs')
    op.drop_column('audit_logs', 'entity_id')
    op.drop_index(op.f('ix_audit_logs_entity_type'), table_name='audit_logs')
    op.drop_column('audit_logs', 'entity_type')

    # Downgrade override_requests additions
    op.execute("UPDATE override_requests SET authorized_by = COALESCE(approved_by, requested_by, 'System Supervisor') WHERE authorized_by IS NULL")
    op.execute("UPDATE override_requests SET farmer_name = 'Farmer' WHERE farmer_name IS NULL")
    op.execute("UPDATE override_requests SET token_number = 0 WHERE token_number IS NULL")
    op.alter_column('override_requests', 'authorized_by', nullable=False)
    op.alter_column('override_requests', 'farmer_name', nullable=False)
    op.alter_column('override_requests', 'token_number', nullable=False)
    op.drop_column('override_requests', 'updated_at')
    op.drop_column('override_requests', 'approved_at')
    op.drop_index(op.f('ix_override_requests_approval_status'), table_name='override_requests')
    op.drop_column('override_requests', 'approval_status')
    op.drop_column('override_requests', 'approved_by')
    op.drop_index(op.f('ix_override_requests_farmer_id'), table_name='override_requests')
    op.drop_constraint('fk_override_requests_farmer_id', 'override_requests', type_='foreignkey')
    op.drop_column('override_requests', 'farmer_id')

    # Drop system_policies
    op.drop_index(op.f('ix_system_policies_is_active'), table_name='system_policies')
    op.drop_index(op.f('ix_system_policies_policy_key'), table_name='system_policies')
    op.drop_table('system_policies')

    # Drop procurement_events
    op.drop_index(op.f('ix_procurement_events_status'), table_name='procurement_events')
    op.drop_index(op.f('ix_procurement_events_queue_id'), table_name='procurement_events')
    op.drop_index(op.f('ix_procurement_events_booking_id'), table_name='procurement_events')
    op.drop_index(op.f('ix_procurement_events_farmer_id'), table_name='procurement_events')
    op.drop_table('procurement_events')

    # Drop qr_tokens
    op.drop_index(op.f('ix_qr_tokens_status'), table_name='qr_tokens')
    op.drop_index(op.f('ix_qr_tokens_qr_hash'), table_name='qr_tokens')
    op.drop_index(op.f('ix_qr_tokens_qr_code'), table_name='qr_tokens')
    op.drop_index(op.f('ix_qr_tokens_farmer_id'), table_name='qr_tokens')
    op.drop_table('qr_tokens')
