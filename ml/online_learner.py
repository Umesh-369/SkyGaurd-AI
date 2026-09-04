"""
ml/online_learner.py
Online Continual Stream Learning Engine for SkyGuard AI.
Uses Welford's algorithm for online running stats and Page-Hinkley CUSUM to detect Concept Drift.
Adaptively shifts station baseline distributions as seasonal/microclimate trends evolve.
"""

import math
import time
from typing import Dict, Any, List, Optional


class WelfordAccumulator:
    """
    Computes running mean, sample variance, and standard deviation in a single pass.
    """
    def __init__(self, alpha: float = 0.01):
        self.count = 0
        self.mean = 0.0
        self.M2 = 0.0
        self.alpha = alpha  # Exponential smoothing factor for online adaptation

    def update(self, val: float):
        self.count += 1
        delta = val - self.mean
        self.mean += delta / self.count
        delta2 = val - self.mean
        self.M2 += delta * delta2

        # Exponential adaptation for running mean
        if self.count > 30:
            self.mean = (1 - self.alpha) * self.mean + self.alpha * val

    @property
    def variance(self) -> float:
        return self.M2 / (self.count - 1) if self.count > 1 else 1.0

    @property
    def std(self) -> float:
        return math.sqrt(max(1e-4, self.variance))


class PageHinkleyDriftDetector:
    """
    Page-Hinkley test for online Concept Drift detection.
    Monitors cumulative sum of differences from running mean.
    """
    def __init__(self, delta: float = 0.05, threshold: float = 15.0):
        self.delta = delta
        self.threshold = threshold
        self.sum = 0.0
        self.min_sum = 0.0
        self.num_samples = 0

    def update(self, val: float, mean: float) -> Tuple[bool, float]:
        self.num_samples += 1
        self.sum += (val - mean - self.delta)
        if self.sum < self.min_sum:
            self.min_sum = self.sum

        ph_stat = self.sum - self.min_sum
        drift_detected = ph_stat > self.threshold
        drift_ratio = min(1.0, ph_stat / max(1.0, self.threshold))

        if drift_detected:
            # Reset CUSUM on drift alert
            self.sum = 0.0
            self.min_sum = 0.0

        return drift_detected, drift_ratio


class OnlineStreamLearner:
    """
    Manages online continual learning & concept drift detection for all AWS stations.
    """

    def __init__(self):
        self.station_accumulators: Dict[str, Dict[str, WelfordAccumulator]] = {}
        self.station_drift_detectors: Dict[str, Dict[str, PageHinkleyDriftDetector]] = {}
        self.station_drift_scores: Dict[str, float] = {}

    def _get_accumulators(self, station_id: str) -> Dict[str, WelfordAccumulator]:
        if station_id not in self.station_accumulators:
            self.station_accumulators[station_id] = {
                "temperature": WelfordAccumulator(alpha=0.02),
                "pressure": WelfordAccumulator(alpha=0.02),
                "humidity": WelfordAccumulator(alpha=0.02)
            }
            self.station_drift_detectors[station_id] = {
                "temperature": PageHinkleyDriftDetector(delta=0.1, threshold=12.0),
                "pressure": PageHinkleyDriftDetector(delta=0.15, threshold=15.0),
                "humidity": PageHinkleyDriftDetector(delta=0.3, threshold=20.0)
            }
            self.station_drift_scores[station_id] = 0.0
        return self.station_accumulators[station_id]

    def update_stream(self, reading: Dict[str, Any], is_anomaly: bool = False) -> Dict[str, Any]:
        """
        Updates running baselines and checks for concept drift.
        Only updates baseline stats on non-anomalous or mildly anomalous samples to prevent baseline corruption.
        """
        station_id = reading.get("station_id", "AWS-01")
        accs = self._get_accumulators(station_id)
        detectors = self.station_drift_detectors[station_id]

        t = reading.get("temperature", 28.5)
        p = reading.get("pressure", 1012.0)
        rh = reading.get("humidity", 75.0)

        # Update accumulators if not a severe hardware fault
        if not is_anomaly:
            accs["temperature"].update(t)
            accs["pressure"].update(p)
            accs["humidity"].update(rh)

        # Compute drift stats across features
        d_t, ratio_t = detectors["temperature"].update(t, accs["temperature"].mean or t)
        d_p, ratio_p = detectors["pressure"].update(p, accs["pressure"].mean or p)
        d_rh, ratio_rh = detectors["humidity"].update(rh, accs["humidity"].mean or rh)

        composite_drift_ratio = max(ratio_t, ratio_p, ratio_rh)
        concept_drift_index = round(composite_drift_ratio * 100.0, 1)
        self.station_drift_scores[station_id] = concept_drift_index

        drift_status = "STABLE"
        if concept_drift_index >= 75.0:
            drift_status = "SIGNIFICANT_CONCEPT_DRIFT"
        elif concept_drift_index >= 35.0:
            drift_status = "MODERATE_BASELINE_SHIFT"

        return {
            "station_id": station_id,
            "concept_drift_index": concept_drift_index,
            "drift_status": drift_status,
            "running_baselines": {
                "temperature": {"mean": round(accs["temperature"].mean, 2), "std": round(accs["temperature"].std, 2)},
                "pressure": {"mean": round(accs["pressure"].mean, 2), "std": round(accs["pressure"].std, 2)},
                "humidity": {"mean": round(accs["humidity"].mean, 2), "std": round(accs["humidity"].std, 2)}
            },
            "feature_drift_ratios": {
                "temperature": round(ratio_t, 3),
                "pressure": round(ratio_p, 3),
                "humidity": round(ratio_rh, 3)
            }
        }

    def get_station_drift_summary(self, station_id: str) -> Dict[str, Any]:
        accs = self._get_accumulators(station_id)
        drift_idx = self.station_drift_scores.get(station_id, 0.0)
        return {
            "station_id": station_id,
            "concept_drift_index": drift_idx,
            "samples_processed": accs["temperature"].count,
            "adapted_means": {
                "temperature": round(accs["temperature"].mean, 2),
                "pressure": round(accs["pressure"].mean, 2),
                "humidity": round(accs["humidity"].mean, 2)
            }
        }


# Singleton instance
online_stream_learner = OnlineStreamLearner()
