from __future__ import annotations

import base64
import io
import os
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image

from unified_medical_api.config import DIAGNO_BACKEND_DIR, REPORT_OUTPUT_DIR
from unified_medical_api.models.schemas import ReportRequest


class ReportService:
    def __init__(self) -> None:
        self._generator_cls = None

    def _load_generator(self) -> None:
        if self._generator_cls is not None:
            return

        backend_dir = str(DIAGNO_BACKEND_DIR)
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from report_generator import ReportGenerator  # type: ignore

        self._generator_cls = ReportGenerator

    def generate_report(self, request: ReportRequest) -> Path:
        self._load_generator()
        safe_name = "".join([c for c in request.patient_name if c.isalnum() or c in "._- "]).strip() or "Patient"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = REPORT_OUTPUT_DIR / f"Report_{safe_name}_{timestamp}.pdf"

        processed_images = {}
        for key, encoded in request.images.items():
            if not encoded:
                continue
            chunk = encoded.split(",", 1)[-1]
            chunk += "=" * ((4 - len(chunk) % 4) % 4)
            try:
                processed_images[key] = Image.open(io.BytesIO(base64.b64decode(chunk)))
            except Exception:
                processed_images[key] = None

        generator = self._generator_cls(str(output_path))
        patient_data = {"name": request.patient_name, "doctor": request.doctor_name}
        analysis_data = {
            "diagnosis": request.diagnosis,
            "confidence": request.confidence,
            "metrics": request.metrics,
            "images": processed_images,
        }
        generator.generate_report(patient_data, analysis_data, modality=request.modality)
        return output_path


report_service = ReportService()

