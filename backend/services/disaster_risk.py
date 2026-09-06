"""
backend/services/disaster_risk.py
Tier 2 Extended Module — Disaster Risk Intelligence Engine for SkyGuard AI.
Evaluates Flood Risk, Extreme Rainfall Risk, Heatwave Risk, and Cyclone Risk
by combining validated Tier 1 sensor readings with real Weather API precipitation/wind feeds.
"""

from typing import Dict, Any, List


class DisasterRiskEngine:
    """
    Tier 2 Extended Module for Weather Risk Intelligence.
    Computes risk indices and early warning alerts.
    """

    def calculate_disaster_risks(
        self,
        validated_sensor_data: Dict[str, float],
        weather_api_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates risk scores (0 to 100%), risk levels (LOW, MEDIUM, HIGH, CRITICAL),
        and contributing factor explanations for 4 hazard categories.
        """
        temp = float(validated_sensor_data.get("temperature", 28.5))
        press = float(validated_sensor_data.get("pressure", 1012.0))
        humid = float(validated_sensor_data.get("humidity", 78.0))

        # Read rainfall and wind speed from either weather API feed or validated sensor stream
        rain_api = weather_api_data.get("rainfall_mm") if weather_api_data else None
        rain_sensor = validated_sensor_data.get("rainfall") or validated_sensor_data.get("rainfall_mm")
        rain_mm = float(rain_api if rain_api is not None and rain_api > 0 else (rain_sensor if rain_sensor is not None else 0.0))

        wind_api = weather_api_data.get("wind_speed_kmh") if weather_api_data else None
        wind_sensor = validated_sensor_data.get("wind_speed") or validated_sensor_data.get("wind_speed_kmh")
        wind_kmh = float(wind_api if wind_api is not None and wind_api > 0 else (wind_sensor if wind_sensor is not None else 12.0))

        # 1. Flood & Heavy Rainfall Risk
        # Combines active rainfall rate, moisture saturation index, and barometric depression
        moisture_component = max(0.0, (humid - 50.0) * 0.35)
        pressure_depression = max(0.0, (1013.25 - press) * 1.5)
        rain_component = rain_mm * 3.2
        flood_score = min(100.0, max(0.0, round(rain_component + moisture_component + pressure_depression, 1)))
        flood_level = self._get_risk_level(flood_score)

        # 2. Heatwave Risk
        # Temperature > 30°C + humidity -> Extreme Heat Stress
        heatwave_score = min(100.0, max(0.0, round((temp - 30.0) * 8.5 + (humid * 0.2), 1)))
        heatwave_level = self._get_risk_level(heatwave_score)

        # 3. Cyclone & Storm Surge Risk
        # Rapid barometric pressure drop (< 1010 hPa) + strong winds (> 15 km/h) -> Storm surge
        cyclone_score = min(100.0, max(0.0, round(max(0.0, (1010.0 - press) * 4.0) + (wind_kmh * 1.2), 1)))
        cyclone_level = self._get_risk_level(cyclone_score)

        # Overall composite weather hazard index
        composite_score = round(max(flood_score, heatwave_score, cyclone_score), 1)
        composite_level = self._get_risk_level(composite_score)

        return {
            "tier_label": "TIER 2 — EXTENDED MODULE (DISASTER RISK INTELLIGENCE)",
            "composite_risk_score": composite_score,
            "composite_risk_level": composite_level,
            "hazards": {
                "flood": {
                    "risk_score": round(flood_score, 1),
                    "risk_level": flood_level,
                    "confidence": 0.88,
                    "contributing_factors": [
                        f"Current precipitation: {rain_mm:.1f} mm/hr",
                        f"Relative Humidity: {humid:.1f}%",
                        f"Barometric pressure: {press:.1f} hPa"
                    ]
                },
                "heatwave": {
                    "risk_score": round(heatwave_score, 1),
                    "risk_level": heatwave_level,
                    "confidence": 0.92,
                    "contributing_factors": [
                        f"Ambient Temperature: {temp:.1f} °C",
                        f"Humidity Index: {humid:.1f}%"
                    ]
                },
                "cyclone": {
                    "risk_score": round(cyclone_score, 1),
                    "risk_level": cyclone_level,
                    "confidence": 0.85,
                    "contributing_factors": [
                        f"Atmospheric Pressure: {press:.1f} hPa",
                        f"Wind Speed: {wind_kmh:.1f} km/h"
                    ]
                }
            },
            "data_sources_used": ["Tier1_Validated_Sensors", "WeatherAPI_Precipitation_Wind"]
        }

    def _get_risk_level(self, score: float) -> str:
        if score >= 75.0:
            return "CRITICAL"
        elif score >= 50.0:
            return "HIGH"
        elif score >= 25.0:
            return "MEDIUM"
        return "LOW"


# Singleton instance
disaster_risk_engine = DisasterRiskEngine()


if __name__ == "__main__":
    eng = DisasterRiskEngine()
    res = eng.calculate_disaster_risks({"temperature": 38.5, "pressure": 1002.0, "humidity": 85.0}, {"rainfall_mm": 25.0, "wind_speed_kmh": 40.0})
    print("Disaster Risk Output:", res)
