"""
backend/services/comm_monitor.py
Compatibility wrapper delegating to backend.telemetry.comm_monitor.
"""

from backend.telemetry.comm_monitor import CommunicationMonitor, comm_monitor

__all__ = ["CommunicationMonitor", "comm_monitor"]
