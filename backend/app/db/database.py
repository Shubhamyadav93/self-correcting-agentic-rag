"""
Relational SQLite Database & Session Management
Re-exports from app.db.session for consistency
"""
from app.db.session import (
    Base,
    engine,
    SessionLocal,
    get_db,
    init_db,
    seed_doctors_if_empty,
    DEFAULT_SLOTS,
    SEED_DOCTORS,
)
from app.db.models import Doctor, Appointment, ChatSession, ChatMessage, QueryMetric

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_db",
    "init_db",
    "seed_doctors_if_empty",
    "DEFAULT_SLOTS",
    "SEED_DOCTORS",
    "Doctor",
    "Appointment",
    "ChatSession",
    "ChatMessage",
    "QueryMetric",
]
