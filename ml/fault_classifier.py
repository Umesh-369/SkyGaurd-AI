"""
ml/fault_classifier.py
Multi-Class Hardware Fault Diagnostic Classifier for SkyGuard AI.
Classifies exact physical AWS sensor breakdown signatures into 6 diagnostic classes:
1. SOLAR_SHIELD_OVERHEATING
2. PRESSURE_TRANSDUCER_DRIFT
3. HUMIDITY_SENSOR_SATURATION
4. ADC_VOLTAGE_BROWNOUT
5. STUCK_TRANSDUCER_FREEZE
6. COMMUNICATION_BIT_CORRUPTION
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "fault_classifier.pkl")

FAULT_CLASSES = [
    "SOLAR_SHIELD_OVERHEATING",
    "PRESSURE_TRANSDUCER_DRIFT",
    "HUMIDITY_SENSOR_SATURATION",
    "ADC_VOLTAGE_BROWNOUT",
    "STUCK_TRANSDUCER_FREEZE",
    "COMMUNICATION_BIT_CORRUPTION"
]

FAULT_LABELS = {
    "SOLAR_SHIELD_OVERHEATING": "Solar Radiation Shield Overheating Fault",
    "PRESSURE_TRANSDUCER_DRIFT": "Barometric Pressure Transducer Calibration Drift",
    "HUMIDITY_SENSOR_SATURATION": "Relative Humidity Capacitive Sensor Saturation / Lockout",
    "ADC_VOLTAGE_BROWNOUT": "ADC Microcontroller Power Rail Voltage Brownout",
    "STUCK_TRANSDUCER_FREEZE": "Transducer Signal Freeze / Frozen ADC Output",
    "COMMUNICATION_BIT_CORRUPTION": "RS485 Telemetry Bus Bit Corruption / Noise Spike"
}

TECHNICIAN_DIRECTIVES = {
    "SOLAR_SHIELD_OVERHEATING": "Inspect Aspirated Fan & Clean Solar Radiation Shield louvers from dust/debris build-up.",
    "PRESSURE_TRANSDUCER_DRIFT": "Perform zero-point pressure calibration or replace piezoresistive pressure transducer chip.",
    "HUMIDITY_SENSOR_SATURATION": "Purge capacitive humidity element or replace polymer RH sensing probe.",
    "ADC_VOLTAGE_BROWNOUT": "Check 12V solar battery terminal voltage, charge controller wiring, and ground bus.",
    "STUCK_TRANSDUCER_FREEZE": "Perform hard microcontroller reboot and verify SPI/I2C sensor bus communication lines.",
    "COMMUNICATION_BIT_CORRUPTION": "Inspect RS485 shield grounding, check antenna connector tight tightness, and replace signal cable."
}


def generate_synthetic_fault_dataset(n_samples_per_class: int = 400) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generates synthetic training dataset for 6 physical hardware fault signatures.
    Features: [temp, press, humid, delta_temp, delta_press, delta_humid, spatial_discrepancy, is_frozen]
    """
    np.random.seed(42)
    X, y = [], []

    for idx, fault in enumerate(FAULT_CLASSES):
        for _ in range(n_samples_per_class):
            base_t = np.random.normal(28.0, 3.0)
            base_p = np.random.normal(1012.0, 4.0)
            base_rh = np.random.normal(75.0, 10.0)

            dt, dp, drh = 0.0, 0.0, 0.0
            spatial_disc = 0.8
            is_frozen = 0.0

            if fault == "SOLAR_SHIELD_OVERHEATING":
                base_t += np.random.uniform(12.0, 22.0)
                dt = np.random.uniform(8.0, 15.0)
                base_rh = max(10.0, base_rh - 25.0)
                drh = -15.0
                spatial_disc = np.random.uniform(0.75, 0.95)

            elif fault == "PRESSURE_TRANSDUCER_DRIFT":
                base_p += np.random.choice([-1, 1]) * np.random.uniform(35.0, 80.0)
                dp = np.random.uniform(25.0, 60.0)
                spatial_disc = np.random.uniform(0.8, 0.99)

            elif fault == "HUMIDITY_SENSOR_SATURATION":
                base_rh = 100.0 if np.random.random() > 0.5 else 0.0
                drh = np.random.uniform(30.0, 50.0)
                spatial_disc = np.random.uniform(0.7, 0.92)

            elif fault == "ADC_VOLTAGE_BROWNOUT":
                base_t += np.random.uniform(10.0, 18.0)
                base_p -= np.random.uniform(20.0, 40.0)
                base_rh -= np.random.uniform(25.0, 45.0)
                dt, dp, drh = 10.0, -20.0, -30.0
                spatial_disc = np.random.uniform(0.85, 0.99)

            elif fault == "STUCK_TRANSDUCER_FREEZE":
                is_frozen = 1.0
                dt, dp, drh = 0.0, 0.0, 0.0
                spatial_disc = np.random.uniform(0.6, 0.85)

            elif fault == "COMMUNICATION_BIT_CORRUPTION":
                if np.random.random() > 0.5:
                    base_t = np.random.uniform(70.0, 120.0)
                else:
                    base_p = np.random.uniform(400.0, 700.0)
                dt = np.random.uniform(40.0, 80.0)
                spatial_disc = 0.99

            features = [base_t, base_p, base_rh, dt, dp, drh, spatial_disc, is_frozen]
            X.append(features)
            y.append(idx)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)


