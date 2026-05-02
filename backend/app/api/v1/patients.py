from __future__ import annotations

from flask import Blueprint, request

from app.api.v1.auth import current_doctor_id, require_auth
from app.extensions import db
from app.models import Patient
from app.models.clinical import PATIENT_STATUSES, utc_now
from app.repositories.clinical import append_patient_history_snapshot, get_patient_for_doctor, list_consultations_for_patient, list_patients_for_doctor
from app.utils.errors import ApiError, ValidationError, no_content, success

bp = Blueprint("patients", __name__)


def _patient_payload() -> dict[str, object]:
    payload = request.get_json(silent=True) or {}
    if "name" in payload:
        payload["name"] = str(payload["name"]).strip()
    if payload.get("age") in ("", None):
        payload["age"] = None
    elif "age" in payload:
        payload["age"] = int(payload["age"])
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

    previous_status = patient.status
    status_changed = False
    non_status_update = False
    if "status" in payload:
        next_status = str(payload.get("status") or "").strip()
        if next_status not in PATIENT_STATUSES:
            raise ValidationError("Patient status is invalid.")
        status_changed = next_status != previous_status
        if status_changed:
            patient.status = next_status
            patient.status_updated_at = utc_now()
            patient.healed_at = utc_now() if next_status == "healed" else None

    for field in ("name", "age", "gender", "phone", "email", "history", "ai_summary"):
        if field in payload:
            setattr(patient, field, payload[field])
            non_status_update = True
    if not patient.name:
        raise ValidationError("Patient name is required.")

    if status_changed and patient.status == "healed":
        append_patient_history_snapshot(patient, "marked_healed")
    elif previous_status == "healed" and status_changed:
        append_patient_history_snapshot(patient, "status_changed")
    elif previous_status == "healed" and non_status_update:
        append_patient_history_snapshot(patient, "healed_patient_updated")

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
