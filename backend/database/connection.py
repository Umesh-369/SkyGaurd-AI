"""
backend/database/connection.py
Async MongoDB Connection Manager for SkyGuard AI with in-memory document store fallback.
"""

import time
import asyncio
from typing import Dict, Any, List, Optional
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    HAS_MOTOR = True
except ImportError:
    AsyncIOMotorClient = None
    HAS_MOTOR = False

from backend.config import settings


class InMemoryCollection:
    """
    In-memory fallback collection replicating basic PyMongo find/insert/update ops
    if a standalone MongoDB daemon is not running locally.
    """

    def __init__(self, name: str):
        self.name = name
        self.documents: List[Dict[str, Any]] = []

    async def insert_one(self, doc: Dict[str, Any]):
        doc_copy = dict(doc)
        if "_id" not in doc_copy:
            doc_copy["_id"] = str(len(self.documents) + 1)
        self.documents.append(doc_copy)
        return type("InsertResult", (), {"inserted_id": doc_copy["_id"]})()

    async def find(self, filter_query: Optional[Dict[str, Any]] = None, sort: Optional[List] = None, limit: int = 100):
        results = list(self.documents)
        if filter_query:
            filtered = []
            for d in results:
                match = True
                for k, v in filter_query.items():
                    if d.get(k) != v:
                        match = False
                        break
                if match:
                    filtered.append(d)
            results = filtered

        if sort and len(sort) > 0:
            key, direction = sort[0]
            reverse = direction == -1
            results = sorted(results, key=lambda x: x.get(key, 0) or 0, reverse=reverse)

        return InMemoryCursor(results[:limit])

    async def find_one(self, filter_query: Dict[str, Any]):
        cur = await self.find(filter_query, limit=1)
        res = await cur.to_list(1)
        return res[0] if res else None

    async def update_one(self, filter_query: Dict[str, Any], update_doc: Dict[str, Any], upsert: bool = False):
        set_vals = update_doc.get("$set", update_doc)
        for d in self.documents:
            match = True
            for k, v in filter_query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                d.update(set_vals)
                return type("UpdateResult", (), {"matched_count": 1, "modified_count": 1})()

        if upsert:
            new_doc = dict(filter_query)
            new_doc.update(set_vals)
            await self.insert_one(new_doc)
            return type("UpdateResult", (), {"matched_count": 0, "modified_count": 1, "upserted_id": new_doc.get("_id")})()

        return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0})()

    async def count_documents(self, filter_query: Optional[Dict[str, Any]] = None):
        cur = await self.find(filter_query, limit=100000)
        res = await cur.to_list(100000)
        return len(res)

    async def delete_many(self, filter_query: Optional[Dict[str, Any]] = None):
        if not filter_query:
            count = len(self.documents)
            self.documents.clear()
            return type("DeleteResult", (), {"deleted_count": count})()
        initial_len = len(self.documents)
        self.documents = [
            d for d in self.documents
            if not all(d.get(k) == v for k, v in filter_query.items())
        ]
        return type("DeleteResult", (), {"deleted_count": initial_len - len(self.documents)})()


class InMemoryCursor:
    def __init__(self, items: List[Dict[str, Any]]):
        self.items = items

    def sort(self, key, direction=1):
        reverse = direction == -1
        self.items = sorted(self.items, key=lambda x: x.get(key, 0) or 0, reverse=reverse)
        return self

    def limit(self, l: int):
        self.items = self.items[:l]
        return self

    async def to_list(self, length: int = 100):
        return self.items[:length]


class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_connected = False
        self.in_memory_collections: Dict[str, InMemoryCollection] = {}

    async def connect(self):
        if not HAS_MOTOR:
            print("[Database] Motor package not installed. Utilizing high-performance in-memory document store.")
            self.is_connected = False
            return

        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
            await self.client.admin.command('ping')
            self.db = self.client[settings.DATABASE_NAME]
            self.is_connected = True
            print(f"[Database] Successfully connected to MongoDB at {settings.MONGODB_URI}")
        except Exception as e:
            print(f"[Database] MongoDB offline ({e}). Initializing high-performance in-memory document store.")
            self.is_connected = False

    def get_collection(self, collection_name: str):
        if self.is_connected and self.db is not None:
            return self.db[collection_name]
        else:
            if collection_name not in self.in_memory_collections:
                self.in_memory_collections[collection_name] = InMemoryCollection(collection_name)
            return self.in_memory_collections[collection_name]


db_manager = DatabaseManager()