class HardwareFaultClassifier:
    """
    Diagnostic classifier evaluating physical sensor failure signatures.
    """

    def __init__(self):
        self.model: Optional[RandomForestClassifier] = None
        self.is_loaded = False

    def train_and_save(self):
        """
        Trains RandomForestClassifier on synthetic physical fault dataset and saves pickle.
        """
        X, y = generate_synthetic_fault_dataset()
        clf = RandomForestClassifier(n_estimators=60, max_depth=8, random_state=42)
        clf.fit(X, y)
        self.model = clf
        self.is_loaded = True

        os.makedirs(ARTIFACTS_DIR, exist_ok=True)
        joblib.dump(clf, MODEL_PATH)
        print(f"[FaultClassifier] Successfully trained and saved classifier to {MODEL_PATH}")

    def load(self):
        try:
            if os.path.exists(MODEL_PATH):
                self.model = joblib.load(MODEL_PATH)
                self.is_loaded = True
                print(f"[FaultClassifier] Loaded diagnostic classifier from {MODEL_PATH}")
            else:
                print("[FaultClassifier] Model artifact missing. Training new classifier...")
                self.train_and_save()
        except Exception as e:
            print(f"[FaultClassifier] Error loading classifier: {e}")
            self.train_and_save()

    def diagnose_fault(
        self,
        temperature: float,
        pressure: float,
        humidity: float,
        spatial_contradicted: bool = True,
        is_frozen: bool = False
    ) -> Dict[str, Any]:
        """
        Diagnoses an anomaly reading into one of 6 physical fault categories.
        """
        if not self.is_loaded or self.model is None:
            self.load()

        dt = abs(temperature - 28.0)
        dp = abs(pressure - 1012.0)
        drh = abs(humidity - 75.0)
        spatial_disc = 0.9 if spatial_contradicted else 0.2
        frozen_flag = 1.0 if is_frozen else 0.0

        features = np.array([[temperature, pressure, humidity, dt, dp, drh, spatial_disc, frozen_flag]], dtype=np.float32)

        probs = self.model.predict_proba(features)[0]
        pred_idx = int(np.argmax(probs))
        fault_code = FAULT_CLASSES[pred_idx]
        confidence = round(float(probs[pred_idx]), 3)

        probability_breakdown = {
            FAULT_CLASSES[i]: round(float(probs[i]), 3)
            for i in range(len(FAULT_CLASSES))
        }

        return {
            "fault_code": fault_code,
            "fault_label": FAULT_LABELS.get(fault_code, fault_code),
            "confidence": confidence,
            "field_technician_directive": TECHNICIAN_DIRECTIVES.get(fault_code, "Inspect station hardware."),
            "probability_breakdown": probability_breakdown,
            "urgency": "CRITICAL" if confidence > 0.85 else "HIGH"
        }


# Singleton instance
fault_classifier = HardwareFaultClassifier()
