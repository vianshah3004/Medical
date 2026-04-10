from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ScanType(str, Enum):
    brain = "brain"
    lung = "lung"
    skin = "skin"
    fracture = "fracture"
    diabetic_retinopathy = "diabetic_retinopathy"
    ecg_image = "ecg_image"
    ecg_signal = "ecg_signal"


class ImagePayload(BaseModel):
    key: str
    label: str
    media_type: str = "image/png"
    base64_data: str


class SourceInfo(BaseModel):
    primary_engine: str
    selected_engine: str
    fallback_available: bool
    fallback_used: bool
    fallback_reason: str | None = None


class AnalysisResult(BaseModel):
    file_name: str
    scan_type: str
    input_type: str
    prediction: str
    confidence: float
    probabilities: list[dict[str, Any]] = Field(default_factory=list)
    visuals: list[ImagePayload] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)
    source: SourceInfo


class AnalyzeResponse(BaseModel):
    request_id: str
    status: str = "success"
    scan_type: str
    results: list[AnalysisResult]


class ReportRequest(BaseModel):
    patient_name: str
    doctor_name: str
    diagnosis: str
    confidence: float
    metrics: dict[str, Any] = Field(default_factory=dict)
    images: dict[str, str] = Field(default_factory=dict)
    modality: str
