from __future__ import annotations

from unified_medical_api.services.atlas_adapter import AtlasAdapter
from unified_medical_api.services.diagno_adapter import DiagnoAdapter


class ServiceRegistry:
    def __init__(self) -> None:
        self.atlas = AtlasAdapter()
        self.diagno = DiagnoAdapter()
        self.atlas_loaded = False
        self.diagno_loaded = False

    def load(self) -> None:
        self.atlas.load()
        self.diagno.load()
        self.atlas_loaded = self.atlas.loaded
        self.diagno_loaded = self.diagno.loaded

    def scan_catalog(self) -> list[str]:
        return sorted(
            set(self.atlas.available_scan_types() + self.diagno.available_scan_types())
        )


registry = ServiceRegistry()

