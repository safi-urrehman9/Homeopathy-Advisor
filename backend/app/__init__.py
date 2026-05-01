from __future__ import annotations

import os
from pathlib import Path

from flask import Flask
from flask_cors import CORS

from app.api.v1 import api_v1
from app.config import Config
from app.extensions import db, init_redis
from app.utils.errors import ApiError, ValidationError, register_error_handlers


def create_app(config_object: type[Config] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object or Config)
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY", app.config["SECRET_KEY"]),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", app.config["SQLALCHEMY_DATABASE_URI"]),
        REDIS_URL=os.getenv("REDIS_URL", app.config["REDIS_URL"]),
        DEEPSEEK_API_KEY=os.getenv("DEEPSEEK_API_KEY", app.config["DEEPSEEK_API_KEY"]),
        DEEPSEEK_BASE_URL=os.getenv("DEEPSEEK_BASE_URL", app.config["DEEPSEEK_BASE_URL"]),
        DEEPSEEK_FAST_MODEL=os.getenv("DEEPSEEK_FAST_MODEL", app.config["DEEPSEEK_FAST_MODEL"]),
        DEEPSEEK_REASONING_MODEL=os.getenv("DEEPSEEK_REASONING_MODEL", app.config["DEEPSEEK_REASONING_MODEL"]),
        DEEPSEEK_TIMEOUT_SECONDS=int(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", str(app.config["DEEPSEEK_TIMEOUT_SECONDS"]))),
        OOREP_SIDECAR_URL=os.getenv("OOREP_SIDECAR_URL", app.config["OOREP_SIDECAR_URL"]),
        OOREP_TIMEOUT_SECONDS=int(os.getenv("OOREP_TIMEOUT_SECONDS", str(app.config["OOREP_TIMEOUT_SECONDS"]))),
        AI_RECENT_CONSULTATION_LIMIT=int(os.getenv("AI_RECENT_CONSULTATION_LIMIT", str(app.config["AI_RECENT_CONSULTATION_LIMIT"]))),
        AI_SUMMARY_ON_SAVE=os.getenv("AI_SUMMARY_ON_SAVE", str(app.config["AI_SUMMARY_ON_SAVE"])).lower() == "true",
        JWT_EXPIRES_IN_SECONDS=int(os.getenv("JWT_EXPIRES_IN_SECONDS", str(app.config["JWT_EXPIRES_IN_SECONDS"]))),
    )

    database_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    if database_uri.startswith("sqlite:///") and database_uri != "sqlite:///:memory:":
        Path(database_uri.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=False,
    )
    db.init_app(app)
    init_redis(app)
    register_error_handlers(app)

    app.register_blueprint(api_v1, url_prefix="/api/v1")

    return app
