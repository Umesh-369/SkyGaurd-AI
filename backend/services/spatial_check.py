"""
backend/services/spatial_check.py
Compatibility wrapper delegating to backend.risk_engine.spatial_consensus.
"""

from backend.risk_engine.spatial_consensus import (
    haversine_distance_km,
    SpatialConsistencyEngine,
    spatial_engine,
)

__all__ = ["haversine_distance_km", "SpatialConsistencyEngine", "spatial_engine"]
