from __future__ import annotations

import hashlib
import json
from typing import Any

from flask import current_app

from app import extensions


class CacheService:
    def __init__(self, client):
        self.client = client

    def make_key(self, namespace: str, payload: dict[str, Any]) -> str:
        normalized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        return f"{current_app.config['CACHE_VERSION']}:{namespace}:{digest}"

    def get_json(self, key: str):
        if self.client is None:
            return None
        raw = self.client.get(key)
        if not raw:
            return None
        return json.loads(raw)

    def set_json(self, key: str, value, ttl: int) -> None:
        if self.client is None:
            return
        self.client.setex(key, ttl, json.dumps(value, sort_keys=True, default=str))


def get_cache_service() -> CacheService:
    return CacheService(extensions.redis_client)
