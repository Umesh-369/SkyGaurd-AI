"""
backend/database/repositories/base_repo.py
Base repository providing asynchronous MongoDB and in-memory CRUD operations.
"""

from typing import Dict, Any, List, Optional
from backend.database.connection import db_manager


class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        return db_manager.get_collection(self.collection_name)

    async def insert_one(self, doc: Dict[str, Any]) -> Any:
        return await self.collection.insert_one(doc)

    async def find(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        sort: Optional[List] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        cur = await self.collection.find(filter_query or {}, sort=sort, limit=limit)
        return await cur.to_list(limit)

    async def find_one(self, filter_query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one(filter_query)

    async def count(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        return await self.collection.count_documents(filter_query or {})

    async def update_one(
        self,
        filter_query: Dict[str, Any],
        update_doc: Dict[str, Any],
        upsert: bool = False
    ) -> Any:
        return await self.collection.update_one(filter_query, update_doc, upsert=upsert)

    async def delete_many(self, filter_query: Optional[Dict[str, Any]] = None) -> Any:
        return await self.collection.delete_many(filter_query or {})
