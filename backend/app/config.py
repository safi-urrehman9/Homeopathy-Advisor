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

    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_FAST_MODEL = os.getenv("DEEPSEEK_FAST_MODEL", "deepseek-v4-flash")
    DEEPSEEK_REASONING_MODEL = os.getenv("DEEPSEEK_REASONING_MODEL", "deepseek-v4-pro")
    DEEPSEEK_TIMEOUT_SECONDS = int(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", "60"))
    OOREP_SIDECAR_URL = os.getenv("OOREP_SIDECAR_URL", "http://oorep-sidecar:5055")
    OOREP_TIMEOUT_SECONDS = int(os.getenv("OOREP_TIMEOUT_SECONDS", "30"))
    AI_RECENT_CONSULTATION_LIMIT = int(os.getenv("AI_RECENT_CONSULTATION_LIMIT", "5"))
    AI_SUMMARY_ON_SAVE = os.getenv("AI_SUMMARY_ON_SAVE", "true").lower() == "true"

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]
