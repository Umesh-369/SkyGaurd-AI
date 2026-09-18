"""
backend/integrations package
External weather and dataset integrations.
"""

from backend.integrations.weather import WeatherAPIService, weather_api_service
from backend.integrations.datasets import DatasetAdapter, dataset_adapter, OpenMLDataLoader

__all__ = [
    "WeatherAPIService",
    "weather_api_service",
    "DatasetAdapter",
    "dataset_adapter",
    "OpenMLDataLoader",
]
