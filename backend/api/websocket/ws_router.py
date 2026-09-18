"""
backend/api/websocket/ws_router.py
WebSocket streaming router for real-time telemetry updates.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.api.websocket.ws_manager import manager

router = APIRouter()


@router.websocket("/ws/readings")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"[WebSocket] Client connected. Total active: {len(manager.active_connections)}")
    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("[WebSocket] Client disconnected")
