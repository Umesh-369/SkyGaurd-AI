"""
backend/api/routers/alerts.py
Thin REST endpoint for Alert Engine and Notifications.
Delegates directly to backend.alerts.alert_service.
"""

from fastapi import APIRouter
from typing import Optional
from backend.alerts.alert_service import alert_service, SAMPLE_ALERTS

router = APIRouter(prefix="/alerts", tags=["Alert Engine"])


@router.get("")
async def list_alerts(status: str = "ACTIVE", category: Optional[str] = None):
    """
    Returns alerts filtered by status and category (SENSOR_FAULT, WEATHER_HAZARD, COMMUNICATION_FAILURE).
    """
    return alert_service.list_alerts(status=status, category=category)


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    return alert_service.acknowledge_alert(alert_id)


@router.post("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str):
    return alert_service.dismiss_alert(alert_id)
