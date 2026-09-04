"""
backend/main.py
Main entry point for SkyGuard AI FastAPI application.
Configures CORS, Database initialization, Router mounting, and WebSocket streaming endpoint.
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
from ml.anomaly_detector import Tier1AnomalyDetector
from ml.explainability import AnomalyExplainer
from ml.imputer import ValueImputer
from backend.services.spatial_check import spatial_engine

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI/ML-Based Intelligent Anomaly Detection for Automatic Weather Stations (SIH Problem Statement 26073)",
    version="1.0.0",
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
app.include_router(advanced_ml.router, prefix=settings.API_V1_STR)

detector = Tier1AnomalyDetector()
explainer = AnomalyExplainer()
imputer = ValueImputer()


from backend.services.ws_manager import manager



@app.on_event("startup")
async def startup_event():
    print("[Main] Starting SkyGuard AI Backend Service...")
    await db_manager.connect()
    detector.load()
    asyncio.create_task(background_sensor_simulation_loop())


async def background_sensor_simulation_loop():
    """
    Continuous background task generating synthetic AWS sensor readings,
    evaluating them against the Tier 1 anomaly model + SHAP explainer, and broadcasting via WebSocket.
    Respects simulator_instance.is_running and simulator_instance.speed_multiplier.
    """
    import time
    from backend.services.disaster_risk import disaster_risk_engine
    from backend.services.weather_api import weather_api_service

    while True:
        try:
            readings = []
            total_infer_time_ms = 0.0
            infer_count = 0

            # 1. Generate station readings EXACTLY ONCE per loop cycle
            station_readings_map = {
                s_id: simulator_instance.generate_reading(s_id)
                for s_id in simulator_instance.stations
            }
            valid_readings = {s_id: r for s_id, r in station_readings_map.items() if r is not None}

            # 2. Evaluate ML Anomaly detection, SHAP, Value Imputation, and Spatial Consensus
            for s_id, r in valid_readings.items():
                t, p, rh = r["temperature"], r["pressure"], r["humidity"]
                neighbors = [n for ns_id, n in valid_readings.items() if ns_id != s_id]

                t_start = time.perf_counter()
                pred = detector.predict_single(t, p, rh, spatial_neighbors=neighbors)
                t_end = time.perf_counter()
                infer_latency = (t_end - t_start) * 1000.0
                total_infer_time_ms += infer_latency
                infer_count += 1

                r["anomaly_evaluation"] = pred
                r["inference_latency_ms"] = round(infer_latency, 3)

                # Generate SHAP explanation for all readings to guarantee SHAP availability
                factors = explainer.explain_instance(t, p, rh, detector)
                r["contributing_factors"] = factors

                # Advanced AI Integration: Concept Drift, Hardware Fault Diagnosis, and Forecasting
                from ml.online_learner import online_stream_learner
                from ml.fault_classifier import fault_classifier
                from ml.forecaster import weather_forecaster
                from ml.lstm_autoencoder import deep_anomaly_detector

                drift_res = online_stream_learner.update_stream(r, is_anomaly=pred["is_anomaly"])
                r["concept_drift"] = drift_res

                if pred["is_anomaly"]:
                    prim_feat = factors[0]["feature"]
                    bad_v = t if prim_feat == "temperature" else (p if prim_feat == "pressure" else rh)
                    r["imputed_suggestion"] = imputer.suggest_correction(prim_feat, bad_v, spatial_neighbors=neighbors)

                    # Multi-Class Hardware Fault Diagnosis
                    is_contra = "CONTRADICTED" in pred.get("spatial_verdict", "")
                    is_froz = r.get("injected_fault_type") in ["STUCK_SENSOR", "FROZEN"]
                    r["fault_diagnosis"] = fault_classifier.diagnose_fault(t, p, rh, spatial_contradicted=is_contra, is_frozen=is_froz)

                    # Push live anomaly to anomalies router feed
                    anomalies.record_live_anomaly(r, pred, factors, r.get("imputed_suggestion"))

                readings.append(r)

            avg_latency = round(total_infer_time_ms / max(1, infer_count), 3)

            # 3. Calculate dynamic Tier 2 Risk Intelligence & GRU Forecasting context
            sample_r = valid_readings.get("AWS-01") or valid_readings.get("AWS_GOA_01") or (readings[0] if len(readings) > 0 else {"temperature": 28.5, "pressure": 1012.0, "humidity": 78.0})
            w_api = weather_api_service.fetch_current_weather()
            latest_risk_summary = disaster_risk_engine.calculate_disaster_risks(sample_r, w_api)

            # Forecast context for sample station
            sample_window = [
                {"temperature": sample_r.get("temperature", 28.5) - 0.1 * i, "pressure": sample_r.get("pressure", 1012.0) + 0.1 * i, "humidity": sample_r.get("humidity", 78.0)}
                for i in range(12)
            ]
            latest_forecast = weather_forecaster.forecast_station(sample_window)
            latest_deep_eval = deep_anomaly_detector.evaluate_sequence(sample_window)

            if len(readings) > 0 and len(manager.active_connections) > 0:
                await manager.broadcast({
                    "event": "SENSOR_STREAM_UPDATE",
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "readings": readings,
                    "disaster_risks": latest_risk_summary,
                    "forecast_intelligence": latest_forecast,
                    "deep_anomaly_intelligence": latest_deep_eval,
                    "is_running": simulator_instance.is_running,
                    "speed_multiplier": simulator_instance.speed_multiplier,
                    "inference_latency_ms": avg_latency
                })
        except Exception as e:
            print(f"[SimulationLoop] Notice: {e}")

        # Sleep interval scales inversely with speed_multiplier
        base_sleep = 2.5
        active_sleep = max(0.4, base_sleep / max(0.2, simulator_instance.speed_multiplier))
        await asyncio.sleep(active_sleep)


@app.get("/api/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": "SkyGuard AI Backend",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database_connected": db_manager.is_connected,
        "active_websocket_subscribers": len(manager.active_connections),
        "simulation_running": simulator_instance.is_running,
        "simulation_speed": simulator_instance.speed_multiplier
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
