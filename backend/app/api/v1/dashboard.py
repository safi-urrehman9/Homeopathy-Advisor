from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from flask import Blueprint

from app.api.v1.auth import current_doctor_id, require_auth
from app.repositories.clinical import list_appointments_for_doctor, list_patients_for_doctor
from app.utils.errors import success

bp = Blueprint("dashboard", __name__)


@bp.get("/dashboard")
@require_auth
def dashboard():
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, time.min, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    appointments = list_appointments_for_doctor(current_doctor_id(), start=start, end=end)
    patients = list_patients_for_doctor(current_doctor_id(), limit=5)
    return success(
        {
            "todayAppointments": [appointment.to_dict() for appointment in appointments],
            "recentPatients": [patient.to_dict() for patient in patients],
        }
    )
