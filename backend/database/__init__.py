"""
backend/database
Database connection and repository layer for SkyGuard AI.
"""

from backend.database.connection import (
    DatabaseManager,
    InMemoryCollection,
    InMemoryCursor,
    db_manager,
)
from backend.database.repositories import (
    BaseRepository,
    AnomalyRepository,
    anomaly_repo,
    AlertRepository,
    alert_repo,
    TelemetryRepository,
    telemetry_repo,
)

__all__ = [
    "DatabaseManager",
    "InMemoryCollection",
    "InMemoryCursor",
    "db_manager",
    "BaseRepository",
    "AnomalyRepository",
    "anomaly_repo",
    "AlertRepository",
    "alert_repo",
    "TelemetryRepository",
    "telemetry_repo",
]
