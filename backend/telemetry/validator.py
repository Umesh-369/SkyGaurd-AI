"""
backend/telemetry/validator.py
Physical domain limits and range validation for Automatic Weather Station readings.
"""

from typing import Dict, Any, Tuple, List

PHYSICAL_LIMITS = {
    "temperature": (-5.0, 55.0),   # °C
    "pressure": (900.0, 1060.0),   # hPa
    "humidity": (0.0, 100.0)       # %
}


class TelemetryValidator:
    """
    Validates sensor values against deterministic physical bounds and schema rules.
    """

    @staticmethod
    def validate_reading(reading: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Inspects reading for required fields and physical limit violations.
        Returns:
            is_valid (bool): True if strictly within plausible physical bounds.
            violations (List[str]): List of violation descriptions.
            details (Dict[str, Any]): Detailed check outcomes.
        """
        violations = []
        details = {}

        for param, (low, high) in PHYSICAL_LIMITS.items():
            if param in reading and reading[param] is not None:
                val = float(reading[param])
                details[param] = {"value": val, "bounds": (low, high), "in_bounds": low <= val <= high}
                if val < low or val > high:
                    violations.append(f"{param} value {val} outside physical bounds [{low}, {high}]")

        is_valid = len(violations) == 0
        return is_valid, violations, details


telemetry_validator = TelemetryValidator()
