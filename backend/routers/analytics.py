"""
backend/routers/analytics.py
Compatibility wrapper delegating to backend.api.routers.analytics.
"""

from backend.api.routers.analytics import router, get_model_metrics, get_edge_model_info

__all__ = ["router", "get_model_metrics", "get_edge_model_info"]
