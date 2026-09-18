"""
backend/integrations/datasets/data_loader_adapter.py
Adapter for OpenML and Indian Climate datasets.
Delegates to ml.data_loader to preserve single source of truth for ML dataset formats.
"""

from ml.data_loader import OpenMLDataLoader


class DatasetAdapter:
    """
    Adapter layer exposing dataset streaming capabilities for backend routers & services.
    """

    def __init__(self):
        self._loader = OpenMLDataLoader()

    def fetch_openml_data(self):
        return self._loader.fetch_raw_openml_data()

    def fetch_indian_climate_dataset(self):
        return self._loader.fetch_raw_indian_climate_dataset()

    def prepare_combined_tier1_dataset(self):
        return self._loader.prepare_combined_tier1_dataset()


dataset_adapter = DatasetAdapter()
