"""
backend/telemetry/comm_monitor.py
Communication Failure & Network Heartbeat Monitor for Automatic Weather Stations.
Tracks per-station telemetry timing, packet sequence, missing readings, delays, and offline states.
Classifies Communication Failures as a distinct 3rd category (not a subtype of sensor anomalies).
"""

import datetime
from typing import Dict, Any, List, Optional, Tuple
from backend.telemetry.deduplicator import TelemetryDeduplicator


class CommunicationMonitor:
    """
    Monitors telemetry transmission integrity across all AWS nodes.
    Detects missing data, packet delays, duplicate timestamps, out-of-order data, and station offline events.
    """

    def __init__(self, expected_interval_sec: float = 3.0, max_gap_multiplier: float = 3.0):
        self.expected_interval_sec = expected_interval_sec
        self.max_gap_sec = expected_interval_sec * max_gap_multiplier
        
        # Per-station tracking table
        self.station_state: Dict[str, Dict[str, Any]] = {}
        self.active_comm_failures: List[Dict[str, Any]] = []
        self.deduplicator = TelemetryDeduplicator()

    def register_reading(
        self,
        station_id: str,
        timestamp: datetime.datetime,
        raw_reading: Dict[str, Any]
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Inspects incoming reading metadata against transmission integrity rules.
        Returns:
            is_comm_failure (bool): True if communication anomaly detected.
            failure_record (Optional[Dict]): Structured 3rd-category failure record if anomalous.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        st = self.station_state.setdefault(station_id, {
            "station_id": station_id,
            "last_seen_ts": None,
            "last_reading_ts": None,
            "packet_count": 0,
            "consecutive_timeouts": 0,
            "is_offline": False
        })

        is_failure = False
        failure_type = "NONE"
        severity = "LOW"
        detail_msg = "Transmission nominal."

        # Check explicitly simulated comm fault flag
        injected_type = raw_reading.get("injected_fault_type", "").lower()
        is_paused = raw_reading.get("is_paused_snapshot", False)

        if "offline" in injected_type or "missing" in injected_type:
            is_failure = True
            failure_type = "STATION_OFFLINE"
            severity = "CRITICAL"
            detail_msg = f"Station {station_id} is completely offline. No telemetry packets received."
        elif "delay" in injected_type or "long_gap" in injected_type:
            is_failure = True
            failure_type = "DELAYED_DATA_PACKET"
            severity = "HIGH"
            detail_msg = f"Transmission delay on {station_id}: Telemetry packet latency exceeded safety bounds."
        elif "duplicate" in injected_type:
            is_failure = True
            failure_type = "DUPLICATE_DATA_PACKET"
            severity = "MEDIUM"
            detail_msg = f"Duplicate telemetry packet received from {station_id} ({timestamp.isoformat()}). Packet dropped."

        # Check timestamp integrity if previous reading exists for this specific station and not paused
        if not is_failure and not is_paused and st["last_reading_ts"] is not None:
            last_ts = st["last_reading_ts"]
            gap_sec = (timestamp - last_ts).total_seconds()

            if gap_sec < -0.1:
                # Out of order data (timestamp regression on the same station stream)
                is_failure = True
                failure_type = "OUT_OF_ORDER_PACKET"
                severity = "MEDIUM"
                detail_msg = f"Out-of-order data received from {station_id} (timestamp regression: {abs(gap_sec):.1f}s earlier than previous reading)."
            elif gap_sec == 0 and st["packet_count"] > 0:
                # Genuine duplicate packet from the same station on active live stream
                is_failure = True
                failure_type = "DUPLICATE_DATA_PACKET"
                severity = "LOW"
                detail_msg = f"Duplicate timestamp received from {station_id} ({timestamp.isoformat()}). Packet dropped."
            elif gap_sec > (self.max_gap_sec * 2):
                # Long transmission gap on active live stream
                is_failure = True
                failure_type = "LONG_TRANSMISSION_GAP"
                severity = "HIGH"
                detail_msg = f"Long gap detected on {station_id}: {gap_sec:.1f}s elapsed between consecutive telemetry packets."

        # Update tracking state
        st["last_seen_ts"] = now
        st["last_reading_ts"] = timestamp
        st["packet_count"] += 1
        st["is_offline"] = (failure_type == "STATION_OFFLINE")

        if is_failure:
            why_msg = f"Communication Failure — {detail_msg} Sensor evaluation bypassed."
            record = {
                "id": f"COMM_{station_id}_{failure_type}_{now.strftime('%H%M%S')}",
                "station_id": station_id,
                "stationId": station_id,
                "timestamp": timestamp.isoformat(),
                "status": "Communication Failure",
                "category": "COMMUNICATION_FAILURE",
                "type": "Communication",
                "severity": severity,
                "confidence": None,
                "is_deterministic": True,
                "failure_type": failure_type,
                "root_cause": failure_type.lower(),
                "interpretation": "Communication Failure",
                "why_detected": why_msg,
                "detail": detail_msg,
                "readings": {
                    "temperature": raw_reading.get("temperature", 0.0),
                    "pressure": raw_reading.get("pressure", 0.0),
                    "humidity": raw_reading.get("humidity", 0.0)
                }
            }
            # Add to active failures list
            self.active_comm_failures.insert(0, record)
            if len(self.active_comm_failures) > 30:
                self.active_comm_failures.pop()
            return True, record

        return False, None

    def check_for_offline_stations(self, all_station_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Scans all registered stations for silence exceeding timeout threshold.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        offline_alerts = []

        for st_id in all_station_ids:
            st = self.station_state.get(st_id)
            if not st or st["last_seen_ts"] is None:
                continue

            silence_sec = (now - st["last_seen_ts"]).total_seconds()
            if silence_sec > 15.0:  # 15s without any reading
                st["is_offline"] = True
                alert = {
                    "id": f"COMM_TIMEOUT_{st_id}",
                    "station_id": st_id,
                    "timestamp": now.isoformat(),
                    "status": "Communication Failure",
                    "category": "COMMUNICATION_FAILURE",
                    "type": "Communication",
                    "severity": "CRITICAL",
                    "confidence": None,
                    "is_deterministic": True,
                    "failure_type": "STATION_OFFLINE_TIMEOUT",
                    "root_cause": "station_offline_timeout",
                    "interpretation": "Communication Failure",
                    "why_detected": f"Communication Failure — No telemetry received from Station {st_id} for {int(silence_sec)}s (Station Offline). Sensor evaluation bypassed."
                }
                offline_alerts.append(alert)

        return offline_alerts


# Global instance
comm_monitor = CommunicationMonitor()
