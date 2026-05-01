from __future__ import annotations

from flask import g, request

from app.extensions import db
from app.models import Doctor
from app.utils.errors import ApiError


def verify_firebase_token(token: str) -> dict[str, object]:
    try:
        import firebase_admin
        from firebase_admin import auth, credentials
    except Exception as exc:
        raise ApiError("Firebase Admin SDK is not installed.", status_code=500, code="auth_not_configured") from exc

    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.ApplicationDefault())

    try:
        return auth.verify_id_token(token)
    except Exception as exc:
        raise ApiError("Invalid or expired authentication token.", status_code=401, code="unauthorized") from exc


def get_bearer_token() -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ApiError("Missing bearer token.", status_code=401, code="unauthorized")
    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise ApiError("Missing bearer token.", status_code=401, code="unauthorized")
    return token


def load_current_doctor() -> Doctor:
    claims = verify_firebase_token(get_bearer_token())
    doctor_id = str(claims.get("uid") or "")
    if not doctor_id:
        raise ApiError("Authentication token is missing a user id.", status_code=401, code="unauthorized")

    doctor = db.session.get(Doctor, doctor_id)
    if doctor is None:
        doctor = Doctor(id=doctor_id)
        db.session.add(doctor)

    doctor.email = str(claims.get("email") or "") or None
    doctor.name = str(claims.get("name") or claims.get("displayName") or "") or None
    doctor.photo_url = str(claims.get("picture") or "") or None
    db.session.commit()

    g.current_doctor = doctor
    return doctor
