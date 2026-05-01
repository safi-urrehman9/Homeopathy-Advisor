from flask import Blueprint

from app.utils.errors import success

bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    return success({"status": "ok"})
