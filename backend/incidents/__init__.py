"""
backend/incidents package
Incident lifecycle, anomaly recording, and history archive.
"""

from backend.incidents.incident_service import (
    IncidentService,
    incident_service,
    record_live_anomaly,
    clear_live_anomalies,
    LIVE_ANOMALIES_FEED,
    HISTORICAL_ANOMALIES_ARCHIVE,
    CANONICAL_STATION_NAMES,
    SAMPLE_ANOMALIES,
)

__all__ = [
    "IncidentService",
    "incident_service",
    "record_live_anomaly",
    "clear_live_anomalies",
    "LIVE_ANOMALIES_FEED",
    "HISTORICAL_ANOMALIES_ARCHIVE",
    "CANONICAL_STATION_NAMES",
    "SAMPLE_ANOMALIES",
]
