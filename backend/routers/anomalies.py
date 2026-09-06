"""
backend/routers/anomalies.py
Tier 1 Anomaly Feed router for SkyGuard AI.
Returns detected anomalies, SHAP feature breakdowns, imputed values, and spatial consensus
across 3 distinct categories: Sensor Faults, Genuine Weather Events, and Communication Failures.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import datetime
from ml.anomaly_detector import detector_instance
from ml.explainability import explainer_instance
from ml.imputer import ValueImputer
from backend.services.spatial_check import spatial_engine
from simulator.aws_simulator import simulator_instance
from backend.services.comm_monitor import comm_monitor
from backend.services.recommendation_engine import recommendation_engine
from backend.services.disaster_risk import disaster_risk_engine
from backend.services.weather_api import weather_api_service
from ml.data_loader import OpenMLDataLoader

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection (Tier 1 Core)"])

imputer = ValueImputer()
data_loader = OpenMLDataLoader()

CANONICAL_STATION_NAMES = {
    "AWS-01": "Panaji Coastal Station",
    "AWS-IND-GA-01": "Panaji Coastal Station",
    "AWS-02": "Margao Inland Station",
    "AWS-IND-GA-02": "Margao Inland Station",
    "AWS-03": "Vasco Port Station",
    "AWS-IND-GA-03": "Vasco Port Station",
    "AWS-04": "Mapusa North Station",
    "AWS-IND-GA-04": "Mapusa North Station",
    "AWS-IND-MUM": "Mumbai Coastal AWS",
    "AWS-IND-BLR": "Bengaluru Plateau AWS",
    "AWS-IND-MAA": "Chennai Coastal AWS",
    "AWS-IND-CCU": "Kolkata Delta AWS",
    "AWS-IND-HYD": "Hyderabad Deccan AWS",
    "AWS-IND-AMD": "Ahmedabad Western AWS",
    "AWS-IND-JAI": "Jaipur Desert Fringe AWS",
    "AWS-IND-LKO": "Lucknow Gangetic AWS",
    "AWS-IND-BHO": "Bhopal Central AWS",
}

# Pre-populated live demonstration sample anomalies
SAMPLE_ANOMALIES = [
    {
        "id": "ANOM_2026_001",
        "station_id": "AWS-01",
        "stationId": "AWS-01",
        "station_name": "Panaji Coastal Station",
        "stationName": "Panaji Coastal Station",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "origin": "SIMULATED",
        "status": "Anomaly",
        "category": "SENSOR_FAULT",
        "type": "Temperature",
        "readings": {"temperature": 45.8, "pressure": 1012.1, "humidity": 78.5},
        "is_anomaly": True,
        "isAnomaly": True,
        "severity": "HIGH",
        "root_cause": "temperature_spike",
        "rootCause": "temperature_spike",
        "confidence": 0.9450,
        "isolation_forest_score": -0.2450,
        "spatial_verdict": "CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)",
        "interpretation": "Likely Sensor Fault",
        "why_detected": "Temperature (+45.8°C) is significantly outside the station's expected behavior (+17.6°C delta from baseline 28.2°C) — driven primarily by rate-of-change (dT/dt = +17.3°C, SHAP weight +0.78) — while pressure and humidity remain normal, indicating a likely temperature sensor fault.",
        "contributing_factors": [
            {
                "feature": "temperature",
                "value": 45.8,
                "shap_weight": 0.7850,
                "abs_importance": 0.7850,
                "impact": "HIGH_ANOMALY_RISK",
                "description": "Temperature value +45.80°C deviates severely from station diurnal baseline."
            },
            {
                "feature": "dT",
                "value": 17.3,
                "shap_weight": 0.6120,
                "abs_importance": 0.6120,
                "impact": "HIGH_ANOMALY_RISK",
                "description": "Rapid single-step temperature rate of change flagged by SHAP TreeExplainer."
            },
            {
                "feature": "humidity",
                "value": 78.5,
                "shap_weight": 0.0800,
                "abs_importance": 0.0800,
                "impact": "NEUTRAL",
                "description": "Humidity reading within standard baseline."
            }
        ],
        "imputed_value_suggestion": {
            "target_feature": "temperature",
            "original_value": 45.8,
            "corrected_value": 28.2,
            "difference": -17.6,
            "confidence": 0.9250,
            "method": "HYBRID_SPATIO_TEMPORAL_EMA"
        }
    },
    {
        "id": "ANOM_2026_002",
        "station_id": "AWS-02",
        "stationId": "AWS-02",
        "station_name": "Margao Inland Station",
        "stationName": "Margao Inland Station",
        "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10)).isoformat(),
        "origin": "SIMULATED",
        "status": "Anomaly",
        "category": "SENSOR_FAULT",
        "type": "Pressure",
        "readings": {"temperature": 29.2, "pressure": 965.0, "humidity": 82.0},
        "is_anomaly": True,
        "isAnomaly": True,
        "severity": "CRITICAL",
        "root_cause": "pressure_drop",
        "rootCause": "pressure_drop",
        "confidence": 0.9850,
        "isolation_forest_score": -0.3850,
        "spatial_verdict": "CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)",
        "interpretation": "Likely Sensor Fault",
        "why_detected": "Barometric pressure (965.0 hPa) dropped below valid physical sensor bounds (900-1060 hPa) with extreme rate of change — driven by pressure delta (SHAP weight +0.89) — indicating an isolated pressure transducer failure.",
        "contributing_factors": [
            {
                "feature": "pressure",
                "value": 965.0,
                "shap_weight": 0.8920,
                "abs_importance": 0.8920,
                "impact": "HIGH_ANOMALY_RISK",
                "description": "Pressure 965.0 hPa is below valid physical sensor bounds."
            },
            {
                "feature": "dP",
                "value": -46.2,
                "shap_weight": 0.7450,
                "abs_importance": 0.7450,
                "impact": "HIGH_ANOMALY_RISK",
                "description": "Abrupt step drop in barometric pressure."
            }
        ],
        "imputed_value_suggestion": {
            "target_feature": "pressure",
            "original_value": 965.0,
            "corrected_value": 1011.2,
            "difference": 46.2,
            "confidence": 0.9400,
            "method": "HYBRID_SPATIO_TEMPORAL_EMA"
        }
    }
]

# Rolling memory feed of active displayed anomalies
LIVE_ANOMALIES_FEED: List[Dict[str, Any]] = list(SAMPLE_ANOMALIES)

# Permanent historical archive of all detected anomalies (never wiped by Clear display feed)
HISTORICAL_ANOMALIES_ARCHIVE: List[Dict[str, Any]] = list(SAMPLE_ANOMALIES)


def record_live_anomaly(
    reading: Dict[str, Any],
    pred: Dict[str, Any],
    factors: List[Dict[str, Any]],
    imputed: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Appends or updates in-place a live detected event into the rolling live feed (max 50)
    and permanently archives it in HISTORICAL_ANOMALIES_ARCHIVE (max 500).
    """
    st_id = reading["station_id"]
    if st_id == "AWS-IND-DEL" or st_id == "DELHI":
        st_id = "AWS-01"
    st_name = CANONICAL_STATION_NAMES.get(st_id) or reading.get("station_name") or CANONICAL_STATION_NAMES["AWS-01"]
    
    category = pred.get("category") or ("COMMUNICATION_FAILURE" if "comm" in str(pred.get("status", "")).lower() else "SENSOR_FAULT")
    root_cause = reading.get("injected_fault_type") or pred.get("root_cause") or "sensor_anomaly"
    if root_cause == "NONE":
        root_cause = pred.get("root_cause") or "sensor_anomaly"

    status = pred.get("status") or ("Communication Failure" if category == "COMMUNICATION_FAILURE" else "Anomaly")
    interpretation = pred.get("interpretation") or ("Communication Failure" if category == "COMMUNICATION_FAILURE" else "Likely Sensor Fault")
    why_detected = pred.get("why_detected") or f"Anomaly flagged on {st_name} by IsolationForest model."

    # Update in-place in LIVE_ANOMALIES_FEED if exists
    for entry in LIVE_ANOMALIES_FEED:
        if entry["station_id"] == st_id and (entry.get("root_cause") == root_cause or entry.get("rootCause") == root_cause):
            entry["timestamp"] = reading["timestamp"]
            entry["readings"] = {
                "temperature": reading["temperature"],
                "pressure": reading["pressure"],
                "humidity": reading["humidity"]
            }
            entry["status"] = status
            entry["category"] = category
            entry["confidence"] = pred["confidence"]
            entry["severity"] = pred["severity"]
            entry["isolation_forest_score"] = pred.get("isolation_forest_score", -0.25)
            entry["spatial_verdict"] = pred.get("spatial_verdict", "NOT_CHECKED")
            entry["interpretation"] = interpretation
            entry["why_detected"] = why_detected
            if factors:
                entry["contributing_factors"] = factors
            if imputed:
                entry["imputed_value_suggestion"] = imputed
            _archive_anomaly_record(entry)
            return entry

    anom_entry = {
        "id": f"EVT_{st_id}_{root_cause}",
        "station_id": st_id,
        "stationId": st_id,
        "station_name": st_name,
        "stationName": st_name,
        "timestamp": reading["timestamp"],
        "origin": reading.get("origin", "SIMULATED"),
        "status": status,
        "category": category,
        "type": pred.get("type", "Temperature"),
        "readings": {
            "temperature": reading["temperature"],
            "pressure": reading["pressure"],
            "humidity": reading["humidity"]
        },
        "is_anomaly": True,
        "isAnomaly": True,
        "severity": pred["severity"],
        "root_cause": root_cause,
        "rootCause": root_cause,
        "confidence": pred["confidence"],
        "isolation_forest_score": pred.get("isolation_forest_score", -0.25),
        "spatial_verdict": pred.get("spatial_verdict", "NOT_CHECKED"),
        "interpretation": interpretation,
        "why_detected": why_detected,
        "contributing_factors": factors,
        "imputed_value_suggestion": imputed
    }

    LIVE_ANOMALIES_FEED.insert(0, anom_entry)
    if len(LIVE_ANOMALIES_FEED) > 50:
        LIVE_ANOMALIES_FEED.pop()

    _archive_anomaly_record(anom_entry)
    return anom_entry


