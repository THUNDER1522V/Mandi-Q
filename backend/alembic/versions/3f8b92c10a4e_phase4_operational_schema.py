"""phase4_operational_schema

Revision ID: 3f8b92c10a4e
Revises: 2751d6547dd3
Create Date: 2026-09-12 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3f8b92c10a4e'
down_revision: Union[str, None] = '2751d6547dd3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Operational columns on bookings
    op.add_column('bookings', sa.Column('bay_number', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_bookings_bay_number'), 'bookings', ['bay_number'], unique=False)
    op.add_column('bookings', sa.Column('vehicle_type', sa.String(length=50), server_default='Tractor Trolley', nullable=True))
    op.add_column('bookings', sa.Column('vehicle_number', sa.String(length=30), nullable=True))
    op.add_column('bookings', sa.Column('booked_via', sa.String(length=50), server_default='Voice (Sarvam AI)', nullable=True))
    op.add_column('bookings', sa.Column('booking_timestamp', sa.String(length=20), server_default='08:00 AM', nullable=True))
    op.add_column('bookings', sa.Column('served_at', sa.DateTime(), nullable=True))
    op.add_column('bookings', sa.Column('moisture_pct', sa.Float(), nullable=True))
    op.add_column('bookings', sa.Column('gross_weight_kg', sa.Float(), nullable=True))
    op.add_column('bookings', sa.Column('tare_weight_kg', sa.Float(), nullable=True))
    op.add_column('bookings', sa.Column('net_weight_quintals', sa.Float(), nullable=True))
    op.add_column('bookings', sa.Column('payment_status', sa.String(length=30), server_default='PENDING', nullable=True))
    op.add_column('bookings', sa.Column('payment_amount', sa.Float(), nullable=True))
    op.add_column('bookings', sa.Column('payment_reference', sa.String(length=60), nullable=True))
    op.add_column('bookings', sa.Column('payment_time', sa.String(length=20), nullable=True))
    op.add_column('bookings', sa.Column('notes', sa.Text(), nullable=True))

    # 2. Table weighbridge_bays
    op.create_table(
        'weighbridge_bays',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('bay_number', sa.Integer(), nullable=False),
        sa.Column('bay_name', sa.String(length=100), nullable=False),
        sa.Column('scale_type', sa.String(length=100), nullable=False, server_default='Gross / Tare Electronic Scale'),
        sa.Column('capacity_tons', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('operator_name', sa.String(length=100), nullable=False, server_default='APMC Weighbridge Officer'),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='READY'),
        sa.Column('current_token', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('bay_number')
    )
    op.create_index(op.f('ix_weighbridge_bays_bay_number'), 'weighbridge_bays', ['bay_number'], unique=True)

    # 3. Table activity_logs
    op.create_table(
        'activity_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('event_type', sa.String(length=30), nullable=False, server_default='system'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_logs_event_type'), 'activity_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_activity_logs_created_at'), 'activity_logs', ['created_at'], unique=False)

    # 4. Table override_requests (FairProcure)
    op.create_table(
        'override_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('token_number', sa.Integer(), nullable=False),
        sa.Column('farmer_name', sa.String(length=100), nullable=False),
        sa.Column('requested_by', sa.String(length=100), nullable=False, server_default='Gate Security Officer'),
        sa.Column('authorized_by', sa.String(length=100), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('qr_hash', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='AUTHORIZED'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_override_requests_token_number'), 'override_requests', ['token_number'], unique=False)


def downgrade() -> None:
    op.drop_table('override_requests')
    op.drop_table('activity_logs')
    op.drop_table('weighbridge_bays')

    op.drop_index(op.f('ix_bookings_bay_number'), table_name='bookings')
    op.drop_column('bookings', 'notes')
    op.drop_column('bookings', 'payment_time')
    op.drop_column('bookings', 'payment_reference')
    op.drop_column('bookings', 'payment_amount')
    op.drop_column('bookings', 'payment_status')
    op.drop_column('bookings', 'net_weight_quintals')
    op.drop_column('bookings', 'tare_weight_kg')
    op.drop_column('bookings', 'gross_weight_kg')
    op.drop_column('bookings', 'moisture_pct')
    op.drop_column('bookings', 'served_at')
    op.drop_column('bookings', 'booking_timestamp')
    op.drop_column('bookings', 'booked_via')
    op.drop_column('bookings', 'vehicle_number')
    op.drop_column('bookings', 'vehicle_type')
    op.drop_column('bookings', 'bay_number')
