"""
backend/api/routers/reports.py
Thin REST endpoint for Official Incident Dossiers & PDF/HTML Reports.
Delegates to backend.reports.report_service.
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from backend.reports.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Incident Reports & Dossiers"])


@router.get("/{anomaly_id}")
async def get_incident_dossier(anomaly_id: str):
    """
    Returns structured incident report dossier with SHA256 checksum and diagnostic narrative.
    """
    return report_service.generate_incident_dossier(anomaly_id)


@router.get("/{anomaly_id}/html", response_class=HTMLResponse)
async def get_incident_html_report(anomaly_id: str):
    """
    Returns printable HTML diagnostic report suitable for browser print-to-PDF.
    """
    return report_service.generate_html_report(anomaly_id)
