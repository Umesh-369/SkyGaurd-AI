"""
backend/recommendations package
Deterministic corrective action and playbook engine.
"""

from backend.recommendations.recommendation_service import RecommendationEngine, recommendation_engine

__all__ = ["RecommendationEngine", "recommendation_engine"]