def _archive_anomaly_record(record: Dict[str, Any]):
    """
    Safely stores or updates anomaly record in historical archive without modifying active live feed.
    """
    rec_id = record.get("id")
    for idx, h in enumerate(HISTORICAL_ANOMALIES_ARCHIVE):
        if h.get("id") == rec_id:
            HISTORICAL_ANOMALIES_ARCHIVE[idx] = dict(record)
            return
    HISTORICAL_ANOMALIES_ARCHIVE.insert(0, dict(record))
    if len(HISTORICAL_ANOMALIES_ARCHIVE) > 500:
        HISTORICAL_ANOMALIES_ARCHIVE.pop()


def clear_live_anomalies():
    """
    Clears all active anomalies in the rolling memory feed (display state).
    Preserves historical archive and database models.
    """
    LIVE_ANOMALIES_FEED.clear()


@router.get("/detail/{anomaly_id}")
@router.get("/{anomaly_id}")
async def get_anomaly_by_id(anomaly_id: str):
    """
    Retrieves a specific anomaly by ID.
    Searches active live feed first, then falls back to historical archive.
    """
    # 1. Check live feed
    for a in LIVE_ANOMALIES_FEED:
        if a.get("id") == anomaly_id:
            return {
                "anomaly": a,
                "is_active": True,
                "is_historical": False
            }

    # 2. Check historical archive
    for a in HISTORICAL_ANOMALIES_ARCHIVE:
        if a.get("id") == anomaly_id:
            return {
                "anomaly": a,
                "is_active": False,
                "is_historical": True
            }

    # 3. Fuzzy search in archive by station or substring
    for a in HISTORICAL_ANOMALIES_ARCHIVE:
        if anomaly_id in a.get("id", "") or a.get("station_id") == anomaly_id:
            return {
                "anomaly": a,
                "is_active": False,
                "is_historical": True
            }

    raise HTTPException(status_code=404, detail=f"Anomaly with ID '{anomaly_id}' not found.")


