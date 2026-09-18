"""
backend/api/routers/anomalies.py
Thin REST endpoint for Tier 1 Anomaly Feed, Evaluation, and Recommendations.
Delegates domain responsibilities to incidents, anomaly_detection, explainability,
risk_engine, and recommendations modules.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
from backend.incidents.incident_service import (
    incident_service,
    CANONICAL_STATION_NAMES,
    LIVE_ANOMALIES_FEED,
    HISTORICAL_ANOMALIES_ARCHIVE,
)
from backend.anomaly_detection.detector_service import detector_service
from backend.explainability.imputer_service import imputer_service
from backend.risk_engine.spatial_consensus import spatial_engine
from backend.risk_engine.tier2_risk import disaster_risk_engine
from backend.recommendations.recommendation_service import recommendation_engine
from backend.integrations.weather import weather_api_service
from backend.integrations.datasets import dataset_adapter
from backend.simulator.simulator_service import simulator_service

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection (Tier 1 Core)"])

CITY_TO_STATION_MAP = {
    "Mumbai": "AWS-IND-MUM",
    "Delhi": "AWS-IND-DEL",
    "Bengaluru": "AWS-IND-BLR",
    "Chennai": "AWS-IND-MAA",
    "Kolkata": "AWS-IND-CCU",
    "Hyderabad": "AWS-IND-HYD",
    "Ahmedabad": "AWS-IND-AMD",
    "Jaipur": "AWS-IND-JAI",
    "Lucknow": "AWS-IND-LKO",
    "Bhopal": "AWS-IND-BHO",
    "Panaji": "AWS-01",
    "Margao": "AWS-02",
    "Vasco": "AWS-03",
    "Mapusa": "AWS-04"
}

STATION_TO_CITY_MAP = {v: k for k, v in CITY_TO_STATION_MAP.items()}


@router.get("/detail/{anomaly_id}")
@router.get("/{anomaly_id}")
async def get_anomaly_by_id(anomaly_id: str):
    res = incident_service.get_by_id(anomaly_id)
    if res:
        return res
    raise HTTPException(status_code=404, detail=f"Anomaly with ID '{anomaly_id}' not found.")


@router.post("/clear")
async def clear_anomalies_endpoint():
    incident_service.clear()
    return {
        "status": "success",
        "message": "Active anomaly display feed cleared. Historical records preserved.",
        "active_count": len(LIVE_ANOMALIES_FEED),
        "historical_count": len(HISTORICAL_ANOMALIES_ARCHIVE)
    }


@router.get("")
async def get_anomalies_feed(category: Optional[str] = None, severity: Optional[str] = None, limit: int = 30):
    return incident_service.get_feed(category=category, severity=severity, limit=limit)


@router.post("/evaluate")
async def evaluate_custom_reading(
    station_id: str = "AWS-01",
    temperature: float = 28.5,
    pressure: float = 1012.0,
    humidity: float = 78.0
):
    all_readings = [simulator_service.generate_reading(s) for s in simulator_service.stations if s != station_id]
    valid_neighbors = [r for r in all_readings if r is not None]

    pred = detector_service.predict_single(
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
        imputed = imputer_service.suggest_correction(base_p, bad_val, spatial_neighbors=valid_neighbors)

    st_info = simulator_service.stations.get(station_id, {"coordinates": {"lat": 15.4989, "lon": 73.8278}})
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
    res = incident_service.get_by_id(anomaly_id)
    target_anom = res["anomaly"] if res else None

    if not target_anom:
        extracted_station = "AWS-01"
        for candidate_st in simulator_service.stations:
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
async def get_historical_dataset_stream(
    station_id: str = "AWS-01",
    dataset_type: str = "ALL",
    limit: int = 150
):
    records = []
    
    if dataset_type in ["INDIAN_CLIMATE", "ALL"] or station_id.startswith("AWS-IND-"):
        try:
            india_df = dataset_adapter.fetch_indian_climate_dataset()
            if india_df is not None and not india_df.empty:
                target_city = STATION_TO_CITY_MAP.get(station_id)
                if target_city and station_id != "ALL":
                    matched_df = india_df[india_df["city"].str.lower() == target_city.lower()]
                else:
                    matched_df = india_df

                sample_india = matched_df.head(limit)
                for idx, row in sample_india.iterrows():
                    city_name = str(row.get("city", "Mumbai"))
                    st_id = CITY_TO_STATION_MAP.get(city_name, station_id if station_id != "ALL" else "AWS-IND-MUM")
                    ts = str(row.get("timestamp", ""))
                    temp = float(row.get("temperature", 28.5))
                    press = float(row.get("pressure", 1012.0))
                    humid = float(row.get("humidity", 78.0))
                    rain = float(row.get("rainfall", 0.0))
                    wind = float(row.get("wind_speed", 10.0))
                    aqi = float(row.get("aqi", 100)) if "aqi" in row else 100
                    aqi_cat = str(row.get("aqi_category", "Moderate")) if "aqi_category" in row else "Moderate"

                    records.append({
                        "frame_index": len(records),
                        "station_id": st_id,
                        "station_name": CANONICAL_STATION_NAMES.get(st_id, f"{city_name} AWS"),
                        "city": city_name,
                        "state": str(row.get("state", "India")),
                        "timestamp": ts,
                        "temperature": round(temp, 2),
                        "pressure": round(press, 2),
                        "humidity": round(humid, 2),
                        "rainfall": round(rain, 2),
                        "wind_speed": round(wind, 2),
                        "aqi": round(aqi, 1),
                        "aqi_category": aqi_cat,
                        "dataset_source": "Indian National Climate Dataset (2024–2025)"
                    })
        except Exception as e:
            print(f"[AnomaliesRouter] Error fetching Indian Climate stream: {e}")

    if dataset_type in ["OPENML_GOA", "ALL"] or station_id in ["AWS-01", "AWS-02", "AWS-03", "AWS-04", "AWS-IND-GA-01", "ALL"]:
        try:
            goa_df = dataset_adapter.fetch_openml_data()
            if goa_df is not None and not goa_df.empty:
                sample_goa = goa_df.head(limit)
                for idx, row in sample_goa.iterrows():
                    ts = str(row.get("timestamp", ""))
                    temp = float(row.get("temperature", 28.5))
                    press = float(row.get("pressure", 1012.0))
                    humid = float(row.get("humidity", 78.0))
                    rain = float(row.get("rainfall", 0.0)) if "rainfall" in row else 0.0
                    wind = float(row.get("wind_speed", 10.0)) if "wind_speed" in row else 10.0
                    target_st = station_id if (station_id != "ALL" and station_id.startswith("AWS-0")) else "AWS-01"

                    records.append({
                        "frame_index": len(records),
                        "station_id": target_st,
                        "station_name": CANONICAL_STATION_NAMES.get(target_st, "Panaji Coastal Station"),
                        "city": "Panaji",
                        "state": "Goa",
                        "timestamp": ts,
                        "temperature": round(temp, 2),
                        "pressure": round(press, 2),
                        "humidity": round(humid, 2),
                        "rainfall": round(rain, 2),
                        "wind_speed": round(wind, 2),
                        "aqi": 45.0,
                        "aqi_category": "Good",
                        "dataset_source": "OpenML 43409 (Goa Historical Climate)"
                    })
        except Exception as e:
            print(f"[AnomaliesRouter] Error fetching OpenML stream: {e}")

    sliced_records = records[:limit] if len(records) > limit else records

    return {
        "status": "success",
        "station_id": station_id,
        "dataset_type": dataset_type,
        "dataset_source": "Multi-Source Indian Climate & OpenML Archive" if dataset_type == "ALL" else (
            "Indian National Climate Dataset (2024–2025)" if dataset_type == "INDIAN_CLIMATE" else "OpenML 43409"
        ),
        "total_frames": len(sliced_records),
        "available_datasets": [
            {"id": "ALL", "name": "All Datasets (Combined India & Goa)"},
            {"id": "INDIAN_CLIMATE", "name": "Indian National Climate Dataset (2024–2025)"},
            {"id": "OPENML_GOA", "name": "OpenML Dataset 43409 (Goa Weather)"}
        ],
        "frames": sliced_records
    }
