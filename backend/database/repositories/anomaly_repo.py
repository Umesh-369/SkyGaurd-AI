"""
backend/database/repositories/anomaly_repo.py
Repository for detected anomalies and historical incidents.
"""

from typing import Dict, Any, List, Optional
from backend.database.repositories.base_repo import BaseRepository


class AnomalyRepository(BaseRepository):
    def __init__(self):
        super().__init__("anomalies")

    async def get_active_anomalies(
        self,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"is_active": True}
        if category and category != "ALL":
            query["category"] = category
        if severity and severity != "ALL":
            query["severity"] = severity
        return await self.find(query, sort=[("timestamp", -1)], limit=limit)

    async def get_by_id(self, anomaly_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"id": anomaly_id})

    async def upsert_anomaly(self, anomaly_doc: Dict[str, Any]) -> Any:
        doc_id = anomaly_doc.get("id")
        if not doc_id:
            return await self.insert_one(anomaly_doc)
        return await self.update_one({"id": doc_id}, {"$set": anomaly_doc}, upsert=True)

    async def clear_active(self) -> Any:
        return await self.delete_many({"is_active": True})


anomaly_repo = AnomalyRepository()
