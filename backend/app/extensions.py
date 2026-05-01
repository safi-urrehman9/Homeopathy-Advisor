from __future__ import annotations

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
redis_client = None


def init_redis(app: Flask) -> None:
    global redis_client

    try:
        from redis import Redis

        redis_client = Redis.from_url(app.config["REDIS_URL"], decode_responses=True)
        redis_client.ping()
    except Exception:
        redis_client = None
