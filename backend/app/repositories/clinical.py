from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import desc, func, or_, select

from app.extensions import db
from app.models import Appointment, Consultation, Patient, PatientHistorySnapshot
from app.models.clinical import isoformat


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


def list_appointments_for_patient(patient_id: str, doctor_id: str) -> list[Appointment]:
    return list(
        db.session.execute(
            select(Appointment)
            .where(Appointment.patient_id == patient_id, Appointment.doctor_id == doctor_id)
            .order_by(Appointment.date.asc())
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


def append_patient_history_snapshot(patient: Patient, event_type: str) -> PatientHistorySnapshot:
    latest_version = db.session.execute(
        select(func.max(PatientHistorySnapshot.version)).where(PatientHistorySnapshot.patient_id == patient.id)
    ).scalar()
    version = int(latest_version or 0) + 1
    now = datetime.now(timezone.utc)
    payload = {
        "metadata": {
            "version": version,
            "eventType": event_type,
            "generatedAt": isoformat(now),
        },
        "patient": patient.to_dict(include_latest_snapshot=False),
        "consultations": [
            consultation.to_dict()
            for consultation in sorted(patient.consultations, key=lambda item: isoformat(item.date) or "")
        ],
        "appointments": [
            appointment.to_dict()
            for appointment in sorted(patient.appointments, key=lambda item: isoformat(item.date) or "")
        ],
    }
    snapshot = PatientHistorySnapshot(
        doctor_id=patient.doctor_id,
        patient_id=patient.id,
        version=version,
        event_type=event_type,
        payload_json=json.dumps(payload, sort_keys=True, default=str),
        created_at=now,
    )
    db.session.add(snapshot)
    db.session.flush()
    return snapshot


def status_counts_for_doctor(doctor_id: str) -> dict[str, int]:
    rows = db.session.execute(
        select(Patient.status, func.count(Patient.id)).where(Patient.doctor_id == doctor_id).group_by(Patient.status)
    ).all()
    counts = {status: 0 for status in ("active", "improving", "healed", "inactive", "relapsed")}
    counts.update({status: count for status, count in rows})
    return counts


def total_patients_for_doctor(doctor_id: str) -> int:
    return int(db.session.execute(select(func.count(Patient.id)).where(Patient.doctor_id == doctor_id)).scalar() or 0)


def recent_consultation_count_for_doctor(doctor_id: str) -> int:
    return int(db.session.execute(select(func.count(Consultation.id)).where(Consultation.doctor_id == doctor_id)).scalar() or 0)


def top_consultation_values_for_doctor(doctor_id: str, field, limit: int = 5) -> list[dict[str, object]]:
    rows = db.session.execute(
        select(field, func.count(Consultation.id).label("count"))
        .where(Consultation.doctor_id == doctor_id, field.is_not(None), field != "")
        .group_by(field)
        .order_by(desc("count"), field.asc())
        .limit(limit)
    ).all()
    return [{"name": name, "count": count} for name, count in rows]


def recent_healed_patients_for_doctor(doctor_id: str, limit: int = 5) -> list[Patient]:
    return list(
        db.session.execute(
            select(Patient)
            .where(Patient.doctor_id == doctor_id, Patient.status == "healed")
            .order_by(Patient.healed_at.desc(), Patient.updated_at.desc())
            .limit(limit)
        ).scalars()
    )
