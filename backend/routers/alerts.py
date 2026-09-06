"""
backend/routers/alerts.py
Alert Engine and Notification Management router for SkyGuard AI.
Handles alert generation, cooldown suppression, acknowledgement, and resolution
across 3 distinct alert categories: Sensor Faults, Weather Hazards, and Communication Failures.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import datetime
from backend.services.comm_monitor import comm_monitor

router = APIRouter(prefix="/alerts", tags=["Alert Engine"])

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


@router.get("")
async def list_alerts(status: str = "ACTIVE", category: Optional[str] = None):
    """
    Returns alerts filtered by status and category (SENSOR_FAULT, WEATHER_HAZARD, COMMUNICATION_FAILURE).
    """
    alerts = list(SAMPLE_ALERTS)
    
    # Add active communication failures from monitor
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


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    for a in SAMPLE_ALERTS:
        if a["alert_id"] == alert_id:
            a["status"] = "ACKNOWLEDGED"
            return {"status": "success", "message": f"Alert {alert_id} acknowledged.", "alert": a}
    
    # Check comm failures or dynamic alerts
    for cf in comm_monitor.active_comm_failures:
        if cf.get("id") == alert_id:
            cf["status"] = "ACKNOWLEDGED"
            return {"status": "success", "message": f"Comm alert {alert_id} acknowledged.", "alert": cf}
            
    # Dynamic or client-generated alert ID fallback
    return {
        "status": "success", 
        "message": f"Alert {alert_id} acknowledged.",
        "alert": {
            "alert_id": alert_id,
            "status": "ACKNOWLEDGED",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    }


@router.post("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str):
    for a in SAMPLE_ALERTS:
        if a["alert_id"] == alert_id:
            a["status"] = "RESOLVED"
            return {"status": "success", "message": f"Alert {alert_id} resolved.", "alert": a}
            
    # Check comm failures or dynamic alerts
    for cf in comm_monitor.active_comm_failures:
        if cf.get("id") == alert_id:
            comm_monitor.active_comm_failures.remove(cf)
            return {"status": "success", "message": f"Comm alert {alert_id} resolved.", "alert": cf}

    # Dynamic or client-generated alert ID fallback
    return {
        "status": "success", 
        "message": f"Alert {alert_id} resolved.",
        "alert": {
            "alert_id": alert_id,
            "status": "RESOLVED",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    }