@router.post("/clear")
async def clear_anomalies_endpoint():
    """
    Clears active anomalies from the live display feed while preserving history and simulator state.
    """
    clear_live_anomalies()
    return {
        "status": "success",
        "message": "Active anomaly display feed cleared. Historical records preserved.",
        "active_count": len(LIVE_ANOMALIES_FEED),
        "historical_count": len(HISTORICAL_ANOMALIES_ARCHIVE)
    }


@router.get("")
async def get_anomalies_feed(category: Optional[str] = None, severity: Optional[str] = None, limit: int = 30):
    """
    Returns live feed of detected events with SHAP explanations, imputed value suggestions,
    and spatial consistency verdicts across all 3 categories (Sensor Fault, Genuine Weather Event, Communication Failure).
    """
    filtered = LIVE_ANOMALIES_FEED
    if category and category != "ALL":
        filtered = [a for a in filtered if a.get("category") == category]
    if severity and severity != "ALL":
        filtered = [a for a in filtered if a.get("severity") == severity]

    return {
        "tier_label": "TIER 1 — CORE ANOMALY DETECTION & COMMUNICATION FEED",
        "categories": ["SENSOR_FAULT", "GENUINE_WEATHER_EVENT", "COMMUNICATION_FAILURE"],
        "count": len(filtered),
        "total_active": len(LIVE_ANOMALIES_FEED),
        "anomalies": filtered[:limit]
    }


