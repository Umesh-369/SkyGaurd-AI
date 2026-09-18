"""
backend/simulator/simulator_service.py
Virtual AWS Hardware Simulator Service for SkyGuard AI.
Bridges simulation state, multi-station reading generation, speed control, and fault injection.
Delegates to simulator.aws_simulator (single source of truth for physical station models).
"""

from typing import Dict, Any, List, Optional
import datetime
from simulator.aws_simulator import simulator_instance, VirtualAWSSimulator


class SimulatorService:
    """
    Service layer providing programmatic control over virtual AWS hardware simulation.
    """

    def __init__(self, simulator: VirtualAWSSimulator = simulator_instance):
        self.simulator = simulator

    @property
    def is_running(self) -> bool:
        return self.simulator.is_running

    @property
    def speed_multiplier(self) -> float:
        return self.simulator.speed_multiplier

    @property
    def step_count(self) -> int:
        return self.simulator.step_count

    @property
    def stations(self) -> Dict[str, Dict[str, Any]]:
        return self.simulator.stations

    @property
    def active_injections(self) -> Dict[str, Dict[str, Any]]:
        return self.simulator.active_injections

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "ONLINE",
            "is_running": self.simulator.is_running,
            "speed_multiplier": self.simulator.speed_multiplier,
            "step_count": self.simulator.step_count,
            "station_count": len(self.simulator.stations),
            "active_injections": self.simulator.active_injections,
            "stations": list(self.simulator.stations.keys())
        }

    def start_simulation(self) -> Dict[str, Any]:
        return self.simulator.start_simulation()

    def stop_simulation(self) -> Dict[str, Any]:
        return self.simulator.stop_simulation()

    def reset_simulation(self) -> Dict[str, Any]:
        return self.simulator.reset_simulation()

    def set_speed(self, speed: float) -> Dict[str, Any]:
        return self.simulator.set_speed(speed)

    def inject_fault(
        self,
        station_id: str,
        fault_type: str,
        parameter: str = "temperature",
        magnitude: float = 15.0,
        duration_steps: int = 30
    ) -> Dict[str, Any]:
        return self.simulator.inject_fault(
            station_id=station_id,
            fault_type=fault_type,
            parameter=parameter,
            magnitude=magnitude,
            duration_steps=duration_steps
        )

    def clear_injections(self, station_id: Optional[str] = None) -> Dict[str, Any]:
        return self.simulator.clear_injections(station_id)

    def generate_reading(
        self,
        station_id: str,
        current_time: Optional[datetime.datetime] = None,
        force_regenerate: bool = False
    ) -> Optional[Dict[str, Any]]:
        return self.simulator.generate_reading(
            station_id=station_id,
            current_time=current_time,
            force_regenerate=force_regenerate
        )

    def generate_all_stations(self) -> List[Dict[str, Any]]:
        return self.simulator.generate_all_stations()


simulator_service = SimulatorService()
