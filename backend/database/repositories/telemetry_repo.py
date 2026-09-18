"""
backend/database/repositories/telemetry_repo.py
Repository for raw telemetry stream frames and station snapshots.
"""

from typing import Dict, Any, List, Optional
from backend.database.repositories.base_repo import BaseRepository


class TelemetryRepository(BaseRepository):
    def __init__(self):
        super().__init__("telemetry")

    async def save_reading(self, reading: Dict[str, Any]) -> Any:
        return await self.insert_one(reading)

    async def get_station_history(self, station_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return await self.find(
            {"station_id": station_id},
            sort=[("timestamp", -1)],
            limit=limit
        )


telemetry_repo = TelemetryRepository()
