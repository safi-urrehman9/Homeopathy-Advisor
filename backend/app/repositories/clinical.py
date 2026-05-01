from __future__ import annotations

from sqlalchemy import or_, select

from app.extensions import db
from app.models import Appointment, Consultation, Patient


def get_patient_for_doctor(patient_id: str, doctor_id: str) -> Patient | None:
    return db.session.execute(
        select(Patient).where(Patient.id == patient_id, Patient.doctor_id == doctor_id)
    ).scalar_one_or_none()


def list_patients_for_doctor(doctor_id: str, query_text: str | None = None, limit: int | None = None) -> list[Patient]:
    query = select(Patient).where(Patient.doctor_id == doctor_id)
    if query_text:
        like = f"%{query_text.lower()}%"
        query = query.where(
            or_(
                Patient.name.ilike(like),
                Patient.phone.ilike(like),
                Patient.email.ilike(like),
            )
        )
    query = query.order_by(Patient.created_at.desc())
    if limit:
        query = query.limit(limit)
    return list(db.session.execute(query).scalars())


def list_consultations_for_patient(patient_id: str, doctor_id: str) -> list[Consultation]:
    return list(
        db.session.execute(
            select(Consultation)
            .where(Consultation.patient_id == patient_id, Consultation.doctor_id == doctor_id)
            .order_by(Consultation.created_at.desc())
        ).scalars()
    )


def list_appointments_for_doctor(
    doctor_id: str,
    *,
    start=None,
    end=None,
    limit: int | None = None,
) -> list[Appointment]:
    query = select(Appointment).where(Appointment.doctor_id == doctor_id)
    if start is not None:
        query = query.where(Appointment.date >= start)
    if end is not None:
        query = query.where(Appointment.date < end)
    query = query.order_by(Appointment.date.asc())
    if limit:
        query = query.limit(limit)
    return list(db.session.execute(query).scalars())
