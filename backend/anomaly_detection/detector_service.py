"""
backend/anomaly_detection/detector_service.py
Service layer for Tier 1 Anomaly Detection.
Delegates directly to ml.anomaly_detector (the single source of truth for feature engineering,
fitted scaler, and Isolation Forest model) to preserve exact parity between training and inference.
"""

from typing import Dict, Any, List, Optional, Tuple
import datetime
from ml.anomaly_detector import detector_instance, Tier1AnomalyDetector


class AnomalyDetectorService:
    """
    Service wrapper around the canonical ML anomaly detection model.
    """

    def __init__(self, detector: Tier1AnomalyDetector = detector_instance):
        self.detector = detector

    def load_model(self):
        """Loads model artifacts and scalers."""
        return self.detector.load()

    def verify_feature_schema(self) -> Tuple[bool, str]:
        """Validates loaded model against expected canonical schema."""
        return self.detector.verify_feature_schema()

    def predict_single(
        self,
        temperature: float,
        pressure: float,
        humidity: float,
        station_id: str = "AWS-01",
        timestamp: Optional[datetime.datetime] = None,
        spatial_neighbors: Optional[List[Dict[str, Any]]] = None,
        recent_history: Optional[List[Dict[str, float]]] = None
    ) -> Dict[str, Any]:
        """
        Runs live inference using canonical feature extractor, fitted scaler, and model.
        """
        return self.detector.predict_single(
            temperature=temperature,
            pressure=pressure,
            humidity=humidity,
            station_id=station_id,
            timestamp=timestamp,
            spatial_neighbors=spatial_neighbors,
            recent_history=recent_history
        )

    @property
    def version(self) -> str:
        return self.detector.version

    @property
    def schema_hash(self) -> str:
        return self.detector.schema_hash

    @property
    def threshold(self) -> float:
        return self.detector.threshold


detector_service = AnomalyDetectorService()
