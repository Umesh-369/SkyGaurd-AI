"""
backend/services/recommendation_engine.py
Deterministic Recommendation Engine for SkyGuard AI.
Generates prioritized, rule-based corrective recommendations by synthesizing:
1. Anomaly Category & Type (Sensor Fault vs Genuine Weather Event vs Communication Failure)
2. SHAP Contributing Features & Direction (e.g. rolling_mean_T, dP, dev_from_baseline_RH)
3. Station Metadata & Regional Geography (Coastal, Inland, Delta, Plateau)
4. Tier-2 Disaster Risk Score (Flood, Heatwave, Cyclone risk indices)

Strictly deterministic priority and action determination.
Optional LLM phrasing hook with deterministic templated sentence fallback.
"""

from typing import Dict, Any, List, Optional


class RecommendationEngine:
    """
    Synthesizes deterministic engineering & operational recommendations.
    """

    def generate_recommendations(
        self,
        anomaly: Dict[str, Any],
        disaster_risks: Optional[Dict[str, Any]] = None,
        use_llm_phrasing: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Calculates prioritized recommendation items.
        """
        category = anomaly.get("category", "SENSOR_FAULT")
        severity = anomaly.get("severity", "MEDIUM")
        root_cause = str(anomaly.get("root_cause", "UNKNOWN_FAULT")).lower()
        station_id = anomaly.get("station_id") or anomaly.get("stationId") or "AWS-01"
        station_name = anomaly.get("station_name") or anomaly.get("stationName") or station_id
        
        # Contributing factors & top SHAP feature
        factors = anomaly.get("contributing_factors", [])
        top_feature = "temperature"
        top_shap_val = 0.0
        if factors and isinstance(factors, list) and len(factors) > 0:
            top_feature = factors[0].get("feature", "temperature")
            top_shap_val = float(factors[0].get("shap_weight", 0.0))

        # Tier-2 Disaster Risk Context
        comp_risk_score = 0.0
        comp_risk_level = "LOW"
        if disaster_risks:
            comp_risk_score = float(disaster_risks.get("composite_risk_score", 0.0))
            comp_risk_level = disaster_risks.get("composite_risk_level", "LOW")

        recommendations = []

        # =========================================================================
        # 1. COMMUNICATION FAILURE LOGIC
        # =========================================================================
        if category == "COMMUNICATION_FAILURE" or "offline" in root_cause or "comm" in root_cause or "delay" in root_cause:
            is_offline = "offline" in root_cause or "missing" in root_cause
            priority = "CRITICAL" if (comp_risk_score > 50 or is_offline) else "HIGH"
            
            action_title = "Dispatch Telemetry Link Diagnostics & Check Solar PSU" if is_offline else "Check Edge Modem Buffer & GSM/LoRa Link Latency"
            reason = (
                f"Target station '{station_name}' has stopped broadcasting regular telemetry packets. "
                f"Communication monitor detected packet loss. Potential causes: solar power exhaustion, cellular network packet drop, or edge MCU lockup."
                if is_offline else
                f"Telemetry timestamps from '{station_name}' exhibit abnormal latency (>18s). Network congestion or buffer overrun likely."
            )
            
            recommendations.append({
                "id": f"REC_{station_id}_COMM_1",
                "priority": priority,
                "action": action_title,
                "reason": reason,
                "evidence_basis": f"Protocol: Missing packet count threshold exceeded on {station_id}.",
                "suggested_owner": "Field Network Operations & AWS Maintenance Team",
                "estimated_resolution_time": "1 - 2 Hours",
                "is_safety_critical": priority == "CRITICAL"
            })

            recommendations.append({
                "id": f"REC_{station_id}_COMM_2",
                "priority": "MEDIUM",
                "action": "Enable Nearby Station Interpolation Proxy in Downstream Modeling",
                "reason": f"While '{station_name}' is offline, activate spatio-temporal virtual sensor proxy to maintain forecast continuity without gap artifacts.",
                "evidence_basis": "Spatio-Temporal KNN / Distance-Weighted Nearest Neighbor Fallback.",
                "suggested_owner": "Automated SkyGuard Imputation Service",
                "estimated_resolution_time": "Instant (Automated)",
                "is_safety_critical": False
            })

        # =========================================================================
        # 2. GENUINE SEVERE WEATHER EVENT LOGIC
        # =========================================================================
        elif category == "GENUINE_WEATHER_EVENT" or "corroborated" in str(anomaly.get("spatial_verdict", "")).lower():
            priority = "CRITICAL" if comp_risk_score >= 60 or severity in ["HIGH", "CRITICAL"] else "HIGH"
            hazard_type = "Severe Weather"
            if disaster_risks and "hazards" in disaster_risks:
                hazards = disaster_risks["hazards"]
                if hazards.get("cyclone", {}).get("risk_score", 0) > 50:
                    hazard_type = "Severe Cyclone / Storm Surge"
                elif hazards.get("flood", {}).get("risk_score", 0) > 50:
                    hazard_type = "Flash Flood & Torrential Rainfall"
                elif hazards.get("heatwave", {}).get("risk_score", 0) > 50:
                    hazard_type = "Severe Extreme Heatwave"

            recommendations.append({
                "id": f"REC_{station_id}_WX_1",
                "priority": priority,
                "action": f"Issue Early Warning Advisory & Escalate {hazard_type} Protocol",
                "reason": (
                    f"Physical anomaly at '{station_name}' is CORROBORATED by adjacent regional AWS nodes. "
                    f"Sensor hardware is healthy; reading represents a genuine physical meteorological event with a composite risk index of {comp_risk_score}%."
                ),
                "evidence_basis": f"Spatial Consensus: Corroborated by spatial neighbors (SHAP top driver: {top_feature}).",
                "suggested_owner": "State Disaster Management Authority (SDMA) & IMD Duty Officer",
                "estimated_resolution_time": "Immediate Action Required",
                "is_safety_critical": True
            })

            recommendations.append({
                "id": f"REC_{station_id}_WX_2",
                "priority": "HIGH",
                "action": "Increase Telemetry Sampling Frequency to 30-Second Rapid Mode",
                "reason": f"During confirmed {hazard_type}, switch virtual and hardware AWS stations in this geographical cluster into high-cadence burst telemetry.",
                "evidence_basis": f"Tier 2 Composite Risk Level: {comp_risk_level}.",
                "suggested_owner": "Telemetry Control Engine",
                "estimated_resolution_time": "Automated",
                "is_safety_critical": False
            })

        # =========================================================================
        # 3. SENSOR FAULT LOGIC (Temperature, Pressure, Humidity, Drift, Stuck)
        # =========================================================================
        else:
            is_stuck = "stuck" in root_cause or "frozen" in root_cause
            is_drift = "drift" in root_cause or "bias" in root_cause
            is_spike = "spike" in root_cause or "drop" in root_cause
            
            # Decide priority deterministically
            if severity == "CRITICAL" or comp_risk_score > 70:
                priority = "CRITICAL"
            elif severity == "HIGH" or is_spike:
                priority = "HIGH"
            elif is_drift or is_stuck:
                priority = "MEDIUM"
            else:
                priority = "LOW"

            # Determine affected sensor component
            sensor_name = "Thermal Sensor Probe (PT100/RTD)" if "temp" in top_feature else (
                "Barometric Pressure Transducer (Piezoelectric)" if "press" in top_feature else
                "Capacitive Relative Humidity Sensor"
            )

            param_key = "temperature" if "temp" in top_feature else ("pressure" if "press" in top_feature else "humidity")
            
            if is_stuck:
                action_text = f"Perform Soft Reset & Power-Cycle {sensor_name}"
                reason_text = (
                    f"Sensor for {param_key} at '{station_name}' has repeated identical float values across consecutive sampling intervals (zero variance). "
                    f"Indicates ADC buffer hang or physical probe short circuit."
                )
            elif is_drift:
                action_text = f"Apply Auto-Zero Bias Calibration Offset & Schedule Recalibration for {sensor_name}"
                reason_text = (
                    f"Station '{station_name}' demonstrates persistent progressive linear bias drift in {param_key} against baseline spatial neighbors. "
                    f"Recalibration is needed to prevent cumulative forecast contamination."
                )
            else:
                action_text = f"Isolate Faulty {sensor_name} & Substitute Hybrid Imputed Stream"
                reason_text = (
                    f"Isolated unphysical {param_key} anomaly detected (SHAP weight +{top_shap_val:.2f}) contradicted by neighboring stations. "
                    f"Reading rejected from Tier 2 risk calculations to prevent false alarms."
                )

            recommendations.append({
                "id": f"REC_{station_id}_SENSOR_1",
                "priority": priority,
                "action": action_text,
                "reason": reason_text,
                "evidence_basis": f"SHAP Driver: '{top_feature}' (weight {top_shap_val:+.2f}) contradicted by spatial neighbors.",
                "suggested_owner": "AWS Instrumentation & Quality Control Engineer",
                "estimated_resolution_time": "24 - 48 Hours",
                "is_safety_critical": priority in ["HIGH", "CRITICAL"]
            })

            # Imputed substitution recommendation
            imputed = anomaly.get("imputed_value_suggestion")
            if imputed:
                corrected_v = float(imputed.get("corrected_value", 0.0))
                diff_v = float(imputed.get("difference", 0.0))
                recommendations.append({
                    "id": f"REC_{station_id}_SENSOR_2",
                    "priority": "HIGH" if priority in ["HIGH", "CRITICAL"] else "MEDIUM",
                    "action": f"Adopt Spatio-Temporal Imputed Value ({corrected_v:.1f}) into Analytical Store",
                    "reason": f"Synthetic correction suggested via Hybrid Spatio-Temporal EMA (Delta: {diff_v:+.1f}) to preserve time-series continuity.",
                    "evidence_basis": f"Imputation confidence: {imputed.get('confidence', 0.8)*100:.0f}%.",
                    "suggested_owner": "Data Ingestion Pipeline",
                    "estimated_resolution_time": "Instant (Automated)",
                    "is_safety_critical": False
                })

        return recommendations


# Global Singleton Instance
recommendation_engine = RecommendationEngine()
