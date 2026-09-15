"""qr_token_history_support

Revision ID: 0a8d1440ec18
Revises: 8ea727dd4d6c
Create Date: 2026-09-12 23:17:30.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a8d1440ec18'
down_revision: Union[str, None] = '8ea727dd4d6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop strict 1-to-1 unique constraint to allow historical regenerated QR records
    op.drop_constraint('uq_qr_tokens_farmer_id', 'qr_tokens', type_='unique')
    op.drop_index('ix_qr_tokens_farmer_id', table_name='qr_tokens')

    # Non-unique index for farmer lookup
    op.create_index('ix_qr_tokens_farmer_id', 'qr_tokens', ['farmer_id'], unique=False)

    # Partial unique index ensuring exactly ONE active QR token per farmer
    op.create_index(
        'uq_qr_tokens_active_farmer',
        'qr_tokens',
        ['farmer_id'],
        unique=True,
        postgresql_where=sa.text('is_active = TRUE'),
    )

    # Composite index for versioned lookups
    op.create_index('ix_qr_tokens_farmer_version', 'qr_tokens', ['farmer_id', 'version'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_qr_tokens_farmer_version', table_name='qr_tokens')
    op.drop_index('uq_qr_tokens_active_farmer', table_name='qr_tokens')
    op.drop_index('ix_qr_tokens_farmer_id', table_name='qr_tokens')

    # Keep only the latest active QR per farmer before restoring unique constraint
    op.execute(
        """
        DELETE FROM qr_tokens
        WHERE id NOT IN (
            SELECT id FROM (
                SELECT DISTINCT ON (farmer_id) id
                FROM qr_tokens
                ORDER BY farmer_id, version DESC, created_at DESC
            ) sub
        )
        """
    )

    op.create_index('ix_qr_tokens_farmer_id', 'qr_tokens', ['farmer_id'], unique=True)
    op.create_unique_constraint('uq_qr_tokens_farmer_id', 'qr_tokens', ['farmer_id'])
