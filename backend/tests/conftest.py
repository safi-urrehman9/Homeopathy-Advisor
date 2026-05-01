import os
from collections.abc import Iterator

import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import Doctor
from app.services.auth_service import create_access_token


@pytest.fixture()
def app(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FLASK_ENV", "testing")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/15")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    monkeypatch.setenv("DEEPSEEK_BASE_URL", "https://api.deepseek.test")
    monkeypatch.setenv("OOREP_SIDECAR_URL", "http://oorep-sidecar.test")
    monkeypatch.setenv("AI_RECENT_CONSULTATION_LIMIT", "5")
    monkeypatch.setenv("AI_SUMMARY_ON_SAVE", "false")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-32-plus-chars")

    flask_app = create_app()
    flask_app.config.update(TESTING=True)

    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def seed_doctors(app):
    with app.app_context():
        db.session.add_all(
            [
                Doctor(
                    id="doctor-one",
                    email="one@example.com",
                    name="Dr One",
                    password_hash=generate_password_hash("password123", method="pbkdf2:sha256"),
                ),
                Doctor(
                    id="doctor-two",
                    email="two@example.com",
                    name="Dr Two",
                    password_hash=generate_password_hash("password123", method="pbkdf2:sha256"),
                ),
            ]
        )
        db.session.commit()
        yield
        db.session.query(Doctor).delete()
        db.session.commit()


@pytest.fixture()
def auth_headers(app) -> dict[str, str]:
    with app.app_context():
        doctor = db.session.get(Doctor, "doctor-one")
        return {"Authorization": f"Bearer {create_access_token(doctor)}"}


@pytest.fixture()
def other_auth_headers(app) -> dict[str, str]:
    with app.app_context():
        doctor = db.session.get(Doctor, "doctor-two")
        return {"Authorization": f"Bearer {create_access_token(doctor)}"}
