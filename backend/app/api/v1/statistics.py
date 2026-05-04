from __future__ import annotations

from flask import Blueprint

from app.api.v1.auth import current_doctor_id, require_auth
from app.models import Consultation
from app.repositories.clinical import (
    recent_consultation_count_for_doctor,
    recent_healed_patients_for_doctor,
    status_counts_for_doctor,
    top_consultation_values_for_doctor,
    total_patients_for_doctor,
)
from app.utils.errors import success

bp = Blueprint("statistics", __name__)


@bp.get("/statistics")
@require_auth
def statistics():
    doctor_id = current_doctor_id()
    status_counts = status_counts_for_doctor(doctor_id)
    total_patients = total_patients_for_doctor(doctor_id)
    healed_count = status_counts["healed"]
    healed_percentage = round((healed_count / total_patients) * 100, 1) if total_patients else 0

    return success(
        {
            "totalPatients": total_patients,
            "statusCounts": status_counts,
            "healedCount": healed_count,
            "healedPercentage": healed_percentage,
            "recentConsultationCount": recent_consultation_count_for_doctor(doctor_id),
            "topPrescribedRemedies": top_consultation_values_for_doctor(doctor_id, Consultation.prescribed_remedy),
            "topPotencies": top_consultation_values_for_doctor(doctor_id, Consultation.potency),
            "recentHealedPatients": [patient.to_dict() for patient in recent_healed_patients_for_doctor(doctor_id)],
        }
    )
