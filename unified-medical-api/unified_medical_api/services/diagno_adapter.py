from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
from unified_medical_api.config import DIAGNO_BACKEND_DIR
from unified_medical_api.utils.files import image_bytes_to_array, parse_signal_file


class DiagnoAdapter:
    def __init__(self) -> None:
        self._tumor_engine = None
        self._dr_engine = None
        self._ecg_module = None
        self._fracture_module = None

    def load(self) -> None:
        backend_dir = str(DIAGNO_BACKEND_DIR)
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)

        current_dir = os.getcwd()
        os.chdir(backend_dir)
        try:
            from tumor_logic import TumorAnalyzer  # type: ignore
            from blood import DRAnalyzer  # type: ignore
            import api_ecg  # type: ignore
            import api_fracture  # type: ignore

            self._tumor_engine = TumorAnalyzer(str(Path(backend_dir) / "brain_tumor_classifier.pt"))
            self._dr_engine = DRAnalyzer(str(Path(backend_dir) / "best_modeldensenet121.pth"))
            self._ecg_module = api_ecg
            self._fracture_module = api_fracture
        finally:
            os.chdir(current_dir)

    @property
    def loaded(self) -> bool:
        return all(
            [
                self._tumor_engine is not None,
                self._dr_engine is not None,
                self._ecg_module is not None,
                self._fracture_module is not None,
            ]
        )

    def available_scan_types(self) -> list[str]:
        return ["tumor", "fracture", "diabetic_retinopathy", "ecg_signal"]

    def analyze_tumor(self, image_bytes: bytes, filename: str) -> dict[str, Any]:
        image = image_bytes_to_array(image_bytes, filename)
        result = self._tumor_engine.analyze(image)
        return result

    def analyze_diabetic_retinopathy(self, image_bytes: bytes, filename: str) -> dict[str, Any]:
        image = image_bytes_to_array(image_bytes, filename)
        result = self._dr_engine.analyze(image)
        if "error" in result:
            raise RuntimeError(result["error"])
        return result

    def analyze_fracture(self, image_bytes: bytes, filename: str) -> dict[str, Any]:
        image = image_bytes_to_array(image_bytes, filename)
        best_img, method_name, conf_score = self._fracture_module.smart_analyze_fracture(image)
        return {
            "prediction": "Fracture Detected" if conf_score > 0 else "No Clear Fracture Detected",
            "confidence": round(conf_score * 100, 2),
            "method_used": method_name,
            "detections_image": self._fracture_module.img_to_base64(best_img),
        }

    def analyze_fracture_advanced(self, image_bytes: bytes, filename: str) -> dict[str, Any]:
        image = image_bytes_to_array(image_bytes, filename)
        filtered = self._fracture_module.apply_filters(image)
        outputs = {
            name: self._fracture_module.img_to_base64(filtered_image)
            for name, filtered_image in filtered.items()
        }
        return {
            "prediction": "Fracture Review Filters",
            "confidence": 0.0,
            "outputs": outputs,
        }

    def analyze_ecg_signal(self, signal_bytes: bytes, filename: str) -> dict[str, Any]:
        signal = parse_signal_file(signal_bytes, filename)
        result = self._ecg_module.predict(signal)
        return {
            "prediction": result["prediction"],
            "confidence": round(float(result["confidence"]) * 100, 2),
            "insight": f"Analysis indicates {result['prediction']} rhythm with high confidence.",
            "sample_count": int(len(signal)),
        }
