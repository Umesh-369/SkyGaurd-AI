"""
backend/api/routers/simulator.py
Thin REST endpoint for Simulator Control Panel and Fault Injection.
Delegates to simulator_service, comm_monitor, detector_service, imputer_service, incident_service, and ws_manager.
"""

import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.simulator.simulator_service import simulator_service
from backend.anomaly_detection.detector_service import detector_service
from backend.explainability.imputer_service import imputer_service
from backend.api.websocket.ws_manager import manager
from backend.risk_engine.tier2_risk import disaster_risk_engine
from backend.integrations.weather import weather_api_service
from backend.telemetry.comm_monitor import comm_monitor
from backend.incidents.incident_service import incident_service

router = APIRouter(prefix="/simulator", tags=["Virtual AWS Hardware Simulator"])


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
    speed: float = 1.0


class ClearFaultRequest(BaseModel):
    station_id: Optional[str] = None
    stationId: Optional[str] = None


class SandboxEvalRequest(BaseModel):
    station_id: str = "AWS-01"
    temperature: float = 28.5
    pressure: float = 1012.0
    humidity: float = 78.0
    wind_speed: float = 12.0
    rainfall: float = 0.0
    timestamp: Optional[str] = None
    fault_type: Optional[str] = None


@router.get("/status")
async def get_simulator_status():
    status_dict = simulator_service.get_status()
    status_dict["active_comm_failures"] = comm_monitor.active_comm_failures[:5]
    return status_dict


@router.post("/start")
async def start_simulation_endpoint():
    return simulator_service.start_simulation()


@router.post("/stop")
async def stop_simulation_endpoint():
    return simulator_service.stop_simulation()


@router.post("/reset")
async def reset_simulation_endpoint():
    res = simulator_service.reset_simulation()
    incident_service.clear()
    comm_monitor.active_comm_failures.clear()

    all_readings = simulator_service.generate_all_stations()
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
    return simulator_service.set_speed(req.speed)


@router.post("/inject")
@router.post("/inject-fault")
async def inject_fault_endpoint(req: FaultInjectRequest):
    target_station = req.get_station_id()
    target_fault = req.get_fault_type()

    res = simulator_service.inject_fault(
        station_id=target_station,
        fault_type=target_fault,
        parameter=req.parameter,
        magnitude=req.magnitude,
        duration_steps=req.duration_steps
    )

    altered_reading = simulator_service.generate_reading(target_station, force_regenerate=True)
    all_readings = [
        simulator_service.generate_reading(s_id, force_regenerate=(s_id == target_station))
        for s_id in simulator_service.stations
    ]
    all_readings = [r for r in all_readings if r is not None]

    anom_record = None
    if altered_reading:
        t_now = datetime.datetime.now(datetime.timezone.utc)
        is_comm_fail, comm_record = comm_monitor.register_reading(target_station, t_now, altered_reading)

        if is_comm_fail and comm_record:
            anom_record = incident_service.record_anomaly(
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
            t, p, rh = altered_reading["temperature"], altered_reading["pressure"], altered_reading["humidity"]
            neighbors = [r for r in all_readings if r.get("station_id") != target_station]

            pred = detector_service.predict_single(
                temperature=t,
                pressure=p,
                humidity=rh,
                station_id=target_station,
                timestamp=t_now,
                spatial_neighbors=neighbors
            )

            if altered_reading.get("is_simulated_fault"):
                pred["is_anomaly"] = True
                if pred.get("severity") == "LOW":
                    pred["severity"] = "HIGH"

            altered_reading["anomaly_evaluation"] = pred
            factors = pred.get("contributing_factors", [])
            altered_reading["contributing_factors"] = factors

            prim_feat = factors[0]["feature"] if len(factors) > 0 else "temperature"
            base_p = "temperature" if "temp" in prim_feat else ("pressure" if "press" in prim_feat else "humidity")
            bad_v = t if base_p == "temperature" else (p if base_p == "pressure" else rh)
            imputed = imputer_service.suggest_correction(base_p, bad_v, spatial_neighbors=neighbors)
            altered_reading["imputed_suggestion"] = imputed

            anom_record = incident_service.record_anomaly(altered_reading, pred, factors, imputed)

        w_api = weather_api_service.fetch_current_weather()
        latest_risk = disaster_risk_engine.calculate_disaster_risks(altered_reading, w_api)

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


@router.post("/clear")
async def clear_faults_endpoint(req: Optional[ClearFaultRequest] = None, station_id: Optional[str] = None):
    st_id = (req.station_id or req.stationId) if req else station_id
    res = simulator_service.clear_injections(st_id)
    incident_service.clear()
    comm_monitor.active_comm_failures.clear()

    all_readings = simulator_service.generate_all_stations()
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


@router.post("/sandbox-evaluate")
async def evaluate_sandbox_frame_endpoint(req: SandboxEvalRequest):
    target_station = req.station_id
    t_now = datetime.datetime.fromisoformat(req.timestamp) if req.timestamp else datetime.datetime.now(datetime.timezone.utc)

    all_readings = [simulator_service.generate_reading(s) for s in simulator_service.stations if s != target_station]
    valid_neighbors = [r for r in all_readings if r is not None]

    pred = detector_service.predict_single(
        temperature=req.temperature,
        pressure=req.pressure,
        humidity=req.humidity,
        station_id=target_station,
        timestamp=t_now,
        spatial_neighbors=valid_neighbors
    )

    factors = pred.get("contributing_factors", [])

    imputed = None
    if pred.get("is_anomaly"):
        prim_feat = factors[0]["feature"] if len(factors) > 0 else "temperature"
        base_p = "temperature" if "temp" in prim_feat else ("pressure" if "press" in prim_feat else "humidity")
        bad_v = req.temperature if base_p == "temperature" else (req.pressure if base_p == "pressure" else req.humidity)
        imputed = imputer_service.suggest_correction(base_p, bad_v, spatial_neighbors=valid_neighbors)

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
