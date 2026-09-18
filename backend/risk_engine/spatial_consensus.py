"""
backend/risk_engine/spatial_consensus.py
Spatial Consistency Consensus Engine for SkyGuard AI.
Compares target station readings against neighboring station metrics within proximity radius.
Distinguishes between:
  - Isolated Station Anomaly -> Likely Sensor Fault
  - All-Station Anomaly      -> Genuine Weather Event
  - Partial Agreement        -> Requires Investigation
"""

import math
from typing import Dict, Any, List


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes geographical distance in kilometers between two lat/lon points.
    """
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class SpatialConsistencyEngine:
    """
    Determines whether a reading flagged by an anomaly detector is an isolated
    sensor fault or a widespread genuine regional weather event.
    """

    def evaluate_spatial_consensus(
        self,
        target_station: Dict[str, Any],
        target_reading: Dict[str, float],
        neighbor_stations: List[Dict[str, Any]],
        max_radius_km: float = 50.0
    ) -> Dict[str, Any]:
        """
        Cross-checks target_reading against nearby neighbor readings.
        """
        target_lat = target_station.get("coordinates", {}).get("lat", 15.4989)
        target_lon = target_station.get("coordinates", {}).get("lon", 73.8278)

        target_temp = target_reading.get("temperature")
        target_press = target_reading.get("pressure")
        target_humid = target_reading.get("humidity")

        valid_neighbors = []
        for n in neighbor_stations:
            n_id = n.get("station_id")
            if n_id == target_station.get("station_id"):
                continue

            n_lat = n.get("coordinates", {}).get("lat", target_lat)
            n_lon = n.get("coordinates", {}).get("lon", target_lon)

            dist_km = haversine_distance_km(target_lat, target_lon, n_lat, n_lon)
            if dist_km <= max_radius_km and n.get("temperature") is not None:
                valid_neighbors.append({
                    "station_id": n_id,
                    "distance_km": round(dist_km, 2),
                    "temperature": n.get("temperature"),
                    "pressure": n.get("pressure"),
                    "humidity": n.get("humidity"),
                    "is_anomalous": bool(n.get("anomaly_evaluation", {}).get("is_anomaly", False) or n.get("is_anomaly", False))
                })

        if len(valid_neighbors) == 0:
            return {
                "verdict": "SPATIAL_CHECK_INCONCLUSIVE",
                "consensus_classification": "Requires Investigation",
                "neighbor_count": 0,
                "confidence": 0.50,
                "summary": "No nearby stations within search radius to corroborate reading."
            }

        # Calculate distance-weighted neighbor averages
        weights = [1.0 / max(0.5, n["distance_km"]) for n in valid_neighbors]
        sum_w = sum(weights)
        norm_w = [w / sum_w for w in weights]

        avg_n_temp = sum(n["temperature"] * w for n, w in zip(valid_neighbors, norm_w))
        avg_n_press = sum(n["pressure"] * w for n, w in zip(valid_neighbors, norm_w))
        avg_n_humid = sum(n["humidity"] * w for n, w in zip(valid_neighbors, norm_w))

        diff_temp = abs(target_temp - avg_n_temp)
        diff_press = abs(target_press - avg_n_press)

        # Consensus Thresholds: Temp diff < 3.5°C, Pressure diff < 4.0 hPa
        is_corroborated = diff_temp <= 3.5 and diff_press <= 4.0

        # Evaluate consensus across scenarios:
        # Check how many neighbors agree or also show anomalous shifts
        corroborated_count = sum(
            1 for n in valid_neighbors
            if abs(target_temp - n["temperature"]) <= 3.5 and abs(target_press - n["pressure"]) <= 4.0
        )
        total_n = len(valid_neighbors)
        agreement_ratio = corroborated_count / max(1, total_n)

        if agreement_ratio >= 0.75:
            consensus_classification = "Genuine Weather Event"
        elif agreement_ratio == 0:
            consensus_classification = "Likely Sensor Fault"
        else:
            consensus_classification = "Requires Investigation"

        verdict = "CORROBORATED_BY_NEIGHBORS" if is_corroborated else "ISOLATED_SENSOR_FAUL"
        explanation = (
            f"Reading is corroborated by {len(valid_neighbors)} neighboring stations (Temp diff: {diff_temp:.1f}°C, Press diff: {diff_press:.1f} hPa)."
            if is_corroborated else
            f"Reading contradicts {len(valid_neighbors)} neighboring stations (Temp diff: {diff_temp:.1f}°C vs neighbor avg {avg_n_temp:.1f}°C)."
        )

        return {
            "verdict": verdict,
            "consensus_classification": consensus_classification,
            "is_corroborated": is_corroborated,
            "neighbor_count": len(valid_neighbors),
            "distance_weighted_neighbor_avg": {
                "temperature": round(avg_n_temp, 2),
                "pressure": round(avg_n_press, 2),
                "humidity": round(avg_n_humid, 2)
            },
            "deltas": {
                "temp_delta": round(diff_temp, 2),
                "press_delta": round(diff_press, 2)
            },
            "explanation": explanation
        }


spatial_engine = SpatialConsistencyEngine()
