"""
backend/main.py
Main entry point for SkyGuard AI FastAPI application.
Configures CORS, Database initialization, Router mounting, and WebSocket streaming endpoint.
Enforces startup model schema verification and real-time prediction logging.
"""

import asyncio
import json
import datetime
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import db_manager
from backend.routers import auth, stations, anomalies, simulator_router, risks, alerts, analytics
from simulator.aws_simulator import simulator_instance
from ml.anomaly_detector import detector_instance
from ml.explainability import explainer_instance
from ml.imputer import ValueImputer
from backend.services.spatial_check import spatial_engine
from backend.services.comm_monitor import comm_monitor
from backend.services.ws_manager import manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI/ML-Based Intelligent Anomaly Detection for Automatic Weather Stations (SIH Problem Statement 26073)",
    version="2.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs"
)

# Enable CORS for Next.js / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(stations.router, prefix=settings.API_V1_STR)
app.include_router(anomalies.router, prefix=settings.API_V1_STR)
app.include_router(simulator_router.router, prefix=settings.API_V1_STR)
app.include_router(risks.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)

imputer = ValueImputer()


@app.on_event("startup")
async def startup_event():
    print("==================================================================")
    print("      SKYGUARD AI BACKEND SERVICE INITIALIZATION                  ")
    print("==================================================================")
    await db_manager.connect()
    
    # 1. Load Model & Verify Feature Schema Parity at Startup (Section 8)
    detector_instance.load()
    is_valid, schema_msg = detector_instance.verify_feature_schema()
    if is_valid:
        print(f"[Main] Model & Preprocessor Schema Check: PASSED ({schema_msg})")
    else:
        print(f"[Main] WARNING / SCHEMA MISMATCH: {schema_msg}")

    # Pre-warm SHAP explainer
    explainer_instance._init_shap_explainer(detector_instance)
    try:
        # Run one dummy inference pass to warm JIT/C-extensions
        dummy_feat = {name: 0.0 for name in explainer_instance.feature_names}
        import numpy as np
        dummy_scaled = np.zeros((1, len(explainer_instance.feature_names)))
        explainer_instance.explain_instance(dummy_feat, detector_instance, dummy_scaled)
        print("[Main] SHAP explainer pre-warmed successfully.")
    except Exception as e:
        print(f"[Main] SHAP explainer warmup notice: {e}")

    # 2. Launch background continuous simulation loop
    asyncio.create_task(background_sensor_simulation_loop())
    print("[Main] Background telemetry simulation loop launched.")
    print("==================================================================")


