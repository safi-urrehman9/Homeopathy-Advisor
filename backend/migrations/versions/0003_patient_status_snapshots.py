"""add patient status and history snapshots

Revision ID: 0003_patient_status_snapshots
Revises: 0002_patient_ai_summary
Create Date: 2026-05-02 01:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_patient_status_snapshots"
down_revision = "0002_patient_ai_summary"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("status", sa.String(length=32), nullable=False, server_default="active"))
    op.add_column("patients", sa.Column("status_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("patients", sa.Column("healed_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE patients SET status_updated_at = COALESCE(updated_at, created_at)")
    with op.batch_alter_table("patients") as batch_op:
        batch_op.alter_column("status_updated_at", nullable=False)

    op.create_table(
        "patient_history_snapshots",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_patient_history_snapshots_doctor_id"), "patient_history_snapshots", ["doctor_id"], unique=False)
    op.create_index(op.f("ix_patient_history_snapshots_patient_id"), "patient_history_snapshots", ["patient_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_patient_history_snapshots_patient_id"), table_name="patient_history_snapshots")
    op.drop_index(op.f("ix_patient_history_snapshots_doctor_id"), table_name="patient_history_snapshots")
    op.drop_table("patient_history_snapshots")
    op.drop_column("patients", "healed_at")
    op.drop_column("patients", "status_updated_at")
    op.drop_column("patients", "status")
