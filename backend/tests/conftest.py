import os
from collections.abc import Iterator

import pytest

from app import create_app
from app.extensions import db
from app.models import Doctor


@pytest.fixture()
def app(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FLASK_ENV", "testing")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/15")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("FIREBASE_PROJECT_ID", "test-project")

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
def fake_firebase(monkeypatch: pytest.MonkeyPatch):
    def _verify(token: str) -> dict[str, object]:
        if token == "doctor-two":
            return {
                "uid": "doctor-two",
                "email": "two@example.com",
                "name": "Dr Two",
                "picture": "",
            }
        return {
            "uid": "doctor-one",
            "email": "one@example.com",
            "name": "Dr One",
            "picture": "",
        }

    monkeypatch.setattr("app.services.auth_service.verify_firebase_token", _verify)


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer doctor-one"}


@pytest.fixture()
def other_auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer doctor-two"}
