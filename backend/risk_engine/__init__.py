"""
backend/risk_engine package
Tier 2 disaster risk intelligence and spatial consistency consensus.
"""

from backend.risk_engine.tier2_risk import DisasterRiskEngine, disaster_risk_engine
from backend.risk_engine.spatial_consensus import (
    SpatialConsistencyEngine,
    spatial_engine,
    haversine_distance_km,
)

__all__ = [
    "DisasterRiskEngine",
    "disaster_risk_engine",
    "SpatialConsistencyEngine",
    "spatial_engine",
    "haversine_distance_km",
]
