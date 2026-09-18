"""
backend/explainability/degradation_service.py
Service for tracking sensor health degradation scores and failure likelihoods.
Delegates to ml.degradation (single source of truth for degradation model).
"""

from typing import Dict, Any, List, Optional
from ml.degradation import SensorDegradationTracker


class DegradationService:
    """
    Tracks drift variance, stuck sensor states, and overall station health.
    """

    def __init__(self, tracker: Optional[SensorDegradationTracker] = None):
        self.tracker = tracker or SensorDegradationTracker()

    def calculate_station_health(
        self,
        station_id: str,
        readings_history: List[Dict[str, float]],
        anomalies_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        return self.tracker.calculate_station_health(
            station_id=station_id,
            readings_history=readings_history,
            anomalies_history=anomalies_history
        )


degradation_service = DegradationService()
