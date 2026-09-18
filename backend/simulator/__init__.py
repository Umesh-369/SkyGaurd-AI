"""
backend/simulator package
Virtual AWS hardware simulation and controlled fault injection.
"""

from backend.simulator.simulator_service import (
    SimulatorService,
    simulator_service,
    simulator_instance,
    VirtualAWSSimulator,
)

__all__ = [
    "SimulatorService",
    "simulator_service",
    "simulator_instance",
    "VirtualAWSSimulator",
]
