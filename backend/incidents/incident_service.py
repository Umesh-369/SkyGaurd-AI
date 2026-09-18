"""
backend/incidents/incident_service.py
Incident lifecycle and anomaly feed tracking service for SkyGuard AI.
Manages rolling live feed, historical archive, and incident status transitions.
"""

import datetime
from typing import List, Dict, Any, Optional
from backend.database.repositories import anomaly_repo

CANONICAL_STATION_NAMES = {
    "AWS-01": "Panaji Coastal Station",
    "AWS-02": "Margao Inland Station",
    "AWS-03": "Vasco Port Station",
    "AWS-04": "Mapusa North Station",
    "AWS-IND-MUM": "Mumbai Coastal AWS",
    "AWS-IND-DEL": "Delhi National Capital AWS",
    "AWS-IND-BLR": "Bengaluru Plateau AWS",
    "AWS-IND-MAA": "Chennai Coastal AWS",
    "AWS-IND-CCU": "Kolkata Delta AWS",
    "AWS-IND-HYD": "Hyderabad Deccan AWS",
    "AWS-IND-AMD": "Ahmedabad Western AWS",
    "AWS-IND-JAI": "Jaipur Desert Fringe AWS",
    "AWS-IND-LKO": "Lucknow Gangetic AWS",
    "AWS-IND-BHO": "Bhopal Central AWS",
}

SAMPLE_ANOMALIES = [
    {
        "id": "ANOM_2026_001",
        "station_id": "AWS-01",
        "stationId": "AWS-01",
        "station_name": "Panaji Coastal Station",
        "stationName": "Panaji Coastal Station",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "origin": "SIMULATED",
        "status": "Anomaly",
        "category": "SENSOR_FAULT",
        "type": "Temperature",
        "readings": {"temperature": 45.8, "pressure": 1012.1, "humidity": 78.5},
        "is_anomaly": True,
        "isAnomaly": True,
        "severity": "HIGH",
        "root_cause": "temperature_spike",
        "rootCause": "temperature_spike",
        "confidence": 0.9450,
        "isolation_forest_score": -0.2450,
        "spatial_verdict": "CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)",
        "interpretation": "Likely Sensor Fault",
        "why_detected": "Temperature (+45.8°C) is significantly outside the station's expected behavior (+17.6°C delta from baseline 28.2°C) — driven primarily by rate-of-change (dT/dt = +17.3°C, SHAP weight +0.78) — while pressure and humidity remain normal, indicating a likely temperature sensor fault.",
        "contributing_factors": [
            {
                "feature": "temperature",
                "value": 45.8,
                "shap_weight": 0.7850,
                "abs_importance": 0.7850,
                "impact": "HIGH_ANOMALY_RISK",
                "description": "Temperature value +45.80°C deviates severely from station diurnal baseline."
            },
            {
                "feature": "dT",
                "value": 17.3,
                "shap_weight": 0.6120,
                "abs_importance": 0.6120,
                "impact": "HIGH_ANOMALY_RISK",
                "description": "Rapid single-step temperature rate of change flagged by SHAP TreeExplainer."
            },
            {
                "feature": "humidity",
                "value": 78.5,
                "shap_weight": 0.0800,
                "abs_importance": 0.0800,
                "impact": "NEUTRAL",
                "description": "Humidity reading within standard baseline."
            }
        ],
        "imputed_value_suggestion": {
            "target_feature": "temperature",
            "original_value": 45.8,
            "corrected_value": 28.2,
            "difference": -17.6,
            "confidence": 0.9250,
            "method": "HYBRID_SPATIO_TEMPORAL_EMA"
        }
    },
    {
        "id": "ANOM_2026_002",
        "station_id": "AWS-02",
        "stationId": "AWS-02",
        "station_name": "Margao Inland Station",
        "stationName": "Margao Inland Station",
        "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10)).isoformat(),
        "origin": "SIMULATED",
        "status": "Anomaly",
        "category": "SENSOR_FAULT",
        "type": "Pressure",
        "readings": {"temperature": 29.2, "pressure": 965.0, "humidity": 82.0},
        "is_anomaly": True,
        "isAnomaly": True,
        "severity": "CRITICAL",
        "root_cause": "pressure_drop",
        "rootCause": "pressure_drop",
        "confidence": 0.9850,
        "isolation_forest_score": -0.3850,
        "spatial_verdict": "CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)",
        "interpretation": "Likely Sensor Fault",
        "why_detected": "Barometric pressure (965.0 hPa) dropped below valid physical sensor bounds (900-1060 hPa) with extreme rate of change — driven by pressure delta (SHAP weight +0.89) — indicating an isolated pressure transducer failure.",
        "contributing_factors": [
            {
                "feature": "pressure",
                "value": 965.0,
                "shap_weight": 0.8920,
                "abs_importance": 0.8920,
                "impact": "HIGH_ANOMALY_RISK",
                "description": "Pressure 965.0 hPa is below valid physical sensor bounds."
            },
            {
                "feature": "dP",
                "value": -46.2,
                "shap_weight": 0.7450,
                "abs_importance": 0.7450,
                "impact": "HIGH_ANOMALY_RISK",
                "description": "Abrupt step drop in barometric pressure."
            }
        ],
        "imputed_value_suggestion": {
            "target_feature": "pressure",
            "original_value": 965.0,
            "corrected_value": 1011.2,
            "difference": 46.2,
            "confidence": 0.9400,
            "method": "HYBRID_SPATIO_TEMPORAL_EMA"
        }
    }
]

