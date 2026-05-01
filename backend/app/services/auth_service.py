from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from flask import current_app, g, request
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import Doctor
from app.utils.errors import ApiError


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(doctor: Doctor) -> str:
    now = _utc_now()
    expires_at = now + timedelta(seconds=current_app.config["JWT_EXPIRES_IN_SECONDS"])
    payload = {
        "sub": doctor.id,
        "email": doctor.email,
        "name": doctor.name,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": str(uuid4()),
    }

    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def verify_access_token(token: str) -> dict[str, object]:
    try:
        return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
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
    claims = verify_access_token(get_bearer_token())
    doctor_id = str(claims.get("sub") or "")
    if not doctor_id:
        raise ApiError("Authentication token is missing a user id.", status_code=401, code="unauthorized")

    doctor = db.session.get(Doctor, doctor_id)
    if doctor is None:
        raise ApiError("Authenticated doctor account was not found.", status_code=401, code="unauthorized")

    g.current_doctor = doctor
    return doctor


def register_doctor(name: str, email: str, password: str) -> Doctor:
    normalized_email = email.strip().lower()
    if db.session.execute(db.select(Doctor).filter_by(email=normalized_email)).scalar_one_or_none() is not None:
        raise ApiError("A doctor with this email already exists.", status_code=409, code="doctor_exists")

    doctor = Doctor(
        name=name.strip(),
        email=normalized_email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
    )
    db.session.add(doctor)
    db.session.commit()
    return doctor


def authenticate_doctor(email: str, password: str) -> Doctor:
    normalized_email = email.strip().lower()
    doctor = db.session.execute(db.select(Doctor).filter_by(email=normalized_email)).scalar_one_or_none()
    if doctor is None or not check_password_hash(doctor.password_hash, password):
        raise ApiError("Invalid email or password.", status_code=401, code="invalid_credentials")
    return doctor
