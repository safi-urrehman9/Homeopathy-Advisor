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
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", app.config["SQLALCHEMY_DATABASE_URI"]),
        REDIS_URL=os.getenv("REDIS_URL", app.config["REDIS_URL"]),
        GEMINI_API_KEY=os.getenv("GEMINI_API_KEY", app.config["GEMINI_API_KEY"]),
        FIREBASE_PROJECT_ID=os.getenv("FIREBASE_PROJECT_ID", app.config["FIREBASE_PROJECT_ID"]),
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
