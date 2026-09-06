"""
tests/test_weather_test_source.py
Unit and Integration Test Suite for Tier 1 Weather API Live Test Source.
"""

import sys
import os
import unittest
import time
import asyncio

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from backend.main import app
from backend.services.weather_test_source import weather_test_source_service, WeatherAPITestSource
from backend.services.weather_api import weather_api_service


class TestWeatherAPITestSource(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_cadence_and_station_metadata(self):
        """Verify 10-minute cadence and canonical live test node identification."""
        self.assertEqual(weather_test_source_service.poll_interval_seconds, 600)
        self.assertEqual(weather_test_source_service.station_id, "NODE-WEATHER-API")
        self.assertIn("Panaji", weather_test_source_service.station_name)
        self.assertEqual(weather_test_source_service.city_name, "Panaji, Goa")

    def test_non_blocking_weather_fetch(self):
        """Verify fetch_current_weather returns cached data instantaneously (<50ms)."""
        start_time = time.perf_counter()
        data = weather_api_service.fetch_current_weather(lat=15.4989, lon=73.8278, city_name="Panaji, Goa")
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        self.assertLess(elapsed_ms, 50, f"fetch_current_weather took too long: {elapsed_ms:.2f}ms")
        self.assertIn("temperature", data)
        self.assertIn("pressure", data)
        self.assertIn("humidity", data)

    def test_poll_and_evaluate_tier1_ml(self):
        """Verify Weather API data is evaluated through the exact same Tier 1 ML model."""
        res = asyncio.run(weather_test_source_service.poll_and_evaluate())
        self.assertIn("reading", res)
        self.assertIn("evaluation", res)
        
        reading = res["reading"]
        evaluation = res["evaluation"]
        
        # Verify reading structure and tags
        self.assertEqual(reading["station_id"], "NODE-WEATHER-API")
        self.assertEqual(reading["source"], "WEATHER_API")
        self.assertEqual(reading["station_type"], "WEATHER_API")
        self.assertEqual(reading["origin"], "WEATHER_API")
        self.assertIn("temperature", reading)
        self.assertIn("pressure", reading)
        self.assertIn("humidity", reading)
        
        # Verify ML evaluation fields
        self.assertIn("is_anomaly", evaluation)
        self.assertIn("confidence", evaluation)
        self.assertIn("severity", evaluation)
        self.assertIn("isolation_forest_score", evaluation)

    def test_weather_test_status_endpoint(self):
        """Verify GET /api/anomalies/weather-test/status returns valid state."""
        resp = self.client.get("/api/anomalies/weather-test/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["station_id"], "NODE-WEATHER-API")
        self.assertEqual(data["cadence_seconds"], 600)
        self.assertIn("cadence_human", data)
        self.assertEqual(data["cadence_human"], "10 minutes")
        self.assertIn("is_running", data)
        self.assertIn("source", data)
        self.assertEqual(data["source"], "WEATHER_API")

    def test_weather_test_poll_endpoint(self):
        """Verify POST /api/anomalies/weather-test/poll returns on-demand reading and evaluation."""
        resp = self.client.post("/api/anomalies/weather-test/poll")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIn("reading", data)
        self.assertIn("evaluation", data)
        self.assertEqual(data["reading"]["source"], "WEATHER_API")
        self.assertEqual(data["reading"]["station_id"], "NODE-WEATHER-API")

    def test_unified_anomaly_structure(self):
        """Verify anomaly structure has unified fields."""
        feed_resp = self.client.get("/api/anomalies")
        self.assertEqual(feed_resp.status_code, 200)
        data = feed_resp.json()
        self.assertIn("anomalies", data)
        for anom in data["anomalies"]:
            self.assertIn("id", anom)
            self.assertIn("source", anom)
            self.assertIn(anom["source"], ["SIMULATOR", "WEATHER_API"])
            self.assertIn("station", anom)
            self.assertIn("timestamp", anom)
            self.assertIn("severity", anom)
