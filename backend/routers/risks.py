"""
backend/routers/risks.py
Compatibility wrapper delegating to backend.api.routers.risks.
"""

from backend.api.routers.risks import router, get_disaster_risks

__all__ = ["router", "get_disaster_risks"]