@router.post("/evaluate")
async def evaluate_custom_reading(
    station_id: str = "AWS-01",
    temperature: float = 28.5,
    pressure: float = 1012.0,
    humidity: float = 78.0
):
    """
    Evaluates arbitrary reading directly against Tier 1 ML pipeline + SHAP explainer + Spatial check.
    """
    all_readings = [simulator_instance.generate_reading(s) for s in simulator_instance.stations if s != station_id]
    valid_neighbors = [r for r in all_readings if r is not None]

    pred = detector_instance.predict_single(
        temperature=temperature,
        pressure=pressure,
        humidity=humidity,
        station_id=station_id,
        spatial_neighbors=valid_neighbors
    )

    imputed = None
    if pred["is_anomaly"]:
        factors = pred.get("contributing_factors", [])
        primary_feat = factors[0]["feature"] if len(factors) > 0 else "temperature"
        base_p = "temperature" if "temp" in primary_feat else ("pressure" if "press" in primary_feat else "humidity")
        bad_val = temperature if base_p == "temperature" else (pressure if base_p == "pressure" else humidity)
        imputed = imputer.suggest_correction(base_p, bad_val, spatial_neighbors=valid_neighbors)

    st_info = simulator_instance.stations.get(station_id, {"coordinates": {"lat": 15.4989, "lon": 73.8278}})
    spatial_res = spatial_engine.evaluate_spatial_consensus(
        st_info,
        {"temperature": temperature, "pressure": pressure, "humidity": humidity},
        valid_neighbors
    )

    return {
        "station_id": station_id,
        "input_readings": {"temperature": temperature, "pressure": pressure, "humidity": humidity},
        "detection_result": pred,
        "contributing_factors": pred.get("contributing_factors", []),
        "imputed_value_suggestion": imputed,
        "spatial_consensus": spatial_res,
        "narrative_explanation": pred.get("narrative_pack", {})
    }


