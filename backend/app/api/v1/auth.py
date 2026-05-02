from __future__ import annotations

from functools import wraps

from flask import Blueprint, g, jsonify, request

from app.services.auth_service import authenticate_doctor, create_access_token, load_current_doctor, register_doctor
from app.utils.errors import ValidationError


bp = Blueprint("auth", __name__, url_prefix="/auth")


def require_auth(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        load_current_doctor()
        return view(*args, **kwargs)

    return wrapper


def current_doctor_id() -> str:
    return g.current_doctor.id


@bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name") or "").strip()
    email = str(payload.get("email") or "").strip()
    password = str(payload.get("password") or "")

    if not name:
        raise ValidationError("Name is required.")
    if not email:
        raise ValidationError("Email is required.")
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters.")

    doctor = register_doctor(name=name, email=email, password=password)
    return (
        jsonify(
            {
                "data": {
                    "token": create_access_token(doctor),
                    "doctor": doctor.to_auth_dict(),
                }
            }
        ),
        201,
    )


@bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email") or "").strip()
    password = str(payload.get("password") or "")

    if not email:
        raise ValidationError("Email is required.")
    if not password:
        raise ValidationError("Password is required.")

    doctor = authenticate_doctor(email=email, password=password)
    return jsonify({"data": {"token": create_access_token(doctor), "doctor": doctor.to_auth_dict()}})


@bp.get("/me")
@require_auth
def me():
    return jsonify({"data": g.current_doctor.to_auth_dict()})
