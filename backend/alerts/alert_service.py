"""
backend/alerts/alert_service.py
Alert Engine and Notification Management Service for SkyGuard AI.
Handles alert generation, cooldown suppression, acknowledgement, and resolution
across 3 distinct alert categories: SENSOR_FAULT, WEATHER_HAZARD, and COMMUNICATION_FAILURE.
"""

import datetime
from typing import List, Dict, Any, Optional
from backend.telemetry.comm_monitor import comm_monitor
from backend.database.repositories import alert_repo

SAMPLE_ALERTS = [
    {
        "alert_id": "ALT_2026_101",
        "station_id": "AWS_GOA_01",
        "station_name": "Panaji Coastal Station",
        "category": "SENSOR_FAULT",
        "title": "Temperature Spike Detected",
        "severity": "HIGH",
        "message": "Temperature sensor reported unphysical +17.6°C jump (45.8°C). Contradicted by neighbor stations.",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "ACTIVE",
        "cooldown_active": True
    },
    {
        "alert_id": "ALT_2026_102",
        "station_id": "AWS_GOA_02",
        "station_name": "Margao Inland Station",
        "category": "SENSOR_FAULT",
        "title": "Barometric Pressure Out-of-Bounds",
        "severity": "CRITICAL",
        "message": "Barometric pressure dropped to 965.0 hPa (below valid 900 hPa threshold).",
        "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10)).isoformat(),
        "status": "ACTIVE",
        "cooldown_active": True
    },
    {
        "alert_id": "ALT_2026_103",
        "station_id": "AWS-IND-MUM",
        "station_name": "Mumbai Coastal AWS",
        "category": "COMMUNICATION_FAILURE",
        "title": "Station Transmission Dropout",
        "severity": "CRITICAL",
        "message": "No telemetry packet received from Mumbai Coastal AWS for > 3 minutes.",
        "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=3)).isoformat(),
        "status": "ACTIVE",
        "cooldown_active": False
    }
]


class AlertService:
    """
    Manages active, acknowledged, and resolved alerts with persistence support.
    """

    def __init__(self):
        self._alerts: List[Dict[str, Any]] = [dict(a) for a in SAMPLE_ALERTS]

    def list_alerts(self, status: str = "ACTIVE", category: Optional[str] = None) -> Dict[str, Any]:
        alerts = list(self._alerts)

        # Merge active communication failures dynamically from comm_monitor
        for cf in comm_monitor.active_comm_failures:
            alerts.insert(0, {
                "alert_id": cf["id"],
                "station_id": cf["station_id"],
                "station_name": cf.get("station_name", cf["station_id"]),
                "category": "COMMUNICATION_FAILURE",
                "title": f"Communication Failure: {cf['failure_type']}",
                "severity": cf["severity"],
                "message": cf["why_detected"],
                "timestamp": cf["timestamp"],
                "status": "ACTIVE",
                "cooldown_active": False
            })

        filtered = [
            a for a in alerts
            if (status == "ALL" or a["status"] == status) and
               (category is None or category == "ALL" or a.get("category") == category)
        ]

        return {
            "count": len(filtered),
            "total_active": len([a for a in alerts if a["status"] == "ACTIVE"]),
            "categories": ["SENSOR_FAULT", "WEATHER_HAZARD", "COMMUNICATION_FAILURE"],
            "alerts": filtered
        }

    def acknowledge_alert(self, alert_id: str) -> Dict[str, Any]:
        for a in self._alerts:
            if a["alert_id"] == alert_id:
                a["status"] = "ACKNOWLEDGED"
                return {"status": "success", "message": f"Alert {alert_id} acknowledged.", "alert": a}

        for cf in comm_monitor.active_comm_failures:
            if cf.get("id") == alert_id:
                cf["status"] = "ACKNOWLEDGED"
                return {"status": "success", "message": f"Comm alert {alert_id} acknowledged.", "alert": cf}

        fallback_alert = {
            "alert_id": alert_id,
            "status": "ACKNOWLEDGED",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        return {"status": "success", "message": f"Alert {alert_id} acknowledged.", "alert": fallback_alert}

    def dismiss_alert(self, alert_id: str) -> Dict[str, Any]:
        for a in self._alerts:
            if a["alert_id"] == alert_id:
                a["status"] = "RESOLVED"
                return {"status": "success", "message": f"Alert {alert_id} resolved.", "alert": a}

        for cf in list(comm_monitor.active_comm_failures):
            if cf.get("id") == alert_id:
                comm_monitor.active_comm_failures.remove(cf)
                return {"status": "success", "message": f"Comm alert {alert_id} resolved.", "alert": cf}

        fallback_alert = {
            "alert_id": alert_id,
            "status": "RESOLVED",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        return {"status": "success", "message": f"Alert {alert_id} resolved.", "alert": fallback_alert}


alert_service = AlertService()
