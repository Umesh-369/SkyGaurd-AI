"""
backend/alerts package
Alert generation, acknowledgement, and resolution across 3 distinct categories.
"""

from backend.alerts.alert_service import AlertService, alert_service, SAMPLE_ALERTS

__all__ = ["AlertService", "alert_service", "SAMPLE_ALERTS"]
