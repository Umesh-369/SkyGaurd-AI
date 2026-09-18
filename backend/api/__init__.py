"""
backend/api package
Thin REST and WebSocket presentation layer for SkyGuard AI.
"""

from fastapi import APIRouter
from backend.api.routers import auth, stations, anomalies, simulator, risks, alerts, analytics, reports
from backend.api.websocket.ws_manager import manager, ConnectionManager
from backend.api.websocket.ws_router import router as ws_router

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(stations.router)
api_router.include_router(anomalies.router)
api_router.include_router(simulator.router)
api_router.include_router(risks.router)
api_router.include_router(alerts.router)
api_router.include_router(analytics.router)
api_router.include_router(reports.router)

__all__ = [
    "api_router",
    "ws_router",
    "manager",
    "ConnectionManager",
    "auth",
    "stations",
    "anomalies",
    "simulator",
    "risks",
    "alerts",
    "analytics",
    "reports",
]
