"""
backend/services/ws_manager.py
Compatibility wrapper delegating to backend.api.websocket.ws_manager.
"""

from backend.api.websocket.ws_manager import ConnectionManager, manager

__all__ = ["ConnectionManager", "manager"]
