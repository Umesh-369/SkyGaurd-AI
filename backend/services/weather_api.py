"""
backend/services/weather_api.py
Compatibility wrapper delegating to backend.integrations.weather.
"""

from backend.integrations.weather import WeatherAPIService, weather_api_service

__all__ = ["WeatherAPIService", "weather_api_service"]
