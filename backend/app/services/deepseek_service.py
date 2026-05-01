from __future__ import annotations

import json
import logging
import time
from typing import Any
from urllib import error, request

from flask import current_app

from app.utils.errors import ApiError


logger = logging.getLogger(__name__)


class DeepSeekClient:
    max_attempts = 3
    circuit_failure_threshold = 3
    circuit_cooldown_seconds = 30

    def __init__(self):
        api_key = current_app.config["DEEPSEEK_API_KEY"]
        if not api_key:
            raise ApiError("DEEPSEEK_API_KEY is not configured.", status_code=500, code="ai_not_configured")
        self.api_key = api_key
        self.base_url = str(current_app.config["DEEPSEEK_BASE_URL"]).rstrip("/")
        self.timeout = int(current_app.config["DEEPSEEK_TIMEOUT_SECONDS"])
        self._failure_count = 0
        self._circuit_open_until = 0.0

    def complete_text(self, prompt: str, model: str, system: str | None = None) -> str:
        message_payload = []
        if system:
            message_payload.append({"role": "system", "content": system})
        message_payload.append({"role": "user", "content": prompt})
        payload = {
            "model": model,
            "messages": message_payload,
            "stream": False,
            "temperature": 0.2,
            "thinking": {"type": "disabled"},
        }
        content = self._chat(payload)
        return content.strip()

    def complete_json(self, prompt: str, model: str, system: str | None = None) -> dict[str, Any]:
        message_payload = []
        if system:
            message_payload.append({"role": "system", "content": system})
        message_payload.append({"role": "user", "content": prompt})
        payload = {
            "model": model,
            "messages": message_payload,
            "stream": False,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }
        content = self._chat(payload)
        try:
            return json.loads(content or "{}")
        except json.JSONDecodeError:
            return {}

    def _chat(self, payload: dict[str, Any]) -> str:
        data = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{self.base_url}/chat/completions",
            data=data,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        parsed = self._urlopen_with_retries(req)

        choices = parsed.get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        return message.get("content") or ""

    def _urlopen_with_retries(self, req: request.Request) -> dict[str, Any]:
        if time.monotonic() < self._circuit_open_until:
            raise ApiError("DeepSeek is temporarily unavailable.", status_code=503, code="deepseek_circuit_open")

        last_exc: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                with request.urlopen(req, timeout=self.timeout) as response:
                    parsed = json.loads(response.read().decode("utf-8") or "{}")
                self._record_success()
                if attempt > 1:
                    logger.info("deepseek.retry_succeeded", extra={"attempt": attempt})
                return parsed
            except error.HTTPError as exc:
                last_exc = exc
                transient = self._is_transient_http_error(exc)
                if not transient or attempt == self.max_attempts:
                    self._record_failure()
                    raise ApiError("DeepSeek request failed.", status_code=502, code="deepseek_failed") from exc
                logger.warning("deepseek.retry_http_error", extra={"attempt": attempt, "status": exc.code})
                time.sleep(self._backoff_seconds(attempt))
            except Exception as exc:
                last_exc = exc
                if attempt == self.max_attempts:
                    self._record_failure()
                    raise ApiError("DeepSeek is unavailable.", status_code=502, code="deepseek_unavailable") from exc
                logger.warning("deepseek.retry_unavailable", extra={"attempt": attempt})
                time.sleep(self._backoff_seconds(attempt))
        self._record_failure()
        raise ApiError("DeepSeek is unavailable.", status_code=502, code="deepseek_unavailable") from last_exc

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


def get_deepseek_client() -> DeepSeekClient:
    return DeepSeekClient()
