from __future__ import annotations

from flask import Blueprint, request

from app.api.v1.auth import current_doctor_id, require_auth
from app.extensions import db
from app.models import Patient
from app.repositories.clinical import get_patient_for_doctor, list_consultations_for_patient, list_patients_for_doctor
from app.utils.errors import ApiError, ValidationError, no_content, success

bp = Blueprint("patients", __name__)


def _patient_payload() -> dict[str, object]:
    payload = request.get_json(silent=True) or {}
    if "name" in payload:
        payload["name"] = str(payload["name"]).strip()
    if payload.get("age") in ("", None):
        payload["age"] = None
    elif "age" in payload:
        try:
            payload["age"] = int(payload["age"])
        except (ValueError, TypeError):
            raise ValidationError("Age must be a valid number.")
    return payload


@bp.get("/patients")
@require_auth
def list_patients():
    patients = list_patients_for_doctor(
        current_doctor_id(),
        query_text=request.args.get("q") or None,
        limit=int(request.args["limit"]) if request.args.get("limit") else None,
    )
    return success([patient.to_dict() for patient in patients])


@bp.post("/patients")
@require_auth
def create_patient():
    payload = _patient_payload()
    if not payload.get("name"):
        raise ValidationError("Patient name is required.")

    patient = Patient(
        doctor_id=current_doctor_id(),
        name=str(payload["name"]),
        age=payload.get("age"),
        gender=str(payload.get("gender") or ""),
        phone=str(payload.get("phone") or ""),
        email=str(payload.get("email") or ""),
        history=str(payload.get("history") or ""),
        ai_summary=str(payload.get("aiSummary") or ""),
    )
    db.session.add(patient)
    db.session.commit()
    return success(patient.to_dict(), status_code=201)


@bp.get("/patients/<patient_id>")
@require_auth
def get_patient(patient_id: str):
    patient = get_patient_for_doctor(patient_id, current_doctor_id())
    if patient is None:
        raise ApiError("Patient not found.", status_code=404, code="not_found")
    return success(patient.to_dict())


@bp.patch("/patients/<patient_id>")
@require_auth
def update_patient(patient_id: str):
    patient = get_patient_for_doctor(patient_id, current_doctor_id())
    if patient is None:
        raise ApiError("Patient not found.", status_code=404, code="not_found")

    payload = _patient_payload()
    if "aiSummary" in payload:
        payload["ai_summary"] = str(payload.get("aiSummary") or "")
    for field in ("name", "age", "gender", "phone", "email", "history", "ai_summary"):
        if field in payload:
            setattr(patient, field, payload[field])
    if not patient.name:
        raise ValidationError("Patient name is required.")
    db.session.commit()
    return success(patient.to_dict())


@bp.delete("/patients/<patient_id>")
@require_auth
def delete_patient(patient_id: str):
    patient = get_patient_for_doctor(patient_id, current_doctor_id())
    if patient is None:
        raise ApiError("Patient not found.", status_code=404, code="not_found")
    db.session.delete(patient)
    db.session.commit()
    return no_content()


@bp.get("/patients/<patient_id>/consultations")
@require_auth
def list_patient_consultations(patient_id: str):
    patient = get_patient_for_doctor(patient_id, current_doctor_id())
    if patient is None:
        raise ApiError("Patient not found.", status_code=404, code="not_found")
    consultations = list_consultations_for_patient(patient_id, current_doctor_id())
    return success([consultation.to_dict() for consultation in consultations])
