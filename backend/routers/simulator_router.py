"""
backend/routers/simulator_router.py
Simulator Control Panel router for SkyGuard AI.
Allows triggering interactive controls (Start, Stop, Reset, Speed) and
on-demand controlled fault injections across 8 modes (sensor faults, severe weather, and communication failures).
"""

import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from simulator.aws_simulator import simulator_instance
from ml.anomaly_detector import detector_instance
from ml.explainability import explainer_instance
from ml.imputer import ValueImputer
from backend.services.ws_manager import manager
from backend.services.disaster_risk import disaster_risk_engine
from backend.services.weather_api import weather_api_service
from backend.services.comm_monitor import comm_monitor
from backend.routers import anomalies

router = APIRouter(prefix="/simulator", tags=["Virtual AWS Hardware Simulator"])

imputer = ValueImputer()


class FaultInjectRequest(BaseModel):
    station_id: Optional[str] = None
    stationId: Optional[str] = None
    fault_type: Optional[str] = None
    faultType: Optional[str] = None
    parameter: str = "temperature"
    magnitude: float = 15.0
    duration_steps: int = 30

    def get_station_id(self) -> str:
        return self.station_id or self.stationId or "AWS-01"

    def get_fault_type(self) -> str:
        return self.fault_type or self.faultType or "temperature_spike"


class SpeedControlRequest(BaseModel):
    speed: float = 1.0  # 0.5 | 1.0 | 2.0 | 5.0


@router.get("/status")
async def get_simulator_status():
    """
    Returns active simulator status, running state, speed multiplier, and active fault injections.
    """
    return {
        "status": "ONLINE",
        "is_running": simulator_instance.is_running,
        "speed_multiplier": simulator_instance.speed_multiplier,
        "step_count": simulator_instance.step_count,
        "station_count": len(simulator_instance.stations),
        "active_injections": simulator_instance.active_injections,
        "stations": list(simulator_instance.stations.keys()),
        "active_comm_failures": comm_monitor.active_comm_failures[:5]
    }


@router.post("/start")
async def start_simulation_endpoint():
    """
    Starts or resumes live AWS sensor data generation.
    """
    return simulator_instance.start_simulation()


@router.post("/stop")
async def stop_simulation_endpoint():
    """
    Pauses data generation in place (holds current chart traces & station states).
    """
    return simulator_instance.stop_simulation()


@router.post("/reset")
async def reset_simulation_endpoint():
    """
    Resets simulation, clearing active fault injections and station baseline states.
    Broadcasts ANOMALIES_RESET over WebSocket.
    """
    res = simulator_instance.reset_simulation()
    anomalies.clear_live_anomalies()
    comm_monitor.active_comm_failures.clear()

    all_readings = simulator_instance.generate_all_stations()
    sample_r = all_readings[0] if len(all_readings) > 0 else {"temperature": 28.5, "pressure": 1012.0, "humidity": 78.0}
    w_api = weather_api_service.fetch_current_weather()
    latest_risk = disaster_risk_engine.calculate_disaster_risks(sample_r, w_api)

    await manager.broadcast({
        "event": "ANOMALIES_RESET",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "message": "Simulation reset to initial baseline",
        "readings": all_readings,
        "disaster_risks": latest_risk
    })
    return res


@router.post("/speed")
async def set_speed_endpoint(req: SpeedControlRequest):
    """
    Sets live simulation update cadence speed multiplier (0.5x, 1x, 2x, 5x).
    """
    return simulator_instance.set_speed(req.speed)


@router.post("/inject")
@router.post("/inject-fault")
async def inject_fault_endpoint(req: FaultInjectRequest):
    """
    Triggers an on-demand controlled fault injection on a specified virtual station.
    Evaluates immediately through Tier 1 Anomaly Detection / Communication Monitor / SHAP Explainer,
    records the anomaly / failure entry, and broadcasts over live WebSocket.
    """
    target_station = req.get_station_id()
    target_fault = req.get_fault_type()

    res = simulator_instance.inject_fault(
        station_id=target_station,
        fault_type=target_fault,
        parameter=req.parameter,
        magnitude=req.magnitude,
        duration_steps=req.duration_steps
    )

    # Generate altered reading immediately (even if simulation is currently paused)
    altered_reading = simulator_instance.generate_reading(target_station, force_regenerate=True)
    all_readings = [
        simulator_instance.generate_reading(s_id, force_regenerate=(s_id == target_station))
        for s_id in simulator_instance.stations
    ]
    all_readings = [r for r in all_readings if r is not None]

    anom_record = None
    if altered_reading:
        t_now = datetime.datetime.now(datetime.timezone.utc)
        
        # Check communication monitor
        is_comm_fail, comm_record = comm_monitor.register_reading(target_station, t_now, altered_reading)

        if is_comm_fail and comm_record:
            # Route to 3rd distinct category: COMMUNICATION_FAILURE
            anom_record = anomalies.record_live_anomaly(
                reading=altered_reading,
                pred={
                    "status": "Communication Failure",
                    "category": "COMMUNICATION_FAILURE",
                    "type": "Communication",
                    "severity": comm_record["severity"],
                    "root_cause": comm_record["root_cause"],
                    "confidence": None,
                    "is_deterministic": True,
                    "interpretation": "Communication Failure",
                    "why_detected": comm_record["why_detected"],
                    "spatial_verdict": "BYPASSED (COMMUNICATION FAILURE)",
                    "isolation_forest_score": 0.0
                },
                factors=[],
                imputed=None
            )
        else:
            # Evaluate ML Anomaly Model
            t, p, rh = altered_reading["temperature"], altered_reading["pressure"], altered_reading["humidity"]
            neighbors = [r for r in all_readings if r.get("station_id") != target_station]

            pred = detector_instance.predict_single(
                temperature=t,
                pressure=p,
                humidity=rh,
                station_id=target_station,
                timestamp=t_now,
                spatial_neighbors=neighbors
            )

            # Ensure simulated fault is flagged
            if altered_reading.get("is_simulated_fault"):
                pred["is_anomaly"] = True
                if pred["severity"] == "LOW":
                    pred["severity"] = "HIGH"

            altered_reading["anomaly_evaluation"] = pred
            factors = pred.get("contributing_factors", [])
            altered_reading["contributing_factors"] = factors

            prim_feat = factors[0]["feature"] if len(factors) > 0 else "temperature"
            base_p = "temperature" if "temp" in prim_feat else ("pressure" if "press" in prim_feat else "humidity")
            bad_v = t if base_p == "temperature" else (p if base_p == "pressure" else rh)
            imputed = imputer.suggest_correction(base_p, bad_v, spatial_neighbors=neighbors)
            altered_reading["imputed_suggestion"] = imputed

            anom_record = anomalies.record_live_anomaly(altered_reading, pred, factors, imputed)

        # Recalculate Tier 2 risk intelligence
        w_api = weather_api_service.fetch_current_weather()
        latest_risk = disaster_risk_engine.calculate_disaster_risks(altered_reading, w_api)

        # Broadcast over WebSocket immediately
        await manager.broadcast({
            "event": "ANOMALY_DETECTED",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "anomaly": anom_record,
            "readings": all_readings,
            "disaster_risks": latest_risk
        })

    return {
        **res,
        "anomaly": anom_record,
        "readings": all_readings,
        "disaster_risks": latest_risk if 'latest_risk' in locals() else None
    }


