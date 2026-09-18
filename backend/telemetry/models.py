"""
backend/telemetry/models.py
Data models and schemas for telemetry streams and packet integrity.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class TelemetryPacket(BaseModel):
    station_id: str
    timestamp: str
    temperature: float
    pressure: float
    humidity: float
    rainfall: Optional[float] = 0.0
    wind_speed: Optional[float] = 12.0
    injected_fault_type: Optional[str] = None
    is_simulated_fault: Optional[bool] = False


class TelemetryValidationResult(BaseModel):
    is_valid: bool
    violations: list[str] = Field(default_factory=list)
    has_physical_bound_violation: bool = False
    details: Dict[str, Any] = Field(default_factory=dict)
