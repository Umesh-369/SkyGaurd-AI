"""
backend/explainability/imputer_service.py
Service for hybrid spatio-temporal missing and anomalous value correction.
Delegates to ml.imputer (single source of truth for imputation algorithms).
"""

from typing import Dict, Any, List, Optional
from ml.imputer import ValueImputer


class ImputerService:
    """
    Suggests corrected / imputed values when readings are flagged as anomalous.
    """

    def __init__(self, imputer: Optional[ValueImputer] = None):
        self.imputer = imputer or ValueImputer()

    def suggest_correction(
        self,
        target_feature: str,
        anomalous_value: float,
        recent_history: Optional[List[Dict[str, float]]] = None,
        spatial_neighbors: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        return self.imputer.suggest_correction(
            target_feature,
            anomalous_value,
            recent_history=recent_history,
            spatial_neighbors=spatial_neighbors
        )


imputer_service = ImputerService()
