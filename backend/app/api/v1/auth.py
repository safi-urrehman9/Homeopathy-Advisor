from __future__ import annotations

from functools import wraps

from flask import g

from app.services.auth_service import load_current_doctor


def require_auth(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        load_current_doctor()
        return view(*args, **kwargs)

    return wrapper


def current_doctor_id() -> str:
    return g.current_doctor.id
