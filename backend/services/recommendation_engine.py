"""
backend/services/recommendation_engine.py
Compatibility wrapper delegating to backend.recommendations.recommendation_service.
"""

from backend.recommendations.recommendation_service import (
    RecommendationEngine,
    recommendation_engine,
)

__all__ = ["RecommendationEngine", "recommendation_engine"]
