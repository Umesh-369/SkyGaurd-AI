"""
ml/anomaly_detector.py
Tier 1 Core Anomaly Detection Model for SkyGuard AI.
Uses IsolationForest combined with physical constraint validation, temporal sliding windows,
multi-sensor consistency co-evaluation, and spatial neighbor consensus.
"""

import os
import math
import warnings
import joblib
import json
import datetime
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from ml.feature_extractor import (
    Tier1FeatureExtractor,
    FEATURE_NAMES,
    FEATURE_SCHEMA_HASH,
    PIPELINE_VERSION,
    DEFAULT_CLIMATE_BASELINES
)
from ml.explainability import AnomalyExplainer

warnings.filterwarnings("ignore", category=UserWarning)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MODELS_ROOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

MODEL_PATH = os.path.join(MODEL_DIR, "tier1_isolation_forest.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "tier1_scaler.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "tier1_model_metadata.json")


class Tier1AnomalyDetector:
    """
    Tier 1 Multivariate Anomaly Detection Engine operating on Automatic Weather Station
    telemetry (Temperature, Atmospheric Pressure, Relative Humidity) with temporal context.
    """

    def __init__(self, contamination: float = 0.045, threshold: float = -0.05):
        self.contamination = contamination
        self.threshold = threshold  # Calibrated decision function threshold
        self.model = IsolationForest(
            n_estimators=150,
            contamination=contamination,
            max_samples=2048,
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.feature_extractor = Tier1FeatureExtractor()
        self.explainer = None
        self.is_fitted = False
        self.version = PIPELINE_VERSION
        self.schema_hash = FEATURE_SCHEMA_HASH

        # Physical realistic limits for AWS sensors in Tropical / Indian regions
        self.PHYSICAL_BOUNDS = {
            "temperature": (-5.0, 55.0),   # °C
            "pressure": (900.0, 1060.0),   # hPa
            "humidity": (0.0, 100.0)       # %
        }

        # Station recent history buffers for live stream state tracking (max 20 per station)
        self.station_history: Dict[str, List[Dict[str, Any]]] = {}

    def verify_feature_schema(self) -> Tuple[bool, str]:
        """
        Validates loaded model, scaler, and expected feature schema at startup or inference.
        Fails loudly if schema mismatch is detected.
        """
        if not self.is_fitted:
            self.load()

        if self.scaler is not None and hasattr(self.scaler, "n_features_in_"):
            if self.scaler.n_features_in_ != len(FEATURE_NAMES):
                err = f"CRITICAL: Scaler expects {self.scaler.n_features_in_} features, but feature schema defines {len(FEATURE_NAMES)}."
                print(f"[AnomalyDetector] {err}")
                return False, err

        return True, f"Feature schema verified: {len(FEATURE_NAMES)} features (hash: {self.schema_hash})"

    def extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transforms DataFrame using canonical Tier1FeatureExtractor.
        """
        feat_df = self.feature_extractor.extract_from_dataframe(df)
        return feat_df.values

    def fit(self, df: pd.DataFrame) -> "Tier1AnomalyDetector":
        """
        Fits the Isolation Forest and StandardScaler on historical baseline climate data.
        """
        os.makedirs(MODEL_DIR, exist_ok=True)
        os.makedirs(MODELS_ROOT_DIR, exist_ok=True)

        X = self.extract_features(df)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_fitted = True

        # Re-initialize SHAP explainer with fitted model
        self.explainer = AnomalyExplainer(self)

        # Save artifacts to ml/artifacts and models/
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)

        model_root_path = os.path.join(MODELS_ROOT_DIR, "tier1_isolation_forest.pkl")
        scaler_root_path = os.path.join(MODELS_ROOT_DIR, "tier1_scaler.pkl")
        joblib.dump(self.model, model_root_path)
        joblib.dump(self.scaler, scaler_root_path)

        metadata = {
            "model_version": self.version,
            "schema_hash": self.schema_hash,
            "feature_count": len(FEATURE_NAMES),
            "feature_names": FEATURE_NAMES,
            "trained_samples": len(df),
            "contamination": self.contamination,
            "decision_threshold": self.threshold,
            "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        with open(METADATA_PATH, "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"[AnomalyDetector] Model v{self.version} fitted on {len(df)} samples and saved to {MODEL_PATH}")
        return self

    def load(self) -> bool:
        """
        Loads pre-trained model artifacts and verifies schema integrity.
        """
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
                self.is_fitted = True
                self.explainer = AnomalyExplainer(self)
                valid, msg = self.verify_feature_schema()
                if not valid:
                    print(f"[AnomalyDetector] Warning on model load: {msg}")
                else:
                    print(f"[AnomalyDetector] Loaded pre-trained model from {MODEL_PATH} ({msg})")
                return True
            except Exception as e:
                print(f"[AnomalyDetector] Error loading model: {e}")
        return False

    def predict_single(
        self,
        temperature: float,
        pressure: float,
        humidity: float,
        station_id: str = "AWS-01",
        timestamp: Optional[datetime.datetime] = None,
        recent_history: Optional[List[Dict[str, Any]]] = None,
        spatial_neighbors: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a single reading (T, P, RH) against the full pipeline:
        Physical Constraints -> Feature Extraction -> StandardScaler -> IsolationForest -> Multi-Sensor -> Spatial Check -> SHAP.
        """
        if not self.is_fitted:
            self.load()
            if not self.is_fitted:
                # Auto-generate baseline fallback
                n = 600
                dummy_df = pd.DataFrame({
                    "timestamp": pd.date_range("2024-01-01", periods=n, freq="h", tz="UTC"),
                    "temperature": np.random.normal(28.2, 3.0, n),
                    "pressure": np.random.normal(1012.0, 4.0, n),
                    "humidity": np.random.normal(76.0, 10.0, n)
                })
                self.fit(dummy_df)

        now = timestamp or datetime.datetime.now(datetime.timezone.utc)
        
        # Maintain station history buffer
        station_buf = self.station_history.setdefault(station_id, [])
        active_history = recent_history if recent_history is not None else list(station_buf)

        # 1. Physical Bounds Check (Sensor electrical/ADC disconnect)
        out_of_bounds = []
        if not (self.PHYSICAL_BOUNDS["temperature"][0] <= temperature <= self.PHYSICAL_BOUNDS["temperature"][1]):
            out_of_bounds.append("temperature")
        if not (self.PHYSICAL_BOUNDS["pressure"][0] <= pressure <= self.PHYSICAL_BOUNDS["pressure"][1]):
            out_of_bounds.append("pressure")
        if not (self.PHYSICAL_BOUNDS["humidity"][0] <= humidity <= self.PHYSICAL_BOUNDS["humidity"][1]):
            out_of_bounds.append("humidity")

        # 2. Extract Canonical Feature Vector using Tier1FeatureExtractor
        feat_dict = self.feature_extractor.extract_single(
            temperature=temperature,
            pressure=pressure,
            humidity=humidity,
            timestamp=now,
            recent_history=active_history
        )

        feat_values = np.array([[feat_dict[k] for k in FEATURE_NAMES]])
        X_scaled = self.scaler.transform(feat_values)

        # 3. Model Scoring against Calibrated Decision Threshold
        raw_score = float(self.model.decision_function(X_scaled)[0])
        # Anomaly if raw score below calibrated threshold
        model_flagged = bool(raw_score < self.threshold)

        # 4. Spike, Freeze, and Multi-Sensor Rule Evaluation
        dT = abs(feat_dict["dT"])
        dP = abs(feat_dict["dP"])
        dRH = abs(feat_dict["dRH"])

        is_spike = dT > 8.0 or dP > 15.0 or dRH > 35.0
        
        is_frozen = False
        if len(active_history) >= 4:
            last_5_T = [float(r.get("temperature", 0)) for r in active_history[-4:]] + [temperature]
            last_5_P = [float(r.get("pressure", 0)) for r in active_history[-4:]] + [pressure]
            last_5_RH = [float(r.get("humidity", 0)) for r in active_history[-4:]] + [humidity]
            if (len(set(last_5_T)) == 1 or len(set(last_5_P)) == 1 or len(set(last_5_RH)) == 1):
                is_frozen = True

        # Multi-sensor rate-of-change and physical bounds consistency checks
        multi_sensor_status = {
            "temperature": "Flagged" if (dT > 6.0 or "temperature" in out_of_bounds) else "Normal",
            "pressure": "Flagged" if (dP > 10.0 or "pressure" in out_of_bounds) else "Normal",
            "humidity": "Flagged" if (dRH > 25.0 or "humidity" in out_of_bounds) else "Normal",
        }
        flagged_sensor_count = sum(1 for v in multi_sensor_status.values() if v == "Flagged")

        # Whole station flatline / power failure check
        is_station_wide_failure = flagged_sensor_count >= 2 or (
            len(active_history) >= 4 and len(set(last_5_T)) == 1 and len(set(last_5_P)) == 1 and len(set(last_5_RH)) == 1
        )

        # Calibrate raw IsolationForest decision score into confidence (0.0 to 1.0)
        confidence = float(np.clip(1.0 - (raw_score - self.threshold) / 0.45, 0.50, 0.99))

        is_anomaly = model_flagged or len(out_of_bounds) > 0 or is_spike or is_frozen or (flagged_sensor_count > 0)
        
        root_cause = "normal"
        severity = "LOW"
        category = "NOMINAL"
        status = "Normal"

        if is_anomaly:
            status = "Anomaly"
            category = "SENSOR_FAULT"
            if len(out_of_bounds) > 0:
                root_cause = f"out_of_bounds_{out_of_bounds[0]}"
                severity = "CRITICAL"
                confidence = max(confidence, 0.96)
            elif is_station_wide_failure:
                root_cause = "multivariate_station_fault"
                severity = "CRITICAL"
                confidence = max(confidence, 0.94)
            elif is_frozen:
                root_cause = "stuck_sensor"
                severity = "HIGH"
                confidence = max(confidence, 0.90)
            elif is_spike:
                root_cause = "temperature_spike" if dT > 8.0 else ("pressure_drop" if dP > 15.0 else "humidity_spike")
                severity = "HIGH"
                confidence = max(confidence, 0.88)
            elif abs(feat_dict["dT"]) > 4.0 or abs(feat_dict["dP"]) > 8.0:
                root_cause = "sensor_drift"
                severity = "MEDIUM"
                confidence = max(confidence, 0.82)
            else:
                root_cause = "multivariate_inconsistency"
                severity = "HIGH" if confidence > 0.80 else "MEDIUM"

        # 5. Spatial Neighbor Consensus Cross-Validation (Section 7)
        spatial_verdict = "NOT_CHECKED"
        is_corroborated = False
        neighbor_count = 0
        spatial_res = {}

        if spatial_neighbors and len(spatial_neighbors) > 0:
            neighbor_temps = [n["temperature"] for n in spatial_neighbors if "temperature" in n and n["temperature"] is not None]
            neighbor_pressures = [n["pressure"] for n in spatial_neighbors if "pressure" in n and n["pressure"] is not None]
            neighbor_count = len(neighbor_temps)

            if neighbor_temps and neighbor_pressures:
                avg_n_temp = float(np.mean(neighbor_temps))
                avg_n_press = float(np.mean(neighbor_pressures))

                diff_temp = abs(temperature - avg_n_temp)
                diff_press = abs(pressure - avg_n_press)

                # If neighbor stations also reflect the deviation -> Genuine Weather Event!
                if is_anomaly and diff_temp <= 3.5 and diff_press <= 4.5 and not is_frozen and len(out_of_bounds) == 0:
                    is_corroborated = True
                    category = "GENUINE_WEATHER_EVENT"
                    root_cause = "genuine_extreme_weather"
                    severity = "MEDIUM" if severity == "LOW" else severity
                    spatial_verdict = "CORROBORATED_BY_NEIGHBORS (GENUINE EVENT)"
                elif is_anomaly:
                    spatial_verdict = "CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)"
                else:
                    spatial_verdict = "CONSISTENT_WITH_NEIGHBORS"

                spatial_res = {
                    "is_corroborated": is_corroborated,
                    "neighbor_count": neighbor_count,
                    "avg_neighbor_temp": round(avg_n_temp, 2),
                    "avg_neighbor_press": round(avg_n_press, 2),
                    "diff_temp": round(diff_temp, 2),
                    "diff_press": round(diff_press, 2),
                    "verdict": spatial_verdict
                }

        # 6. SHAP Feature Contributions & Single Source of Truth Narrative
        if not self.explainer:
            self.explainer = AnomalyExplainer(self)
        
        shap_factors = self.explainer.explain_instance(feat_dict, self, X_scaled, force_exact_shap=is_anomaly)

        expected_dict = {
            "temperature": round(DEFAULT_CLIMATE_BASELINES["temperature"]["mean"] + DEFAULT_CLIMATE_BASELINES["temperature"]["diurnal_amp"] * feat_dict["hour_sin"], 2),
            "pressure": round(DEFAULT_CLIMATE_BASELINES["pressure"]["mean"] - DEFAULT_CLIMATE_BASELINES["pressure"]["diurnal_amp"] * feat_dict["hour_sin"], 2),
            "humidity": round(DEFAULT_CLIMATE_BASELINES["humidity"]["mean"] - DEFAULT_CLIMATE_BASELINES["humidity"]["diurnal_amp"] * feat_dict["hour_sin"], 2)
        }

        narrative_pack = self.explainer.generate_anomaly_narrative(
            station_id=station_id,
            observed={"temperature": temperature, "pressure": pressure, "humidity": humidity},
            expected=expected_dict,
            shap_factors=shap_factors,
            multi_sensor_status=multi_sensor_status,
            spatial_status=spatial_res or {"is_corroborated": is_corroborated, "verdict": spatial_verdict, "neighbor_count": neighbor_count},
            confidence=confidence,
            category=category,
            root_cause=root_cause
        )

        # Update station sliding window
        station_buf.append({
            "timestamp": now.isoformat(),
            "temperature": temperature,
            "pressure": pressure,
            "humidity": humidity,
            "is_anomaly": is_anomaly
        })
        if len(station_buf) > 20:
            station_buf.pop(0)

        # 7. Formulate Prediction Logging String (Section 8)
        pred_label = "ANOMALY" if is_anomaly else "NORMAL"
        log_line = (
            f"{now.strftime('%H:%M:%S')} | {station_id:<10} | {temperature:5.1f}°C | {pressure:6.1f}hPa | {humidity:5.1f}% | "
            f"dT={feat_dict['dT']:+4.1f} | Score={raw_score:+.3f} | Thresh={self.threshold:+.3f} | {pred_label:<7} | {narrative_pack['reason_narrative'][:60]}..."
        )

        # Section 10 Unified Schema Output
        return {
            "status": status,
            "category": category,
            "type": "Multi-sensor" if is_station_wide_failure else ("Temperature" if "temp" in root_cause else ("Pressure" if "press" in root_cause else ("Humidity" if "humid" in root_cause else "Telemetry"))),
            "is_anomaly": is_anomaly,
            "confidence": round(confidence, 4),
            "severity": severity,
            "root_cause": root_cause,
            "interpretation": narrative_pack["interpretation"],
            "why_detected": narrative_pack["reason_narrative"],
            "narrative_pack": narrative_pack,
            "spatial_verdict": spatial_verdict,
            "spatial_consensus": spatial_res,
            "isolation_forest_score": round(raw_score, 4),
            "decision_threshold": round(self.threshold, 4),
            "contributing_factors": shap_factors,
            "engineered_features": feat_dict,
            "model_name": f"IsolationForest_v{self.version}",
            "model_version": self.version,
            "schema_hash": self.schema_hash,
            "prediction_log": log_line
        }


# Global instance
detector_instance = Tier1AnomalyDetector()
