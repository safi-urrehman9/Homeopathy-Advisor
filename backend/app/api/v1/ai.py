from __future__ import annotations

from flask import Blueprint, current_app, request

from app.api.v1.auth import current_doctor_id, require_auth
from app.repositories.clinical import get_patient_for_doctor, list_consultations_for_patient
from app.services.ai_advisor_service import get_ai_advisor_service
from app.services.cache_service import get_cache_service
from app.utils.errors import ApiError, ValidationError, success

bp = Blueprint("ai", __name__, url_prefix="/ai")


def _cached(namespace: str, payload: dict[str, object], ttl: int, producer):
    cache = get_cache_service()
    key = cache.make_key(namespace, payload) if hasattr(cache, "make_key") else f"{namespace}:{payload}"
    cached = cache.get_json(key)
    if cached is not None:
        return success(cached, meta={"cache": "hit"})
    value = producer()
    cache.set_json(key, value, ttl)
    return success(value, meta={"cache": "miss"})


def _compact_consultation_timeline(consultations: list[object]) -> list[dict[str, str]]:
    timeline = []
    for consultation in consultations:
        if not isinstance(consultation, dict):
            continue
        timeline.append(
            {
                "date": str(consultation.get("date") or ""),
                "symptoms": str(consultation.get("symptoms") or ""),
                "prescribedRemedy": str(consultation.get("prescribedRemedy") or ""),
                "potency": str(consultation.get("potency") or ""),
                "notes": str(consultation.get("notes") or ""),
            }
        )
    return timeline


@bp.post("/extract-symptoms")
@require_auth
def extract_symptoms():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text") or "").strip()
    if not text:
        raise ValidationError("text is required.")
    return _cached(
        "ai:extract-symptoms",
        {"text": text},
        60 * 60 * 12,
        lambda: {"text": get_ai_advisor_service().extract_symptoms(text)},
    )


@bp.post("/suggest-remedies")
@require_auth
def suggest_remedies():
    payload = request.get_json(silent=True) or {}
    symptoms = str(payload.get("symptoms") or "").strip()
    if not symptoms:
        raise ValidationError("symptoms is required.")
    past_consultations = payload.get("pastConsultations") or []
    if not isinstance(past_consultations, list):
        raise ValidationError("pastConsultations must be an array.")
    recent_limit = int(current_app.config["AI_RECENT_CONSULTATION_LIMIT"])
    recent_consultations = _compact_consultation_timeline(past_consultations[-recent_limit:]) if recent_limit > 0 else []
    patient_summary = str(payload.get("patientSummary") or "").strip()
    patient_id = str(payload.get("patientId") or "").strip()
    if patient_id:
        patient = get_patient_for_doctor(patient_id, current_doctor_id())
        if patient is None:
            raise ApiError("Patient not found.", status_code=404, code="not_found")
        patient_summary = patient.ai_summary or ""
        consultations = list(reversed(list_consultations_for_patient(patient_id, current_doctor_id())))
        recent_consultations = (
            _compact_consultation_timeline([consultation.to_dict() for consultation in consultations[-recent_limit:]])
            if recent_limit > 0
            else []
        )
    return _cached(
        "ai:suggest-remedies",
        {"symptoms": symptoms, "patientId": patient_id, "patientSummary": patient_summary, "recentConsultations": recent_consultations},
        60 * 15,
        lambda: get_ai_advisor_service().suggest_remedies(symptoms, patient_summary, recent_consultations),
    )


@bp.post("/materia-medica")
@require_auth
def materia_medica():
    payload = request.get_json(silent=True) or {}
    query = str(payload.get("query") or "").strip()
    if not query:
        raise ValidationError("query is required.")
    return _cached(
        "ai:materia-medica",
        {"query": query},
        60 * 60 * 24,
        lambda: {"text": get_ai_advisor_service().search_materia_medica(query)},
    )


@bp.post("/process-audio")
@require_auth
def process_audio():
    payload = request.get_json(silent=True) or {}
    base64_audio = str(payload.get("base64Audio") or "")
    if not base64_audio:
        raise ValidationError("base64Audio is required.")
    mime_type = str(payload.get("mimeType") or "")
    return success({"text": get_ai_advisor_service().process_audio(base64_audio, mime_type)})


@bp.post("/process-image")
@require_auth
def process_image():
    payload = request.get_json(silent=True) or {}
    base64_image = str(payload.get("base64Image") or "")
    if not base64_image:
        raise ValidationError("base64Image is required.")
    mime_type = str(payload.get("mimeType") or "")
    return success({"text": get_ai_advisor_service().process_image(base64_image, mime_type)})
