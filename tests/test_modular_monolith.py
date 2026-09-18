"""
tests/test_modular_monolith.py
Comprehensive Verification & Acceptance Test Suite for SkyGuard AI Modular Monolith.
Covers:
  1. Deduplication: Multi-station simultaneous packets vs same-station duplicates.
  2. Communication Failure Gating: ML & SHAP bypass.
  3. Spatial Consensus Scenarios: Isolated (Sensor Fault), All-Station (Weather Event), Partial (Investigation).
  4. Station Topology & Node Health: NOMINAL, WARN, ANOMALY, OFFLINE.
  5. Incident Dossier & Diagnostic Report Generation.
  6. Zero Circular Dependencies Verification across all domain modules.
"""

import sys
import os
import unittest
import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from backend.main import app
from backend.telemetry.deduplicator import TelemetryDeduplicator
from backend.telemetry.comm_monitor import CommunicationMonitor
from backend.risk_engine.spatial_consensus import SpatialConsistencyEngine
from backend.explainability.degradation_service import degradation_service
from backend.reports.report_service import report_service


class TestModularMonolithRegression(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_dependency_flow_no_circular_imports(self):
        """Verify all domain modules import cleanly without circular dependency errors."""
        import backend.config
        import backend.database
        import backend.telemetry
        import backend.integrations
        import backend.anomaly_detection
        import backend.explainability
        import backend.risk_engine
        import backend.recommendations
        import backend.alerts
        import backend.incidents
        import backend.reports
        import backend.simulator
        import backend.api

        self.assertTrue(hasattr(backend.config, "settings"))
        self.assertTrue(hasattr(backend.database, "db_manager"))
        self.assertTrue(hasattr(backend.telemetry, "comm_monitor"))
        self.assertTrue(hasattr(backend.integrations, "weather_api_service"))
        self.assertTrue(hasattr(backend.anomaly_detection, "detector_service"))
        self.assertTrue(hasattr(backend.explainability, "shap_service"))
        self.assertTrue(hasattr(backend.risk_engine, "disaster_risk_engine"))
        self.assertTrue(hasattr(backend.recommendations, "recommendation_engine"))
        self.assertTrue(hasattr(backend.alerts, "alert_service"))
        self.assertTrue(hasattr(backend.incidents, "incident_service"))
        self.assertTrue(hasattr(backend.reports, "report_service"))
        self.assertTrue(hasattr(backend.simulator, "simulator_service"))
        self.assertTrue(hasattr(backend.api, "api_router"))

    def test_deduplication_station_timestamp_rules(self):
        """
        Verify station+timestamp deduplication:
        Multiple stations reporting at the exact same timestamp must NOT be treated as duplicates of each other.
        Same station reporting identical timestamp twice must be flagged as duplicate.
        """
        dedup = TelemetryDeduplicator()
        same_time = datetime.datetime(2026, 9, 17, 12, 0, 0, tzinfo=datetime.timezone.utc)

        # 1. Station A reports at T
        is_dup_a, _ = dedup.check_and_register("AWS-01", same_time)
        self.assertFalse(is_dup_a)

        # 2. Station B reports at the exact same T -> MUST NOT be considered a duplicate!
        is_dup_b, _ = dedup.check_and_register("AWS-02", same_time)
        self.assertFalse(is_dup_b)

        # 3. Station C reports at the exact same T -> MUST NOT be considered a duplicate!
        is_dup_c, _ = dedup.check_and_register("AWS-03", same_time)
        self.assertFalse(is_dup_c)

        # 4. Station A reports at T again -> MUST be flagged as duplicate!
        is_dup_a_again, msg = dedup.check_and_register("AWS-01", same_time)
        self.assertTrue(is_dup_a_again)
        self.assertIn("Duplicate timestamp", msg)

        # 5. Station A reports timestamp earlier than previous -> regression
        earlier_time = same_time - datetime.timedelta(seconds=10)
        is_dup_earlier, reg_msg = dedup.check_and_register("AWS-01", earlier_time)
        self.assertTrue(is_dup_earlier)
        self.assertIn("Out-of-order", reg_msg)

    def test_communication_failure_gating_and_bypass(self):
        """
        Verify communication-failure gating:
        Communication failures bypass ML/SHAP as implemented, and remain distinct from sensor faults.
        """
        comm = CommunicationMonitor()
        now = datetime.datetime.now(datetime.timezone.utc)

        # Test Station Offline fault injection
        raw_offline = {
            "temperature": 28.5,
            "pressure": 1012.0,
            "humidity": 78.0,
            "injected_fault_type": "STATION_OFFLINE"
        }
        is_fail, rec = comm.register_reading("AWS-01", now, raw_offline)
        self.assertTrue(is_fail)
        self.assertEqual(rec["category"], "COMMUNICATION_FAILURE")
        self.assertEqual(rec["severity"], "CRITICAL")
        self.assertEqual(rec["status"], "Communication Failure")
        self.assertIn("Sensor evaluation bypassed", rec["why_detected"])

        # Test normal packet
        raw_nominal = {
            "temperature": 28.5,
            "pressure": 1012.0,
            "humidity": 78.0,
            "injected_fault_type": "NONE"
        }
        is_fail_nom, rec_nom = comm.register_reading("AWS-02", now, raw_nominal)
        self.assertFalse(is_fail_nom)
        self.assertIsNone(rec_nom)

    def test_spatial_consensus_scenarios(self):
        """
        Verify spatial consensus 3 scenarios:
        - Scenario A: isolated station anomaly -> Likely Sensor Fault
        - Scenario B: all-station anomaly -> Genuine Weather Event
        - Scenario C: partial agreement -> Requires Investigation
        """
        engine = SpatialConsistencyEngine()
        target_station = {"station_id": "AWS-01", "coordinates": {"lat": 15.4989, "lon": 73.8278}}

        # Scenario A: Target temperature is 48.0°C, neighbors are normal (28.0°C, 28.5°C)
        neighbors_a = [
            {"station_id": "AWS-02", "coordinates": {"lat": 15.27, "lon": 73.95}, "temperature": 28.0, "pressure": 1012.0, "humidity": 75.0},
            {"station_id": "AWS-03", "coordinates": {"lat": 15.39, "lon": 73.81}, "temperature": 28.5, "pressure": 1011.8, "humidity": 76.0}
        ]
        res_a = engine.evaluate_spatial_consensus(target_station, {"temperature": 48.0, "pressure": 1012.0, "humidity": 75.0}, neighbors_a)
        self.assertFalse(res_a["is_corroborated"])
        self.assertEqual(res_a["consensus_classification"], "Likely Sensor Fault")

        # Scenario B: Target temperature is 40.0°C and all neighboring stations also read ~40.0°C
        neighbors_b = [
            {"station_id": "AWS-02", "coordinates": {"lat": 15.27, "lon": 73.95}, "temperature": 40.2, "pressure": 1012.0, "humidity": 75.0},
            {"station_id": "AWS-03", "coordinates": {"lat": 15.39, "lon": 73.81}, "temperature": 39.8, "pressure": 1011.8, "humidity": 76.0}
        ]
        res_b = engine.evaluate_spatial_consensus(target_station, {"temperature": 40.0, "pressure": 1012.0, "humidity": 75.0}, neighbors_b)
        self.assertTrue(res_b["is_corroborated"])
        self.assertEqual(res_b["consensus_classification"], "Genuine Weather Event")

        # Scenario C: Partial agreement (1 station agrees, 1 station sharply contradicts)
        neighbors_c = [
            {"station_id": "AWS-02", "coordinates": {"lat": 15.27, "lon": 73.95}, "temperature": 35.0, "pressure": 1012.0, "humidity": 75.0},
            {"station_id": "AWS-03", "coordinates": {"lat": 15.39, "lon": 73.81}, "temperature": 25.0, "pressure": 1012.0, "humidity": 75.0}
        ]
        res_c = engine.evaluate_spatial_consensus(target_station, {"temperature": 35.0, "pressure": 1012.0, "humidity": 75.0}, neighbors_c)
        self.assertEqual(res_c["consensus_classification"], "Requires Investigation")

    def test_station_topology_and_degradation_states(self):
        """Verify station health evaluation and degradation tracking."""
        normal_history = [{"temperature": 28.0 + (i * 0.1), "pressure": 1012.0, "humidity": 75.0} for i in range(20)]
        health_nominal = degradation_service.calculate_station_health("AWS-01", normal_history, [])
        self.assertIn("overall_health_score", health_nominal)
        self.assertGreaterEqual(health_nominal["overall_health_score"], 80.0)

        # Repeated identical float values (stuck sensor)
        stuck_history = [{"temperature": 28.5, "pressure": 1012.0, "humidity": 75.0}] * 20
        health_stuck = degradation_service.calculate_station_health("AWS-02", stuck_history, [{"root_cause": "stuck_reading"}] * 5)
        self.assertLess(health_stuck["overall_health_score"], health_nominal["overall_health_score"])

    def test_incident_dossier_and_reports_endpoint(self):
        """Verify structured report dossier and HTML export endpoint."""
        resp_json = self.client.get("/api/reports/ANOM_2026_001")
        self.assertEqual(resp_json.status_code, 200)
        data = resp_json.json()
        self.assertIn("report_id", data)
        self.assertIn("sha256_digest", data)
        self.assertEqual(len(data["sha256_digest"]), 64)
        self.assertIn("anomaly", data)
        self.assertIn("recommendations", data)

        resp_html = self.client.get("/api/reports/ANOM_2026_001/html")
        self.assertEqual(resp_html.status_code, 200)
        self.assertIn("<!DOCTYPE html>", resp_html.text)
        self.assertIn("SkyGuard AI", resp_html.text)


if __name__ == "__main__":
    unittest.main()
