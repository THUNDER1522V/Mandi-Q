"""Initial schema for MANDIQ platform

Revision ID: 2751d6547dd3
Revises: 
Create Date: 2026-09-12 04:52:32.057052
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2751d6547dd3'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Farmers table
    op.create_table(
        'farmers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('farmer_name', sa.String(length=100), nullable=False),
        sa.Column('phone_number', sa.String(length=15), nullable=False),
        sa.Column('village', sa.String(length=100), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('preferred_language', sa.String(length=30), nullable=False, server_default='Hindi'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_farmers_phone_number', 'farmers', ['phone_number'], unique=True)

    # 2. Commodities table
    op.create_table(
        'commodities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('commodity_name', sa.String(length=100), nullable=False, unique=True),
        sa.Column('minimum_support_price', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False, server_default='Quintal'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # 3. Bookings table
    op.create_table(
        'bookings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('farmers.id'), nullable=False),
        sa.Column('commodity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('commodities.id'), nullable=False),
        sa.Column('booking_date', sa.DateTime(), nullable=False),
        sa.Column('booking_slot', sa.String(length=30), nullable=False),
        sa.Column('estimated_quantity', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='Booked'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('estimated_quantity > 0', name='ck_estimated_quantity_positive'),
    )
    op.create_index('ix_bookings_booking_date', 'bookings', ['booking_date'])
    op.create_index('ix_bookings_status', 'bookings', ['status'])

    # 4. Tokens table
    op.create_table(
        'tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id'), nullable=False),
        sa.Column('token_number', sa.Integer(), nullable=False),
        sa.Column('queue_position', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='Waiting'),
        sa.Column('estimated_arrival', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_tokens_token_number', 'tokens', ['token_number'], unique=True)
    op.create_index('ix_tokens_queue_position', 'tokens', ['queue_position'])

    # 5. Procurements table
    op.create_table(
        'procurements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id'), nullable=False),
        sa.Column('actual_quantity', sa.Float(), nullable=False),
        sa.Column('quality_grade', sa.String(length=20), nullable=False),
        sa.Column('final_price', sa.Float(), nullable=False),
        sa.Column('procurement_status', sa.String(length=20), nullable=False, server_default='Completed'),
        sa.Column('procured_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('actual_quantity >= 0', name='ck_actual_quantity_positive'),
    )

    # 6. Voice Calls table
    op.create_table(
        'voice_calls',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('farmers.id'), nullable=False),
        sa.Column('call_sid', sa.String(length=100), nullable=False),
        sa.Column('language', sa.String(length=30), nullable=False),
        sa.Column('intent', sa.String(length=100), nullable=False),
        sa.Column('transcript', sa.Text(), nullable=False),
        sa.Column('call_status', sa.String(length=30), nullable=False, server_default='Completed'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_voice_calls_call_sid', 'voice_calls', ['call_sid'], unique=True)

    # 7. Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('farmers.id'), nullable=False),
        sa.Column('phone', sa.String(length=15), nullable=False),
        sa.Column('channel', sa.String(length=10), nullable=False, server_default='SMS'),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('reason', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='QUEUED'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_notifications_phone', 'notifications', ['phone'])
    op.create_index('ix_notifications_status', 'notifications', ['status'])

    # 8. Audit Logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('performed_by', sa.String(length=100), nullable=False),
        sa.Column('details', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # 9. System State table
    op.create_table(
        'system_state',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('is_halted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('halt_reason', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('system_state')
    op.drop_table('audit_logs')
    op.drop_index('ix_notifications_status', table_name='notifications')
    op.drop_index('ix_notifications_phone', table_name='notifications')
    op.drop_table('notifications')
    op.drop_index('ix_voice_calls_call_sid', table_name='voice_calls')
    op.drop_table('voice_calls')
    op.drop_table('procurements')
    op.drop_index('ix_tokens_queue_position', table_name='tokens')
    op.drop_index('ix_tokens_token_number', table_name='tokens')
    op.drop_table('tokens')
    op.drop_index('ix_bookings_status', table_name='bookings')
    op.drop_index('ix_bookings_booking_date', table_name='bookings')
    op.drop_table('bookings')
    op.drop_table('commodities')
    op.drop_index('ix_farmers_phone_number', table_name='farmers')
    op.drop_table('farmers')
