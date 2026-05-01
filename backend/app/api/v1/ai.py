from __future__ import annotations

import hashlib

from flask import Blueprint, request

from app.api.v1.auth import require_auth
from app.services.cache_service import get_cache_service
from app.services.gemini_service import get_gemini_service
from app.utils.errors import ValidationError, success

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
        lambda: {"text": get_gemini_service().extract_symptoms(text)},
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
    return _cached(
        "ai:suggest-remedies",
        {"symptoms": symptoms, "pastConsultations": past_consultations},
        60 * 15,
        lambda: get_gemini_service().suggest_remedies(symptoms, past_consultations),
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
        lambda: {"text": get_gemini_service().search_materia_medica(query)},
    )


@bp.post("/process-audio")
@require_auth
def process_audio():
    payload = request.get_json(silent=True) or {}
    base64_audio = str(payload.get("base64Audio") or "")
    mime_type = str(payload.get("mimeType") or "audio/webm")
    if not base64_audio:
        raise ValidationError("base64Audio is required.")
    return _cached(
        "ai:process-audio",
        {"base64AudioSha": hashlib.sha256(base64_audio.encode("utf-8")).hexdigest(), "mimeType": mime_type},
        60 * 60,
        lambda: {"text": get_gemini_service().process_audio(base64_audio, mime_type)},
    )


@bp.post("/process-image")
@require_auth
def process_image():
    payload = request.get_json(silent=True) or {}
    base64_image = str(payload.get("base64Image") or "")
    mime_type = str(payload.get("mimeType") or "image/png")
    if not base64_image:
        raise ValidationError("base64Image is required.")
    return _cached(
        "ai:process-image",
        {"base64ImageSha": hashlib.sha256(base64_image.encode("utf-8")).hexdigest(), "mimeType": mime_type},
        60 * 60,
        lambda: {"text": get_gemini_service().process_image(base64_image, mime_type)},
    )
