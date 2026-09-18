"""
backend/routers/stations.py
Compatibility wrapper delegating to backend.api.routers.stations.
"""

from backend.api.routers.stations import (
    router,
    list_stations,
    get_station_details,
)

__all__ = ["router", "list_stations", "get_station_details"]
