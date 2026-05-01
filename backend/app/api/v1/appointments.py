from __future__ import annotations

from flask import Blueprint, request

from app.api.v1.auth import current_doctor_id, require_auth
from app.extensions import db
from app.models import Appointment
from app.repositories.clinical import get_patient_for_doctor, list_appointments_for_doctor
from app.utils.dates import parse_date_end, parse_date_start, parse_datetime
from app.utils.errors import ApiError, ValidationError, no_content, success

bp = Blueprint("appointments", __name__)


@bp.get("/appointments")
@require_auth
def list_appointments():
    appointments = list_appointments_for_doctor(
        current_doctor_id(),
        start=parse_date_start(request.args.get("start")),
        end=parse_date_end(request.args.get("end")),
    )
    return success([appointment.to_dict() for appointment in appointments])


@bp.post("/appointments")
@require_auth
def create_appointment():
    payload = request.get_json(silent=True) or {}
    patient_id = str(payload.get("patientId") or "")
    if not patient_id:
        raise ValidationError("patientId is required.")
    patient = get_patient_for_doctor(patient_id, current_doctor_id())
    if patient is None:
        raise ApiError("Patient not found.", status_code=404, code="not_found")

    appointment = Appointment(
        doctor_id=current_doctor_id(),
        patient_id=patient.id,
        patient_name=patient.name,
        date=parse_datetime(payload.get("date"), field="date"),
        status=str(payload.get("status") or "scheduled"),
        notes=str(payload.get("notes") or ""),
    )
    db.session.add(appointment)
    db.session.commit()
    return success(appointment.to_dict(), status_code=201)


@bp.delete("/appointments/<appointment_id>")
@require_auth
def delete_appointment(appointment_id: str):
    appointment = db.session.get(Appointment, appointment_id)
    if appointment is None or appointment.doctor_id != current_doctor_id():
        raise ApiError("Appointment not found.", status_code=404, code="not_found")
    db.session.delete(appointment)
    db.session.commit()
    return no_content()
