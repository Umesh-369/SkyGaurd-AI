"""
backend/api/routers/risks.py
Thin REST endpoint for Tier 2 Disaster Risk Intelligence.
Delegates to risk_engine, simulator, and integrations.
"""

from fastapi import APIRouter
from backend.risk_engine.tier2_risk import disaster_risk_engine
from backend.integrations.weather import weather_api_service
from backend.simulator.simulator_service import simulator_service

router = APIRouter(prefix="/risks", tags=["Disaster Risk Intelligence (Tier 2 Extended)"])


@router.get("")
async def get_disaster_risks(station_id: str = "AWS_GOA_01"):
    """
    Returns Tier 2 Disaster Risk Intelligence (Flood, Extreme Rain, Heatwave, Cyclone)
    combining clean Tier 1 validated sensor readings + Weather API feeds.
    """
    reading = simulator_service.generate_reading(station_id) or {
        "temperature": 28.5, "pressure": 1012.0, "humidity": 78.0
    }

    w_api = weather_api_service.fetch_current_weather()
    risk_summary = disaster_risk_engine.calculate_disaster_risks(reading, w_api)

    return {
        "station_id": station_id,
        "location": "Goa Coastal Region, India",
        "validated_sensor_input": {
            "temperature": reading.get("temperature"),
            "pressure": reading.get("pressure"),
            "humidity": reading.get("humidity")
        },
        "weather_api_context": {
            "rainfall_mm": w_api.get("rainfall_mm"),
            "wind_speed_kmh": w_api.get("wind_speed_kmh")
        },
        "risk_intelligence": risk_summary
    }