@router.get("/{anomaly_id}/recommendations")
async def get_anomaly_recommendations(anomaly_id: str):
    """
    Returns deterministic, prioritized corrective recommendations for a specific anomaly.
    Integrates Tier 1 classification + SHAP features + Tier 2 Risk Engine.
    """
    target_anom = None
    # 1. Direct ID match in active live feed
    for a in LIVE_ANOMALIES_FEED:
        if a.get("id") == anomaly_id:
            target_anom = a
            break

    # 2. Direct ID match in historical archive
    if not target_anom:
        for a in HISTORICAL_ANOMALIES_ARCHIVE:
            if a.get("id") == anomaly_id:
                target_anom = a
                break

    # 3. Substring / Station ID matching in archive or live
    if not target_anom:
        for a in LIVE_ANOMALIES_FEED + HISTORICAL_ANOMALIES_ARCHIVE:
            st = a.get("station_id") or a.get("stationId") or ""
            if st and (st in anomaly_id or anomaly_id in a.get("id", "")):
                target_anom = a
                break

    # 4. Fallback synthetic anomaly record derived directly from requested anomaly_id parameter
    if not target_anom:
        extracted_station = "AWS-01"
        for candidate_st in simulator_instance.stations:
            if candidate_st in anomaly_id:
                extracted_station = candidate_st
                break

        is_spike = "spike" in anomaly_id.lower()
        is_drop = "drop" in anomaly_id.lower()
        is_offline = "offline" in anomaly_id.lower() or "comm" in anomaly_id.lower()
        is_multi = "multi" in anomaly_id.lower()

        cat = "COMMUNICATION_FAILURE" if is_offline else "SENSOR_FAULT"
        sev = "CRITICAL" if (is_multi or is_offline) else ("HIGH" if (is_spike or is_drop) else "MEDIUM")
        rc = "multivariate_fault" if is_multi else ("station_offline" if is_offline else ("temperature_spike" if is_spike else "sensor_anomaly"))

        target_anom = {
            "id": anomaly_id,
            "station_id": extracted_station,
            "station_name": CANONICAL_STATION_NAMES.get(extracted_station, extracted_station),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "Communication Failure" if is_offline else "Anomaly",
            "category": cat,
            "severity": sev,
            "root_cause": rc,
            "confidence": 0.92,
            "isolation_forest_score": -0.045,
            "spatial_verdict": "BYPASSED (COMMUNICATION FAILURE)" if is_offline else "CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)",
            "readings": {"temperature": 38.5, "pressure": 1012.0, "humidity": 78.0},
            "contributing_factors": [
                {"feature": "temperature", "value": 38.5, "shap_weight": 1.15, "abs_importance": 1.15, "impact": "HIGH_ANOMALY_RISK", "description": "Temperature deviation"}
            ]
        }

    # Calculate Tier 2 risks for context
    sample_r = {
        "temperature": target_anom.get("readings", {}).get("temperature", 28.5),
        "pressure": target_anom.get("readings", {}).get("pressure", 1012.0),
        "humidity": target_anom.get("readings", {}).get("humidity", 78.0)
    }
    w_api = weather_api_service.fetch_current_weather()
    risk_summary = disaster_risk_engine.calculate_disaster_risks(sample_r, w_api)

    recs = recommendation_engine.generate_recommendations(target_anom, risk_summary)
    return {
        "anomaly_id": anomaly_id,
        "station_id": target_anom.get("station_id"),
        "severity": target_anom.get("severity"),
        "category": target_anom.get("category"),
        "tier2_risk_score": risk_summary.get("composite_risk_score"),
        "tier2_risk_level": risk_summary.get("composite_risk_level"),
        "recommendations": recs
    }


@router.get("/historical/dataset-stream")
async def get_historical_dataset_stream(station_id: str = "AWS-01", limit: int = 150):
    """
    Supplies genuine historical time-series frames from OpenML Dataset 43409
    (Goa Weather) and secondary Indian Climate Datasets for sandboxed Historical Replay.
    """
    try:
        df = data_loader.fetch_raw_openml_data()
        if df is not None and not df.empty:
            records = []
            # Take up to limit rows
            sample_df = df.head(limit)
            for idx, row in sample_df.iterrows():
                ts = str(row.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()))
                temp = float(row.get("temperature", 28.5))
                press = float(row.get("pressure", 1012.0))
                humid = float(row.get("humidity", 78.0))
                rain = float(row.get("rainfall", 0.0)) if "rainfall" in row else 0.0
                wind = float(row.get("wind_speed", 10.0)) if "wind_speed" in row else 10.0

                records.append({
                    "frame_index": int(idx),
                    "station_id": station_id,
                    "timestamp": ts,
                    "temperature": round(temp, 2),
                    "pressure": round(press, 2),
                    "humidity": round(humid, 2),
                    "rainfall": round(rain, 2),
                    "wind_speed": round(wind, 2),
                    "dataset_source": "OpenML 43409 (Goa Historical Climate)"
                })

            return {
                "status": "success",
                "station_id": station_id,
                "dataset_source": "OpenML 43409",
                "total_frames": len(records),
                "frames": records
            }
    except Exception as e:
        print(f"[AnomaliesRouter] Error fetching historical stream: {e}")

    # Fallback to local historical sample frames
    return {
        "status": "fallback",
        "station_id": station_id,
        "dataset_source": "OpenML Baseline Cache",
        "total_frames": 0,
        "frames": []
    }
