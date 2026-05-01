from __future__ import annotations

import json
import logging
import time
from typing import Any
from urllib import error, request

from flask import current_app

from app.utils.errors import ApiError


logger = logging.getLogger(__name__)


class OorepService:
    max_attempts = 3
    circuit_failure_threshold = 3
    circuit_cooldown_seconds = 30

    def __init__(self):
        self.base_url = str(current_app.config["OOREP_SIDECAR_URL"]).rstrip("/")
        self.timeout = int(current_app.config["OOREP_TIMEOUT_SECONDS"])
        self._failure_count = 0
        self._circuit_open_until = 0.0

    def search_repertory(self, symptom: str, max_results: int = 8) -> dict[str, Any]:
        return self._post(
            "/search-repertory",
            {"symptom": symptom, "maxResults": max_results, "includeRemedyStats": True},
        )

    def search_materia_medica(self, symptom: str, remedy: str | None = None, max_results: int = 5) -> dict[str, Any]:
        payload: dict[str, Any] = {"symptom": symptom, "maxResults": max_results}
        if remedy:
            payload["remedy"] = remedy
        return self._post("/search-materia-medica", payload)

    def get_remedy_info(self, remedy: str) -> dict[str, Any] | None:
        return self._post("/get-remedy-info", {"remedy": remedy}).get("remedy")

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        data = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        return self._urlopen_with_retries(req)

    def _urlopen_with_retries(self, req: request.Request) -> dict[str, Any]:
        if time.monotonic() < self._circuit_open_until:
            raise ApiError("OOREP sidecar is temporarily unavailable.", status_code=503, code="oorep_circuit_open")

        last_exc: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                with request.urlopen(req, timeout=self.timeout) as response:
                    parsed = json.loads(response.read().decode("utf-8") or "{}")
                self._record_success()
                if attempt > 1:
                    logger.info("oorep.retry_succeeded", extra={"attempt": attempt})
                return parsed
            except error.HTTPError as exc:
                last_exc = exc
                transient = self._is_transient_http_error(exc)
                if not transient or attempt == self.max_attempts:
                    self._record_failure()
                    raise ApiError("OOREP lookup failed.", status_code=502, code="oorep_failed") from exc
                logger.warning("oorep.retry_http_error", extra={"attempt": attempt, "status": exc.code})
                time.sleep(self._backoff_seconds(attempt))
            except Exception as exc:
                last_exc = exc
                if attempt == self.max_attempts:
                    self._record_failure()
                    raise ApiError("OOREP sidecar is unavailable.", status_code=502, code="oorep_unavailable") from exc
                logger.warning("oorep.retry_unavailable", extra={"attempt": attempt})
                time.sleep(self._backoff_seconds(attempt))
        self._record_failure()
        raise ApiError("OOREP sidecar is unavailable.", status_code=502, code="oorep_unavailable") from last_exc

    def _record_success(self) -> None:
        self._failure_count = 0
        self._circuit_open_until = 0.0

    def _record_failure(self) -> None:
        self._failure_count += 1
        if self._failure_count >= self.circuit_failure_threshold:
            self._circuit_open_until = time.monotonic() + self.circuit_cooldown_seconds

    def _is_transient_http_error(self, exc: error.HTTPError) -> bool:
        return exc.code == 429 or 500 <= exc.code <= 599

    def _backoff_seconds(self, attempt: int) -> float:
        return min(0.25 * (2 ** (attempt - 1)), 2.0)


def get_oorep_service() -> OorepService:
    return OorepService()
