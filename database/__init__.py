"""
Database Package
================
PostgreSQL integration using SQLAlchemy async ORM.
Stores prediction history, detection logs, and analysis results.

Railway provides DATABASE_URL automatically when you add a PostgreSQL plugin.
"""

from .config import get_db, init_db, close_db
from .models import Base, PredictionRecord, DetectionRecord

__all__ = [
    "get_db",
    "init_db",
    "close_db",
    "Base",
    "PredictionRecord",
    "DetectionRecord",
]
