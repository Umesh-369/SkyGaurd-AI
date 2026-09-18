"""
backend/routers/anomalies.py
Compatibility wrapper delegating to backend.api.routers.anomalies and backend.incidents.
"""

from backend.api.routers.anomalies import (
    router,
    get_anomaly_by_id,
    clear_anomalies_endpoint,
    get_anomalies_feed,
    evaluate_custom_reading,
    get_anomaly_recommendations,
    get_historical_dataset_stream,
)
from backend.incidents.incident_service import (
    incident_service,
    record_live_anomaly,
    clear_live_anomalies,
    LIVE_ANOMALIES_FEED,
    HISTORICAL_ANOMALIES_ARCHIVE,
    CANONICAL_STATION_NAMES,
    SAMPLE_ANOMALIES,
)

__all__ = [
    "router",
    "get_anomaly_by_id",
    "clear_anomalies_endpoint",
    "get_anomalies_feed",
    "evaluate_custom_reading",
    "get_anomaly_recommendations",
    "get_historical_dataset_stream",
    "incident_service",
    "record_live_anomaly",
    "clear_live_anomalies",
    "LIVE_ANOMALIES_FEED",
    "HISTORICAL_ANOMALIES_ARCHIVE",
    "CANONICAL_STATION_NAMES",
    "SAMPLE_ANOMALIES",
]
