"""
backend/explainability/shap_service.py
Service layer for SHAP calculations, feature importance attribution, and narrative formatting.
Delegates directly to ml.explainability (the single source of truth for SHAP computation).
"""

from typing import Dict, Any, List, Optional
import numpy as np
from ml.explainability import explainer_instance, AnomalyExplainer


class ShapExplainabilityService:
    """
    Orchestrates model SHAP calculation and narrative generation.
    """

    def __init__(self, explainer: AnomalyExplainer = explainer_instance):
        self.explainer = explainer

    def prewarm(self, detector):
        """Initializes and pre-warms the SHAP explainer."""
        self.explainer._init_shap_explainer(detector)
        try:
            dummy_feat = {name: 0.0 for name in self.explainer.feature_names}
            dummy_scaled = np.zeros((1, len(self.explainer.feature_names)))
            self.explainer.explain_instance(dummy_feat, detector, dummy_scaled)
            print("[ShapService] SHAP explainer pre-warmed successfully.")
        except Exception as e:
            print(f"[ShapService] SHAP explainer prewarm notice: {e}")

    def explain_instance(
        self,
        features_dict: Dict[str, float],
        detector=None,
        X_scaled: Optional[np.ndarray] = None
    ) -> List[Dict[str, Any]]:
        """Computes sorted list of contributing factors with SHAP values."""
        return self.explainer.explain_instance(features_dict, detector, X_scaled)

    def generate_narrative_explanation(
        self,
        features_dict: Dict[str, float],
        top_factors: List[Dict[str, Any]],
        multi_sensor_consistency: Optional[Dict[str, Any]] = None,
        spatial_consensus: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """Formats human-interpretable narrative pack."""
        return self.explainer.generate_narrative_explanation(
            features_dict=features_dict,
            top_factors=top_factors,
            multi_sensor_consistency=multi_sensor_consistency,
            spatial_consensus=spatial_consensus
        )


shap_service = ShapExplainabilityService()
