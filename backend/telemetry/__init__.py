"""
backend/telemetry package
Telemetry ingestion, physical validation, deduplication, and communication monitoring.
"""

from backend.telemetry.models import TelemetryPacket, TelemetryValidationResult
from backend.telemetry.validator import TelemetryValidator, telemetry_validator, PHYSICAL_LIMITS
from backend.telemetry.deduplicator import TelemetryDeduplicator, telemetry_deduplicator
from backend.telemetry.comm_monitor import CommunicationMonitor, comm_monitor

__all__ = [
    "TelemetryPacket",
    "TelemetryValidationResult",
    "TelemetryValidator",
    "telemetry_validator",
    "PHYSICAL_LIMITS",
    "TelemetryDeduplicator",
    "telemetry_deduplicator",
    "CommunicationMonitor",
    "comm_monitor",
]
