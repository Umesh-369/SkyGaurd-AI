"""
backend/telemetry/deduplicator.py
Station-aware deduplication and sequence order validation for incoming telemetry streams.
Guarantees that multiple stations reporting at the exact same timestamp are never treated as duplicates of each other.
"""

import datetime
from typing import Dict, Any, Tuple, Optional


class TelemetryDeduplicator:
    """
    Tracks telemetry timestamps per individual station to detect duplicates and out-of-order packets.
    """

    def __init__(self):
        # Key: station_id -> {"last_timestamp": datetime, "seen_count": int}
        self._station_timestamps: Dict[str, Dict[str, Any]] = {}

    def check_and_register(
        self,
        station_id: str,
        timestamp: datetime.datetime
    ) -> Tuple[bool, str]:
        """
        Validates timestamp against station history.
        Returns:
            (is_duplicate, reason_str)
        """
        st_state = self._station_timestamps.setdefault(station_id, {
            "last_timestamp": None,
            "seen_count": 0
        })

        last_ts = st_state["last_timestamp"]
        if last_ts is not None:
            delta = (timestamp - last_ts).total_seconds()
            if delta == 0 and st_state["seen_count"] > 0:
                return True, f"Duplicate timestamp {timestamp.isoformat()} for station {station_id}."
            if delta < -0.1:
                return True, f"Out-of-order timestamp regression ({abs(delta):.1f}s earlier) for station {station_id}."

        st_state["last_timestamp"] = timestamp
        st_state["seen_count"] += 1
        return False, "Timestamp valid."

    def clear(self, station_id: Optional[str] = None):
        if station_id:
            self._station_timestamps.pop(station_id, None)
        else:
            self._station_timestamps.clear()


telemetry_deduplicator = TelemetryDeduplicator()
