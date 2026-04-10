from __future__ import annotations

from pathlib import Path


PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parent.parent
ATLAS_DIR = PROJECT_ROOT / "atlas-inference-service"
DIAGNO_BACKEND_DIR = PROJECT_ROOT / "diagonoscope" / "hackovium" / "backend"
REPORT_OUTPUT_DIR = PROJECT_ROOT / "unified-medical-api" / "generated_reports"

REPORT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

