"""
backend/routers/simulator_router.py
Compatibility wrapper delegating to backend.api.routers.simulator.
"""

from backend.api.routers.simulator import (
    router,
    FaultInjectRequest,
    SpeedControlRequest,
    ClearFaultRequest,
    SandboxEvalRequest,
    get_simulator_status,
    start_simulation_endpoint,
    stop_simulation_endpoint,
    reset_simulation_endpoint,
    set_speed_endpoint,
    inject_fault_endpoint,
    clear_faults_endpoint,
    evaluate_sandbox_frame_endpoint,
)

__all__ = [
    "router",
    "FaultInjectRequest",
    "SpeedControlRequest",
    "ClearFaultRequest",
    "SandboxEvalRequest",
    "get_simulator_status",
    "start_simulation_endpoint",
    "stop_simulation_endpoint",
    "reset_simulation_endpoint",
    "set_speed_endpoint",
    "inject_fault_endpoint",
    "clear_faults_endpoint",
    "evaluate_sandbox_frame_endpoint",
]