# Shared memory feeds
LIVE_ANOMALIES_FEED: List[Dict[str, Any]] = list(SAMPLE_ANOMALIES)
HISTORICAL_ANOMALIES_ARCHIVE: List[Dict[str, Any]] = list(SAMPLE_ANOMALIES)


def _archive_anomaly_record(record: Dict[str, Any]):
    rec_id = record.get("id")
    for idx, h in enumerate(HISTORICAL_ANOMALIES_ARCHIVE):
        if h.get("id") == rec_id:
            HISTORICAL_ANOMALIES_ARCHIVE[idx] = dict(record)
            return
    HISTORICAL_ANOMALIES_ARCHIVE.insert(0, dict(record))
    if len(HISTORICAL_ANOMALIES_ARCHIVE) > 500:
        HISTORICAL_ANOMALIES_ARCHIVE.pop()


def record_live_anomaly(
    reading: Dict[str, Any],
    pred: Dict[str, Any],
    factors: List[Dict[str, Any]],
    imputed: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    st_id = reading["station_id"]
    st_name = CANONICAL_STATION_NAMES.get(st_id) or reading.get("station_name") or CANONICAL_STATION_NAMES["AWS-01"]

    category = pred.get("category") or ("COMMUNICATION_FAILURE" if "comm" in str(pred.get("status", "")).lower() else "SENSOR_FAULT")
    root_cause = reading.get("injected_fault_type") or pred.get("root_cause") or "sensor_anomaly"
    if root_cause == "NONE":
        root_cause = pred.get("root_cause") or "sensor_anomaly"

    status = pred.get("status") or ("Communication Failure" if category == "COMMUNICATION_FAILURE" else "Anomaly")
    interpretation = pred.get("interpretation") or ("Communication Failure" if category == "COMMUNICATION_FAILURE" else "Likely Sensor Fault")
    why_detected = pred.get("why_detected") or f"Anomaly flagged on {st_name} by IsolationForest model."

    # Update in-place in LIVE_ANOMALIES_FEED if exists
    for entry in LIVE_ANOMALIES_FEED:
        if entry["station_id"] == st_id and (entry.get("root_cause") == root_cause or entry.get("rootCause") == root_cause):
            entry["timestamp"] = reading["timestamp"]
            entry["readings"] = {
                "temperature": reading["temperature"],
                "pressure": reading["pressure"],
                "humidity": reading["humidity"]
            }
            entry["status"] = status
            entry["category"] = category
            entry["confidence"] = pred.get("confidence")
            entry["severity"] = pred.get("severity", "HIGH")
            entry["isolation_forest_score"] = pred.get("isolation_forest_score", -0.25)
            entry["spatial_verdict"] = pred.get("spatial_verdict", "NOT_CHECKED")
            entry["interpretation"] = interpretation
            entry["why_detected"] = why_detected
            if factors:
                entry["contributing_factors"] = factors
            if imputed:
                entry["imputed_value_suggestion"] = imputed
            _archive_anomaly_record(entry)
            return entry

    anom_entry = {
        "id": f"EVT_{st_id}_{root_cause}",
        "station_id": st_id,
        "stationId": st_id,
        "station_name": st_name,
        "stationName": st_name,
        "timestamp": reading["timestamp"],
        "origin": reading.get("origin", "SIMULATED"),
        "status": status,
        "category": category,
        "type": pred.get("type", "Temperature"),
        "readings": {
            "temperature": reading["temperature"],
            "pressure": reading["pressure"],
            "humidity": reading["humidity"]
        },
        "is_anomaly": True,
        "isAnomaly": True,
        "severity": pred.get("severity", "HIGH"),
        "root_cause": root_cause,
        "rootCause": root_cause,
        "confidence": pred.get("confidence"),
        "isolation_forest_score": pred.get("isolation_forest_score", -0.25),
        "spatial_verdict": pred.get("spatial_verdict", "NOT_CHECKED"),
        "interpretation": interpretation,
        "why_detected": why_detected,
        "contributing_factors": factors,
        "imputed_value_suggestion": imputed
    }

    LIVE_ANOMALIES_FEED.insert(0, anom_entry)
    if len(LIVE_ANOMALIES_FEED) > 50:
        LIVE_ANOMALIES_FEED.pop()

    _archive_anomaly_record(anom_entry)
    return anom_entry


def clear_live_anomalies():
    LIVE_ANOMALIES_FEED.clear()


class IncidentService:
    """
    Service layer orchestrating anomaly queries and historical archive retrieval.
    """

    @property
    def live_feed(self) -> List[Dict[str, Any]]:
        return LIVE_ANOMALIES_FEED

    @property
    def historical_archive(self) -> List[Dict[str, Any]]:
        return HISTORICAL_ANOMALIES_ARCHIVE

    def get_feed(self, category: Optional[str] = None, severity: Optional[str] = None, limit: int = 30) -> Dict[str, Any]:
        filtered = LIVE_ANOMALIES_FEED
        if category and category != "ALL":
            filtered = [a for a in filtered if a.get("category") == category]
        if severity and severity != "ALL":
            filtered = [a for a in filtered if a.get("severity") == severity]

        return {
            "tier_label": "TIER 1 — CORE ANOMALY DETECTION & COMMUNICATION FEED",
            "categories": ["SENSOR_FAULT", "GENUINE_WEATHER_EVENT", "COMMUNICATION_FAILURE"],
            "count": len(filtered),
            "total_active": len(LIVE_ANOMALIES_FEED),
            "anomalies": filtered[:limit]
        }

    def get_by_id(self, anomaly_id: str) -> Optional[Dict[str, Any]]:
        for a in LIVE_ANOMALIES_FEED:
            if a.get("id") == anomaly_id:
                return {"anomaly": a, "is_active": True, "is_historical": False}

        for a in HISTORICAL_ANOMALIES_ARCHIVE:
            if a.get("id") == anomaly_id:
                return {"anomaly": a, "is_active": False, "is_historical": True}

        for a in HISTORICAL_ANOMALIES_ARCHIVE:
            if anomaly_id in a.get("id", "") or a.get("station_id") == anomaly_id:
                return {"anomaly": a, "is_active": False, "is_historical": True}

        return None

    def record_anomaly(self, reading: Dict[str, Any], pred: Dict[str, Any], factors: List[Dict[str, Any]], imputed: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return record_live_anomaly(reading, pred, factors, imputed)

    def clear(self):
        clear_live_anomalies()


incident_service = IncidentService()
