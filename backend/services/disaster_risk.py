"""
backend/services/disaster_risk.py
Compatibility wrapper delegating to backend.risk_engine.tier2_risk.
"""

from backend.risk_engine.tier2_risk import DisasterRiskEngine, disaster_risk_engine

__all__ = ["DisasterRiskEngine", "disaster_risk_engine"]
