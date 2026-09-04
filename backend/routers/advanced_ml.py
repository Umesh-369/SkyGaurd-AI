"""
backend/routers/advanced_ml.py
FastAPI Router for SkyGuard AI's 4 Advanced Machine Learning Engine Modules:
1. PyTorch LSTM Autoencoder (Deep Temporal Anomaly Detection)
2. Online Continual Stream Learning & Concept Drift Engine
3. Multi-Class Hardware Fault Diagnostic Classifier
4. PyTorch GRU Time-Series Weather & Drift Forecaster
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from ml.lstm_autoencoder import deep_anomaly_detector
from ml.online_learner import online_stream_learner
from ml.fault_classifier import fault_classifier
from ml.forecaster import weather_forecaster
from simulator.aws_simulator import simulator_instance

router = APIRouter(prefix="/advanced-ml", tags=["Advanced ML & AI Engines"])

# Initialize and load model artifacts on router import
deep_anomaly_detector.load()
fault_classifier.load()
weather_forecaster.load()


class DiagnoseFaultRequest(BaseModel):
    station_id: str = Field("AWS-01", description="Station Identifier")
    temperature: float = Field(45.8, description="Temperature (°C)")
    pressure: float = Field(1012.0, description="Atmospheric Pressure (hPa)")
    humidity: float = Field(78.5, description="Relative Humidity (%)")
    spatial_contradicted: bool = Field(True, description="True if spatial neighbors contradict reading")
    is_frozen: bool = Field(False, description="True if reading variance is zero")


class SequenceEvaluateRequest(BaseModel):
    station_id: str = "AWS-01"
    readings_window: List[Dict[str, float]] = Field(
        default_factory=lambda: [
            {"temperature": 28.5, "pressure": 1012.0, "humidity": 78.0}
            for _ in range(12)
        ]
    )


@router.get("/forecast/{station_id}")
async def get_station_forecast(station_id: str = "AWS-01"):
    """
    Returns +1h, +3h, and +6h GRU time-series weather forecasts with 95% confidence intervals
    and trend direction indicators for the specified station.
    """
    st_reading = simulator_instance.generate_reading(station_id)
    if not st_reading:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found.")

    # Construct rolling window
    base_t = st_reading["temperature"]
    base_p = st_reading["pressure"]
    base_rh = st_reading["humidity"]

    window = [
        {
            "temperature": round(base_t - 0.2 * i, 2),
            "pressure": round(base_p + 0.1 * i, 2),
            "humidity": round(base_rh + 0.3 * i, 2)
        }
        for i in range(11, -1, -1)
    ]

    forecast_data = weather_forecaster.forecast_station(window)

    return {
        "station_id": station_id,
        "station_name": st_reading.get("station_name", station_id),
        "current_readings": {"temperature": base_t, "pressure": base_p, "humidity": base_rh},
        "forecast": forecast_data
    }


@router.post("/diagnose-fault")
async def diagnose_sensor_fault(req: DiagnoseFaultRequest):
    """
    Evaluates an anomalous sensor reading through the Multi-Class Hardware Fault Diagnostic Classifier.
    Returns diagnosed failure mode, confidence score, probability breakdown, and technician directive.
    """
    diagnosis = fault_classifier.diagnose_fault(
        temperature=req.temperature,
        pressure=req.pressure,
        humidity=req.humidity,
        spatial_contradicted=req.spatial_contradicted,
        is_frozen=req.is_frozen
    )

    return {
        "station_id": req.station_id,
        "input_readings": {
            "temperature": req.temperature,
            "pressure": req.pressure,
            "humidity": req.humidity
        },
        "spatial_contradicted": req.spatial_contradicted,
        "diagnosis": diagnosis
    }


@router.get("/concept-drift/{station_id}")
async def get_concept_drift_metrics(station_id: str = "AWS-01"):
    """
    Returns Online Stream Learning metrics, Page-Hinkley drift ratio, and Concept Drift Index (0-100%).
    """
    st_reading = simulator_instance.generate_reading(station_id)
    if not st_reading:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found.")

    stream_res = online_stream_learner.update_stream(st_reading, is_anomaly=st_reading.get("is_simulated_fault", False))
    return stream_res


@router.post("/deep-evaluate")
async def evaluate_deep_lstm_sequence(req: SequenceEvaluateRequest):
    """
    Evaluates a 12-step sliding window temporal sequence using the PyTorch LSTM-Autoencoder.
    Calculates reconstruction MSE loss and flags deep non-linear sequence anomalies.
    """
    res = deep_anomaly_detector.evaluate_sequence(req.readings_window)
    return {
        "station_id": req.station_id,
        "sequence_len": len(req.readings_window),
        "deep_evaluation": res
    }
