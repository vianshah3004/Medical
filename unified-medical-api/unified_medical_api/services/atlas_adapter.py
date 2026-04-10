from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from unified_medical_api.config import ATLAS_DIR


class AtlasAdapter:
    def __init__(self) -> None:
        self._service = None
        self._catalog = None

    def load(self) -> None:
        atlas_dir = str(ATLAS_DIR)
        if atlas_dir not in sys.path:
            sys.path.insert(0, atlas_dir)

        from service import InferenceService  # type: ignore
        import catalog  # type: ignore

        service = InferenceService()
        service.load_all()
        self._service = service
        self._catalog = catalog

    @property
    def loaded(self) -> bool:
        return self._service is not None

    def available_scan_types(self) -> list[str]:
        return ["brain", "lung", "skin", "ecg_image", "auto"]

    def analyze(self, scan_type: str, image_bytes: bytes, mc_samples: int = 1) -> dict[str, Any]:
        if not self._service:
            raise RuntimeError("Atlas adapter is not loaded.")

        model_map = {
            "brain": "brain_expert",
            "lung": "lung_expert",
            "skin": "skin_expert",
            "ecg_image": "ecg_expert",
            "auto": self._catalog.CLINICAL_SYSTEM_NAME,
        }
        model_name = model_map.get(scan_type)
        if not model_name:
            raise ValueError(f"Atlas does not support scan_type '{scan_type}'.")
        return self._service.predict(image_bytes, model_name=model_name, mc_samples=mc_samples)

