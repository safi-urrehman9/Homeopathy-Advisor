from __future__ import annotations

from flask import Blueprint, request

from app.api.v1.auth import current_doctor_id, require_auth
from app.extensions import db
from app.models import Consultation
from app.repositories.clinical import get_patient_for_doctor, list_consultations_for_patient
from app.utils.dates import parse_datetime
from app.utils.errors import ApiError, ValidationError, success

bp = Blueprint("consultations", __name__)


@bp.get("/consultations")
@require_auth
def list_consultations():
    patient_id = request.args.get("patientId")
    if not patient_id:
        raise ValidationError("patientId query parameter is required.")
    patient = get_patient_for_doctor(patient_id, current_doctor_id())
    if patient is None:
        raise ApiError("Patient not found.", status_code=404, code="not_found")
    consultations = list_consultations_for_patient(patient_id, current_doctor_id())
    return success([consultation.to_dict() for consultation in consultations])


@bp.post("/consultations")
@require_auth
def create_consultation():
    payload = request.get_json(silent=True) or {}
    patient_id = str(payload.get("patientId") or "")
    symptoms = str(payload.get("symptoms") or "").strip()
    if not patient_id:
        raise ValidationError("patientId is required.")
    if not symptoms:
        raise ValidationError("symptoms is required.")
    patient = get_patient_for_doctor(patient_id, current_doctor_id())
    if patient is None:
        raise ApiError("Patient not found.", status_code=404, code="not_found")

    consultation_kwargs = {
        "doctor_id": current_doctor_id(),
        "patient_id": patient_id,
        "symptoms": symptoms,
        "repertorization": str(payload.get("repertorization") or ""),
        "prescribed_remedy": str(payload.get("prescribedRemedy") or ""),
        "potency": str(payload.get("potency") or ""),
        "notes": str(payload.get("notes") or ""),
    }
    if payload.get("date"):
        consultation_kwargs["date"] = parse_datetime(payload.get("date"), field="date")

    consultation = Consultation(
        **consultation_kwargs
    )
    db.session.add(consultation)
    db.session.commit()
    return success(consultation.to_dict(), status_code=201)
