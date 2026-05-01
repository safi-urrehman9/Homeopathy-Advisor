"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "doctors",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("photo_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "patients",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("gender", sa.String(length=64), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("history", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_patients_doctor_id"), "patients", ["doctor_id"], unique=False)
    op.create_table(
        "appointments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=128), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("patient_name", sa.String(length=255), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appointments_date"), "appointments", ["date"], unique=False)
    op.create_index(op.f("ix_appointments_doctor_id"), "appointments", ["doctor_id"], unique=False)
    op.create_table(
        "consultations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=128), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("symptoms", sa.Text(), nullable=False),
        sa.Column("repertorization", sa.Text(), nullable=True),
        sa.Column("prescribed_remedy", sa.String(length=255), nullable=True),
        sa.Column("potency", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_consultations_doctor_id"), "consultations", ["doctor_id"], unique=False)
    op.create_index(op.f("ix_consultations_patient_id"), "consultations", ["patient_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_consultations_patient_id"), table_name="consultations")
    op.drop_index(op.f("ix_consultations_doctor_id"), table_name="consultations")
    op.drop_table("consultations")
    op.drop_index(op.f("ix_appointments_doctor_id"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_date"), table_name="appointments")
    op.drop_table("appointments")
    op.drop_index(op.f("ix_patients_doctor_id"), table_name="patients")
    op.drop_table("patients")
    op.drop_table("doctors")