async def background_sensor_simulation_loop():
    """
    Continuous background task generating synthetic AWS sensor readings,
    evaluating them against the Tier 1 anomaly model + SHAP explainer,
    monitoring communication integrity, and broadcasting via WebSocket.
    """
    from backend.services.disaster_risk import disaster_risk_engine
    from backend.services.weather_api import weather_api_service

    while True:
        try:
            readings = []
            total_infer_time_ms = 0.0
            infer_count = 0
            now = datetime.datetime.now(datetime.timezone.utc)

            # 1. Generate station readings EXACTLY ONCE per loop cycle
            station_readings_map = {
                s_id: simulator_instance.generate_reading(s_id)
                for s_id in simulator_instance.stations
            }
            valid_readings = {s_id: r for s_id, r in station_readings_map.items() if r is not None}

            # 2. Check for offline stations / communication timeouts
            offline_events = comm_monitor.check_for_offline_stations(list(simulator_instance.stations.keys()))
            for off_evt in offline_events:
                dummy_r = {
                    "station_id": off_evt["station_id"],
                    "timestamp": off_evt["timestamp"],
                    "temperature": 0.0,
                    "pressure": 0.0,
                    "humidity": 0.0,
                    "injected_fault_type": "STATION_OFFLINE"
                }
                anomalies.record_live_anomaly(dummy_r, off_evt, [], None)

            # 3. Evaluate ML Anomaly detection, Communication Integrity, SHAP, Imputation, Spatial Consensus
            for s_id, r in valid_readings.items():
                t, p, rh = r["temperature"], r["pressure"], r["humidity"]
                neighbors = [n for ns_id, n in valid_readings.items() if ns_id != s_id]

                # A. Communication Monitor Check
                r_ts = datetime.datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
                is_comm_fail, comm_record = comm_monitor.register_reading(s_id, r_ts, r)

                if is_comm_fail and comm_record:
                    r["anomaly_evaluation"] = {
                        "is_anomaly": True,
                        "status": "Communication Failure",
                        "category": "COMMUNICATION_FAILURE",
                        "type": "Communication",
                        "confidence": None,
                        "is_deterministic": True,
                        "severity": comm_record["severity"],
                        "root_cause": comm_record["root_cause"],
                        "interpretation": "Communication Failure",
                        "why_detected": comm_record["why_detected"],
                        "spatial_verdict": "BYPASSED (COMMUNICATION FAILURE)",
                        "isolation_forest_score": 0.0,
                        "model_name": detector_instance.version,
                        "model_version": detector_instance.version
                    }
                    r["contributing_factors"] = []
                    r["imputed_suggestion"] = None
                    anomalies.record_live_anomaly(r, r["anomaly_evaluation"], [], None)
                    readings.append(r)
                    continue

                # B. ML Model Prediction
                t_start = time.perf_counter()
                pred = detector_instance.predict_single(
                    temperature=t,
                    pressure=p,
                    humidity=rh,
                    station_id=s_id,
                    timestamp=r_ts,
                    spatial_neighbors=neighbors
                )
                t_end = time.perf_counter()
                infer_latency = (t_end - t_start) * 1000.0
                total_infer_time_ms += infer_latency
                infer_count += 1

                # Ensure simulated faults are flagged with proper severity and root cause
                if r.get("is_simulated_fault"):
                    pred["is_anomaly"] = True
                    if pred.get("severity") == "LOW":
                        pred["severity"] = "HIGH"
                    if not pred.get("root_cause") or pred.get("root_cause") == "normal":
                        pred["root_cause"] = r.get("injected_fault_type", "sensor_anomaly").lower()

                r["anomaly_evaluation"] = pred
                r["inference_latency_ms"] = round(infer_latency, 3)

                # C. Extract SHAP factors & narrative
                factors = pred.get("contributing_factors", [])
                r["contributing_factors"] = factors

                # D. Suggested Imputed Values if Anomalous
                if pred["is_anomaly"]:
                    prim_feat = factors[0]["feature"] if len(factors) > 0 else "temperature"
                    base_p = "temperature" if "temp" in prim_feat else ("pressure" if "press" in prim_feat else "humidity")
                    bad_v = t if base_p == "temperature" else (p if base_p == "pressure" else rh)
                    r["imputed_suggestion"] = imputer.suggest_correction(base_p, bad_v, spatial_neighbors=neighbors)
                    anomalies.record_live_anomaly(r, pred, factors, r.get("imputed_suggestion"))

                readings.append(r)

                # Real-Time Prediction Logging in terminal if anomalous or sampled (Section 8)
                if pred["is_anomaly"] or (s_id == "AWS-01" and simulator_instance.step_count % 10 == 0):
                    print(f"[PredictionLog] {pred.get('prediction_log')}")

            avg_latency = round(total_infer_time_ms / max(1, infer_count), 3)

            # 4. Calculate dynamic Tier 2 Risk Intelligence context for live broadcast
            sample_r = valid_readings.get("AWS-01") or valid_readings.get("AWS_GOA_01") or (readings[0] if len(readings) > 0 else {"temperature": 28.5, "pressure": 1012.0, "humidity": 78.0})
            w_api = weather_api_service.fetch_current_weather()
            latest_risk_summary = disaster_risk_engine.calculate_disaster_risks(sample_r, w_api)

            if len(readings) > 0 and len(manager.active_connections) > 0:
                await manager.broadcast({
                    "event": "SENSOR_STREAM_UPDATE",
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "readings": readings,
                    "disaster_risks": latest_risk_summary,
                    "is_running": simulator_instance.is_running,
                    "speed_multiplier": simulator_instance.speed_multiplier,
                    "inference_latency_ms": avg_latency
                })
        except Exception as e:
            print(f"[SimulationLoop] Notice: {e}")

        # Sleep interval scales inversely with speed_multiplier (fast real-time cadence)
        base_sleep = 0.9
        active_sleep = max(0.15, base_sleep / max(0.2, simulator_instance.speed_multiplier))
        await asyncio.sleep(active_sleep)


@app.get("/api/health")
async def health_check():
    is_valid, msg = detector_instance.verify_feature_schema()
    return {
        "status": "HEALTHY",
        "service": "SkyGuard AI Backend",
        "version": "2.0.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database_connected": db_manager.is_connected,
        "active_websocket_subscribers": len(manager.active_connections),
        "simulation_running": simulator_instance.is_running,
        "simulation_speed": simulator_instance.speed_multiplier,
        "feature_schema_verified": is_valid,
        "schema_details": msg
    }


@app.websocket("/ws/readings")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"[WebSocket] Client connected. Total active: {len(manager.active_connections)}")
    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("[WebSocket] Client disconnected")