class ClearFaultRequest(BaseModel):
    station_id: Optional[str] = None
    stationId: Optional[str] = None


@router.post("/clear")
async def clear_faults_endpoint(req: Optional[ClearFaultRequest] = None, station_id: Optional[str] = None):
    """
    Clears active fault injections across all or single virtual station.
    Broadcasts ANOMALIES_RESET over WebSocket.
    """
    st_id = (req.station_id or req.stationId) if req else station_id
    res = simulator_instance.clear_injections(st_id)
    anomalies.clear_live_anomalies()
    comm_monitor.active_comm_failures.clear()

    all_readings = simulator_instance.generate_all_stations()
    sample_r = all_readings[0] if len(all_readings) > 0 else {"temperature": 28.5, "pressure": 1012.0, "humidity": 78.0}
    w_api = weather_api_service.fetch_current_weather()
    latest_risk = disaster_risk_engine.calculate_disaster_risks(sample_r, w_api)

    await manager.broadcast({
        "event": "ANOMALIES_RESET",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "message": "Cleared active fault injections",
        "readings": all_readings,
        "disaster_risks": latest_risk
    })
    return res


class SandboxEvalRequest(BaseModel):
    station_id: str = "AWS-01"
    temperature: float = 28.5
    pressure: float = 1012.0
    humidity: float = 78.0
    wind_speed: float = 12.0
    rainfall: float = 0.0
    timestamp: Optional[str] = None
    fault_type: Optional[str] = None


@router.post("/sandbox-evaluate")
async def evaluate_sandbox_frame_endpoint(req: SandboxEvalRequest):
    """
    Evaluates sandboxed telemetry through the real ML Anomaly Detector + SHAP Explainer
    + Value Imputer + Disaster Risk Engine.
    STRICTLY ISOLATED: Does NOT write to live feeds or broadcast WebSocket alert events.
    """
    target_station = req.station_id
    t_now = datetime.datetime.fromisoformat(req.timestamp) if req.timestamp else datetime.datetime.now(datetime.timezone.utc)

    # Fetch baseline neighbors for spatial comparison
    all_readings = [simulator_instance.generate_reading(s) for s in simulator_instance.stations if s != target_station]
    valid_neighbors = [r for r in all_readings if r is not None]

    # Predict via ML Isolation Forest
    pred = detector_instance.predict_single(
        temperature=req.temperature,
        pressure=req.pressure,
        humidity=req.humidity,
        station_id=target_station,
        timestamp=t_now,
        spatial_neighbors=valid_neighbors
    )

    factors = pred.get("contributing_factors", [])

    # Spatio-Temporal Imputation
    imputed = None
    if pred.get("is_anomaly"):
        prim_feat = factors[0]["feature"] if len(factors) > 0 else "temperature"
        base_p = "temperature" if "temp" in prim_feat else ("pressure" if "press" in prim_feat else "humidity")
        bad_v = req.temperature if base_p == "temperature" else (req.pressure if base_p == "pressure" else req.humidity)
        imputed = imputer.suggest_correction(base_p, bad_v, spatial_neighbors=valid_neighbors)

    # Sandbox Tier 2 Risk calculation
    sandbox_reading = {
        "temperature": req.temperature,
        "pressure": req.pressure,
        "humidity": req.humidity
    }
    sandbox_weather_api = {
        "rainfall_mm": req.rainfall,
        "wind_speed_kmh": req.wind_speed
    }
    sandbox_risks = disaster_risk_engine.calculate_disaster_risks(sandbox_reading, sandbox_weather_api)

    return {
        "status": "success",
        "station_id": target_station,
        "timestamp": t_now.isoformat(),
        "readings": {
            "temperature": req.temperature,
            "pressure": req.pressure,
            "humidity": req.humidity,
            "wind_speed": req.wind_speed,
            "rainfall": req.rainfall
        },
        "detection": pred,
        "contributing_factors": factors,
        "imputed_suggestion": imputed,
        "disaster_risks": sandbox_risks,
        "is_sandboxed": True
    }

