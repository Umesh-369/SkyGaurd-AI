"""
simulator/aws_simulator.py
Virtual Automatic Weather Station (AWS) Hardware Simulator for SkyGuard AI.
Generates realistic multi-station T, P, RH (Tier 1) + Wind Speed, Rainfall (Tier 2 context) streams driven by learned model distributions.
Includes ALL 14 stations across both OpenML Goa Dataset 43409 and Secondary Local Indian Climate Dataset (2024-2025).
Supports interactive controls (Start, Stop, Reset, Speed multipliers) and 8 on-demand controlled fault injection modes.
"""

import os
import json
import time
import math
import random
import datetime
from typing import Dict, Any, List, Optional
import numpy as np

BASELINE_STATS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "baseline_stats.json")


class VirtualAWSSimulator:
    """
    Simulates AWS station network streaming live meteorological data for all 14 stations across India.
    """

    def __init__(self):
        # 14 AWS Stations covering OpenML Goa Primary Dataset + Local Indian Climate Secondary Dataset
        self.stations = {
            # --- Primary OpenML Goa Stations (4) ---
            "AWS-01": {
                "id": "AWS-01",
                "legacy_id": "AWS_GOA_01",
                "alias_id": "AWS-IND-GA-01",
                "name": "Panaji Coastal Station",
                "city": "Panaji",
                "state": "Goa",
                "lat": 15.4989,
                "lon": 73.8278,
                "elevation_m": 7.0,
                "base_temp": 28.5,
                "base_press": 1012.0,
                "base_humid": 80.0,
                "base_wind": 12.5,
                "base_rain": 0.0
            },
            "AWS-02": {
                "id": "AWS-02",
                "legacy_id": "AWS_GOA_02",
                "alias_id": "AWS-IND-GA-02",
                "name": "Margao Inland Station",
                "city": "Margao",
                "state": "Goa",
                "lat": 15.2736,
                "lon": 73.9581,
                "elevation_m": 12.0,
                "base_temp": 29.2,
                "base_press": 1011.2,
                "base_humid": 74.0,
                "base_wind": 8.0,
                "base_rain": 0.0
            },
            "AWS-03": {
                "id": "AWS-03",
                "legacy_id": "AWS_GOA_03",
                "alias_id": "AWS-IND-GA-03",
                "name": "Vasco Port Station",
                "city": "Vasco",
                "state": "Goa",
                "lat": 15.3959,
                "lon": 73.8157,
                "elevation_m": 5.0,
                "base_temp": 28.0,
                "base_press": 1012.5,
                "base_humid": 82.0,
                "base_wind": 16.0,
                "base_rain": 0.0
            },
            "AWS-04": {
                "id": "AWS-04",
                "legacy_id": "AWS_GOA_04",
                "alias_id": "AWS-IND-GA-04",
                "name": "Mapusa North Station",
                "city": "Mapusa",
                "state": "Goa",
                "lat": 15.5926,
                "lon": 73.8117,
                "elevation_m": 18.0,
                "base_temp": 27.8,
                "base_press": 1010.8,
                "base_humid": 76.0,
                "base_wind": 10.0,
                "base_rain": 0.0
            },

            # --- Secondary Local Indian Climate Dataset Stations (10 Major Cities) ---
            "AWS-IND-MUM": {
                "id": "AWS-IND-MUM",
                "legacy_id": "AWS_MUMBAI",
                "name": "Mumbai Coastal AWS",
                "city": "Mumbai",
                "state": "Maharashtra",
                "lat": 19.0760,
                "lon": 72.8777,
                "elevation_m": 14.0,
                "base_temp": 27.2,
                "base_press": 1011.5,
                "base_humid": 75.0,
                "base_wind": 14.0,
                "base_rain": 0.0
            },
            "AWS-IND-GA-01": {
                "id": "AWS-IND-GA-01",
                "legacy_id": "AWS_GOA_01",
                "alias_id": "AWS-01",
                "name": "Panaji Coastal Station",
                "city": "Panaji",
                "state": "Goa",
                "lat": 15.4989,
                "lon": 73.8278,
                "elevation_m": 7.0,
                "base_temp": 28.5,
                "base_press": 1012.0,
                "base_humid": 80.0,
                "base_wind": 12.5,
                "base_rain": 0.0
            },
            "AWS-IND-BLR": {
                "id": "AWS-IND-BLR",
                "legacy_id": "AWS_BENGALURU",
                "name": "Bengaluru Plateau AWS",
                "city": "Bengaluru",
                "state": "Karnataka",
                "lat": 12.9716,
                "lon": 77.5946,
                "elevation_m": 920.0,
                "base_temp": 24.5,
                "base_press": 1014.0,
                "base_humid": 65.0,
                "base_wind": 11.0,
                "base_rain": 0.0
            },
            "AWS-IND-MAA": {
                "id": "AWS-IND-MAA",
                "legacy_id": "AWS_CHENNAI",
                "name": "Chennai Coastal AWS",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "lat": 13.0827,
                "lon": 80.2707,
                "elevation_m": 6.0,
                "base_temp": 29.5,
                "base_press": 1010.0,
                "base_humid": 78.0,
                "base_wind": 13.5,
                "base_rain": 0.0
            },
            "AWS-IND-CCU": {
                "id": "AWS-IND-CCU",
                "legacy_id": "AWS_KOLKATA",
                "name": "Kolkata Delta AWS",
                "city": "Kolkata",
                "state": "West Bengal",
                "lat": 22.5726,
                "lon": 88.3639,
                "elevation_m": 9.0,
                "base_temp": 26.8,
                "base_press": 1009.5,
                "base_humid": 76.0,
                "base_wind": 10.5,
                "base_rain": 0.0
            },
            "AWS-IND-HYD": {
                "id": "AWS-IND-HYD",
                "legacy_id": "AWS_HYDERABAD",
                "name": "Hyderabad Deccan AWS",
                "city": "Hyderabad",
                "state": "Telangana",
                "lat": 17.3850,
                "lon": 78.4867,
                "elevation_m": 542.0,
                "base_temp": 27.0,
                "base_press": 1010.2,
                "base_humid": 64.0,
                "base_wind": 12.0,
                "base_rain": 0.0
            },
            "AWS-IND-AMD": {
                "id": "AWS-IND-AMD",
                "legacy_id": "AWS_AHMEDABAD",
                "name": "Ahmedabad Western AWS",
                "city": "Ahmedabad",
                "state": "Gujarat",
                "lat": 23.0225,
                "lon": 72.5714,
                "elevation_m": 53.0,
                "base_temp": 28.0,
                "base_press": 1011.0,
                "base_humid": 58.0,
                "base_wind": 11.5,
                "base_rain": 0.0
            },
            "AWS-IND-JAI": {
                "id": "AWS-IND-JAI",
                "legacy_id": "AWS_JAIPUR",
                "name": "Jaipur Desert Fringe AWS",
                "city": "Jaipur",
                "state": "Rajasthan",
                "lat": 26.9124,
                "lon": 75.7873,
                "elevation_m": 431.0,
                "base_temp": 26.5,
                "base_press": 1009.0,
                "base_humid": 52.0,
                "base_wind": 13.0,
                "base_rain": 0.0
            },
            "AWS-IND-LKO": {
                "id": "AWS-IND-LKO",
                "legacy_id": "AWS_LUCKNOW",
                "name": "Lucknow Gangetic AWS",
                "city": "Lucknow",
                "state": "Uttar Pradesh",
                "lat": 26.8467,
                "lon": 80.9462,
                "elevation_m": 123.0,
                "base_temp": 25.8,
                "base_press": 1010.5,
                "base_humid": 68.0,
                "base_wind": 8.5,
                "base_rain": 0.0
            },
            "AWS-IND-BHO": {
                "id": "AWS-IND-BHO",
                "legacy_id": "AWS_BHOPAL",
                "name": "Bhopal Central AWS",
                "city": "Bhopal",
                "state": "Madhya Pradesh",
                "lat": 23.2599,
                "lon": 77.4126,
                "elevation_m": 527.0,
                "base_temp": 26.2,
                "base_press": 1011.8,
                "base_humid": 60.0,
                "base_wind": 9.0,
                "base_rain": 0.0
            }
        }

        self.is_running: bool = True
        self.speed_multiplier: float = 1.0
        self.step_count: int = 0

        self.active_injections: Dict[str, Dict[str, Any]] = {}
        self.frozen_values: Dict[str, Dict[str, float]] = {}
        self.drift_accumulators: Dict[str, Dict[str, float]] = {}

        self.latest_readings_cache: Dict[str, Dict[str, Any]] = {}
        self.baseline_stats = self._load_learned_stats()

    def _load_learned_stats(self) -> Dict[str, Any]:
        if os.path.exists(BASELINE_STATS_PATH):
            try:
                with open(BASELINE_STATS_PATH, "r") as f:
                    data = json.load(f)
                    print("[Simulator] Loaded learned baseline statistics from models/baseline_stats.json")
                    return data.get("stats", {})
            except Exception as e:
                print(f"[Simulator] Could not load baseline stats: {e}")
        return {
            "temperature": {"mean": 28.0, "std": 3.0},
            "pressure": {"mean": 1012.0, "std": 4.5},
            "humidity": {"mean": 75.0, "std": 10.0}
        }

    def start_simulation(self):
        self.is_running = True
        return {"status": "success", "message": "Simulation STARTED", "is_running": True}

    def stop_simulation(self):
        self.is_running = False
        return {"status": "success", "message": "Simulation PAUSED (state held in place)", "is_running": False}

    def reset_simulation(self):
        self.active_injections.clear()
        self.frozen_values.clear()
        self.drift_accumulators.clear()
        self.step_count = 0
        self.latest_readings_cache.clear()
        return {
            "status": "success",
            "message": "Simulation RESET to initial baseline",
            "is_running": self.is_running,
            "step_count": 0
        }

    def set_speed(self, speed: float):
        if speed <= 0:
            speed = 1.0
        self.speed_multiplier = float(speed)
        return {
            "status": "success",
            "message": f"Simulation speed set to {self.speed_multiplier}x",
            "speed_multiplier": self.speed_multiplier
        }

    def inject_fault(
        self,
        station_id: str,
        fault_type: str,
        parameter: str = "temperature",
        magnitude: float = 15.0,
        duration_steps: int = 30
    ) -> Dict[str, Any]:
        if station_id == "AWS-IND-DEL" or station_id == "DELHI":
            station_id = "AWS-01"
        matched_id = None
        for key, st in self.stations.items():
            if key == station_id or st.get("legacy_id") == station_id or st.get("alias_id") == station_id:
                matched_id = key
                break

        if not matched_id:
            return {"status": "error", "message": f"Station {station_id} not found."}

        f_type = fault_type.lower()
        self.active_injections[matched_id] = {
            "type": f_type,
            "parameter": parameter.lower(),
            "magnitude": float(magnitude),
            "duration_steps": duration_steps,
            "remaining_steps": duration_steps,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        if "drift" in f_type:
            self.drift_accumulators[matched_id] = {parameter.lower(): 0.0}

        return {
            "status": "success",
            "message": f"Injected fault '{fault_type}' on station {matched_id} for {duration_steps} steps.",
            "injection": self.active_injections[matched_id]
        }

    def clear_injections(self, station_id: Optional[str] = None):
        if station_id:
            if station_id == "AWS-IND-DEL" or station_id == "DELHI":
                station_id = "AWS-01"
            matched_id = None
            for key, st in self.stations.items():
                if key == station_id or st.get("legacy_id") == station_id or st.get("alias_id") == station_id:
                    matched_id = key
                    break
            if matched_id:
                self.active_injections.pop(matched_id, None)
                self.frozen_values.pop(matched_id, None)
                self.drift_accumulators.pop(matched_id, None)
        else:
            self.active_injections.clear()
            self.frozen_values.clear()
            self.drift_accumulators.clear()

        return {"status": "success", "message": "Cleared all active fault injections."}

    def generate_reading(
        self,
        station_id: str,
        current_time: Optional[datetime.datetime] = None,
        force_regenerate: bool = False
    ) -> Optional[Dict[str, Any]]:
        if station_id == "AWS-IND-DEL" or station_id == "DELHI":
            station_id = "AWS-01"
        matched_id = None
        if station_id in self.stations:
            matched_id = station_id
        else:
            for key, st in self.stations.items():
                if key == station_id or st.get("legacy_id") == station_id or st.get("alias_id") == station_id:
                    matched_id = key
                    break

        if not matched_id:
            return None

        # Return cached paused snapshot ONLY if simulation is stopped AND no fault was freshly injected AND force_regenerate is False
        if not self.is_running and matched_id in self.latest_readings_cache and not force_regenerate and matched_id not in self.active_injections:
            cached = self.latest_readings_cache[matched_id].copy()
            cached["is_paused_snapshot"] = True
            return cached

        st = self.stations[matched_id]
        now = current_time or datetime.datetime.now(datetime.timezone.utc)
        hour = now.hour + (now.minute / 60.0) + (now.second / 3600.0)

        temp_diurnal = 3.8 * math.sin(2.0 * math.pi * (hour - 9.0) / 24.0)
        press_diurnal = -1.8 * math.sin(2.0 * math.pi * (hour - 6.0) / 24.0)
        humid_diurnal = -12.0 * math.sin(2.0 * math.pi * (hour - 9.0) / 24.0)
        wind_diurnal = 3.0 * math.sin(2.0 * math.pi * (hour - 12.0) / 24.0)

        noise_T = random.gauss(0, 0.25)
        noise_P = random.gauss(0, 0.35)
        noise_RH = random.gauss(0, 0.8)
        noise_Wind = random.gauss(0, 1.2)

        temp = round(st["base_temp"] + temp_diurnal + noise_T, 2)
        press = round(st["base_press"] + press_diurnal + noise_P, 2)
        humid = round(min(100.0, max(20.0, st["base_humid"] + humid_diurnal + noise_RH)), 2)
        wind_speed = round(max(0.0, st["base_wind"] + wind_diurnal + noise_Wind), 2)
        rainfall = round(max(0.0, float(np.random.exponential(1.5)) if random.random() > 0.85 else 0.0), 2)

        injection = self.active_injections.get(matched_id)
        is_simulated_fault = False
        injected_fault_tag = "NONE"
        reading_timestamp = now

        if injection and injection["remaining_steps"] > 0:
            f_type = injection["type"]
            f_param = injection["parameter"]
            mag = injection["magnitude"]
            is_simulated_fault = True
            injected_fault_tag = f_type.upper()

            if f_type in ["temperature_spike", "spike"]:
                temp = round(temp + abs(mag), 2)
            elif f_type in ["temperature_drop"]:
                temp = round(temp - abs(mag), 2)
            elif f_type in ["pressure_drop"]:
                press = round(press - abs(mag), 2)
            elif f_type in ["humidity_spike"]:
                humid = round(min(100.0, humid + abs(mag)), 2)
            elif f_type in ["sensor_drift", "drift"]:
                if matched_id not in self.drift_accumulators:
                    self.drift_accumulators[matched_id] = {f_param: 0.0}
                self.drift_accumulators[matched_id][f_param] += mag
                drift_val = self.drift_accumulators[matched_id][f_param]
                if f_param == "temperature":
                    temp = round(temp + drift_val, 2)
                elif f_param == "pressure":
                    press = round(press + drift_val, 2)
                elif f_param == "humidity":
                    humid = round(min(100.0, max(0.0, humid + drift_val)), 2)
            elif f_type in ["stuck_sensor", "frozen"]:
                if matched_id not in self.frozen_values:
                    self.frozen_values[matched_id] = {
                        "temperature": temp,
                        "pressure": press,
                        "humidity": humid
                    }
                frozen_st = self.frozen_values[matched_id]
                temp = frozen_st["temperature"]
                press = frozen_st["pressure"]
                humid = frozen_st["humidity"]
            elif f_type in ["multivariate_fault", "multi_sensor"]:
                temp = round(temp + 14.5, 2)
                press = round(press - 22.0, 2)
                humid = round(min(100.0, max(0.0, humid - 35.0)), 2)
            elif f_type in ["station_offline", "missing_readings", "missing_data"]:
                injected_fault_tag = "STATION_OFFLINE"
            elif f_type in ["delayed_data", "long_gap", "delayed_readings"]:
                injected_fault_tag = "DELAYED_DATA"
                reading_timestamp = now - datetime.timedelta(seconds=25)

            injection["remaining_steps"] -= 1
            if injection["remaining_steps"] <= 0:
                self.active_injections.pop(matched_id, None)

        reading = {
            "station_id": matched_id,
            "legacy_id": st["legacy_id"],
            "station_name": st["name"],
            "city": st["city"],
            "state": st["state"],
            "coordinates": {"lat": st["lat"], "lon": st["lon"]},
            "elevation_m": st["elevation_m"],
            "timestamp": reading_timestamp.isoformat(),
            "temperature": temp,
            "pressure": press,
            "humidity": humid,
            "wind_speed": wind_speed,
            "rainfall": rainfall,
            "origin": "SIMULATED",
            "is_simulated_fault": is_simulated_fault,
            "injected_fault_type": injected_fault_tag,
            "is_paused_snapshot": False
        }

        self.latest_readings_cache[matched_id] = reading
        return reading

    def generate_all_stations(self) -> List[Dict[str, Any]]:
        if self.is_running:
            self.step_count += 1
        results = []
        for s_id in self.stations:
            rd = self.generate_reading(s_id)
            if rd:
                results.append(rd)
        return results


# Global singleton instance
simulator_instance = VirtualAWSSimulator()
