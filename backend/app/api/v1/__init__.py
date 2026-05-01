from flask import Blueprint

from app.api.v1.ai import bp as ai_bp
from app.api.v1.appointments import bp as appointments_bp
from app.api.v1.consultations import bp as consultations_bp
from app.api.v1.dashboard import bp as dashboard_bp
from app.api.v1.health import bp as health_bp
from app.api.v1.patients import bp as patients_bp


api_v1 = Blueprint("api_v1", __name__)
api_v1.register_blueprint(health_bp)
api_v1.register_blueprint(patients_bp)
api_v1.register_blueprint(consultations_bp)
api_v1.register_blueprint(appointments_bp)
api_v1.register_blueprint(dashboard_bp)
api_v1.register_blueprint(ai_bp)
