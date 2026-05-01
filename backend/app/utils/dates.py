from __future__ import annotations

from datetime import datetime, time, timezone


def parse_datetime(value: str | None, *, field: str) -> datetime:
    if not value:
        raise ValueError(f"{field} is required")
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def parse_date_start(value: str | None) -> datetime | None:
    if not value:
        return None
    if len(value) == 10:
        parsed = datetime.fromisoformat(value).date()
        return datetime.combine(parsed, time.min, tzinfo=timezone.utc)
    return parse_datetime(value, field="start")


def parse_date_end(value: str | None) -> datetime | None:
    if not value:
        return None
    if len(value) == 10:
        parsed = datetime.fromisoformat(value).date()
        return datetime.combine(parsed, time.min, tzinfo=timezone.utc)
    return parse_datetime(value, field="end")
