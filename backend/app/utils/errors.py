from __future__ import annotations

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    status_code = 500
    code = "server_error"

    def __init__(self, message: str, *, status_code: int | None = None, code: str | None = None):
        super().__init__(message)
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.message = message


class ValidationError(ApiError):
    def __init__(self, message: str):
        super().__init__(message, status_code=400, code="validation_error")


def success(data: object = None, *, status_code: int = 200, meta: dict[str, object] | None = None):
    payload: dict[str, object] = {"data": data}
    if meta:
        payload["meta"] = meta
    return jsonify(payload), status_code


def no_content():
    return "", 204


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return (
            jsonify({"error": {"code": error.code, "message": error.message}}),
            error.status_code,
        )

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        return (
            jsonify({"error": {"code": error.name.lower().replace(" ", "_"), "message": error.description}}),
            error.code or 500,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        if app.config.get("TESTING"):
            raise error
        return (
            jsonify({"error": {"code": "server_error", "message": "An unexpected error occurred."}}),
            500,
        )
