from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me-32-bytes")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'instance' / 'vitalforce.db'}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False

    REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
    CACHE_VERSION = os.getenv("CACHE_VERSION", "v1")
    JWT_EXPIRES_IN_SECONDS = int(os.getenv("JWT_EXPIRES_IN_SECONDS", str(60 * 60 * 24 * 7)))

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-3-flash-preview")
    GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image-preview")
    GEMINI_AUDIO_MODEL = os.getenv("GEMINI_AUDIO_MODEL", "gemini-3.1-flash-live-preview")

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]
