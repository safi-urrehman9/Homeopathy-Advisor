"""add compact patient ai summary

Revision ID: 0002_patient_ai_summary
Revises: 0001_initial
Create Date: 2026-05-02 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_patient_ai_summary"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("ai_summary", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "ai_summary")
