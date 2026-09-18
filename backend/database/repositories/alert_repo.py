"""
backend/database/repositories/alert_repo.py
Repository for system alerts across sensor faults, weather hazards, and communication failures.
"""

from typing import Dict, Any, List, Optional
from backend.database.repositories.base_repo import BaseRepository


class AlertRepository(BaseRepository):
    def __init__(self):
        super().__init__("alerts")

    async def get_alerts(
        self,
        status: Optional[str] = "ACTIVE",
        category: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if status and status != "ALL":
            query["status"] = status
        if category and category != "ALL":
            query["category"] = category
        return await self.find(query, sort=[("timestamp", -1)], limit=limit)

    async def get_by_id(self, alert_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"alert_id": alert_id})

    async def update_status(self, alert_id: str, new_status: str) -> Any:
        return await self.update_one({"alert_id": alert_id}, {"$set": {"status": new_status}})

    async def upsert_alert(self, alert_doc: Dict[str, Any]) -> Any:
        doc_id = alert_doc.get("alert_id")
        if not doc_id:
            return await self.insert_one(alert_doc)
        return await self.update_one({"alert_id": doc_id}, {"$set": alert_doc}, upsert=True)


alert_repo = AlertRepository()
