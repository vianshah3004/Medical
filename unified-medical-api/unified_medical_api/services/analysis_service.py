from __future__ import annotations

import uuid
from typing import Any

from unified_medical_api.models.schemas import (
    AnalysisResult,
    AnalyzeResponse,
    ImagePayload,
    SourceInfo,
)
from unified_medical_api.services.registry import registry
from unified_medical_api.utils.files import detect_ecg_input_type


class AnalysisService:
    def scan_types(self) -> list[dict[str, object]]:
        return [
            {
                "scan_type": "brain",
                "label": "Brain MRI",
                "primary_engine": "atlas",
                "fallback_engine": "diagno_tumor",
                "input_types": ["image", "dicom"],
            },
            {
                "scan_type": "lung",
                "label": "Lung Scan",
                "primary_engine": "atlas",
                "fallback_engine": None,
                "input_types": ["image", "dicom"],
            },
            {
                "scan_type": "skin",
                "label": "Skin Lesion",
                "primary_engine": "atlas",
                "fallback_engine": None,
                "input_types": ["image"],
            },
            {
                "scan_type": "fracture",
                "label": "Fracture",
                "primary_engine": "diagno",
                "fallback_engine": None,
                "input_types": ["image", "dicom"],
            },
            {
                "scan_type": "diabetic_retinopathy",
                "label": "Diabetic Retinopathy",
                "primary_engine": "diagno",
                "fallback_engine": None,
                "input_types": ["image"],
            },
            {
                "scan_type": "ecg_image",
                "label": "ECG Image",
                "primary_engine": "atlas",
                "fallback_engine": None,
                "input_types": ["image"],
            },
            {
                "scan_type": "ecg_signal",
                "label": "ECG Signal",
                "primary_engine": "diagno",
                "fallback_engine": None,
                "input_types": ["text", "csv"],
            },
        ]

    def analyze_files(
        self,
        scan_type: str,
        files: list[tuple[str, bytes]],
        mc_samples: int = 1,
        analysis_mode: str = "standard",
        preferred_engine: str | None = None,
    ) -> AnalyzeResponse:
        normalized = self._normalize_scan_type(scan_type)
        results = [
            self._analyze_one(
                normalized,
                filename,
                contents,
                mc_samples,
                analysis_mode=analysis_mode,
                preferred_engine=preferred_engine,
            )
            for filename, contents in files
        ]
        return AnalyzeResponse(
            request_id=str(uuid.uuid4()),
            scan_type=normalized,
            results=results,
        )

    def analyze_ecg_file(self, filename: str, contents: bytes) -> AnalyzeResponse:
        detected = detect_ecg_input_type(filename, contents)
        result = self._analyze_one(detected, filename, contents, 1)
        return AnalyzeResponse(
            request_id=str(uuid.uuid4()),
            scan_type="ecg",
            results=[result],
        )

    def _normalize_scan_type(self, scan_type: str) -> str:
        value = scan_type.strip().lower().replace(" ", "_").replace("-", "_")
        aliases = {
            "tumor": "brain",
            "brainscan": "brain",
            "lungs": "lung",
            "pneumonia": "lung",
            "dr": "diabetic_retinopathy",
            "retinopathy": "diabetic_retinopathy",
            "skin_lesion": "skin",
            "ecg": "ecg_image",
            "fracture_scan": "fracture",
        }
        return aliases.get(value, value)

    def _analyze_one(
        self,
        scan_type: str,
        filename: str,
        contents: bytes,
        mc_samples: int,
        analysis_mode: str = "standard",
        preferred_engine: str | None = None,
    ) -> AnalysisResult:
        atlas = registry.atlas
        diagno = registry.diagno

        if scan_type in {"brain", "lung", "skin", "ecg_image"}:
            fallback_available = scan_type == "brain"
            if scan_type == "brain" and preferred_engine == "diagno":
                tumor_result = diagno.analyze_tumor(contents, filename)
                atlas_result = None
                try:
                    atlas_result = atlas.analyze(scan_type, contents, mc_samples=mc_samples)
                except Exception:
                    atlas_result = None
                return self._from_diagno_tumor(
                    filename,
                    tumor_result,
                    fallback_reason="Preferred Diagno tumor pipeline requested.",
                    atlas_payload=atlas_result,
                )
            try:
                atlas_result = atlas.analyze(scan_type, contents, mc_samples=mc_samples)
                return self._from_atlas(filename, scan_type, atlas_result, fallback_available)
            except Exception as exc:
                if scan_type != "brain":
                    raise RuntimeError(f"Atlas analysis failed for '{scan_type}': {exc}") from exc
                tumor_result = diagno.analyze_tumor(contents, filename)
                return self._from_diagno_tumor(filename, tumor_result, fallback_reason=str(exc))

        if scan_type == "fracture":
            if analysis_mode == "advanced":
                return self._from_diagno_fracture_advanced(
                    filename,
                    diagno.analyze_fracture_advanced(contents, filename),
                )
            return self._from_diagno_fracture(filename, diagno.analyze_fracture(contents, filename))

        if scan_type == "diabetic_retinopathy":
            return self._from_diagno_dr(filename, diagno.analyze_diabetic_retinopathy(contents, filename))

        if scan_type == "ecg_signal":
            return self._from_diagno_ecg_signal(filename, diagno.analyze_ecg_signal(contents, filename))

        raise ValueError(f"Unsupported scan_type '{scan_type}'.")

    def _from_atlas(
        self,
        filename: str,
        scan_type: str,
        payload: dict[str, Any],
        fallback_available: bool,
    ) -> AnalysisResult:
        prediction = payload.get("prediction", payload)
        gradcam = prediction.get("gradcam", {})
        visuals: list[ImagePayload] = []
        if gradcam.get("overlay_base64"):
            visuals.append(
                ImagePayload(
                    key="overlay",
                    label="GradCAM Overlay",
                    base64_data=gradcam["overlay_base64"],
                )
            )

        details = {
            "model_used": prediction.get("model_used"),
            "router": payload.get("router"),
            "predicted_index": prediction.get("predicted_index"),
        }
        return AnalysisResult(
            file_name=filename,
            scan_type=scan_type,
            input_type="image",
            prediction=prediction["predicted_label"],
            confidence=prediction["confidence"],
            probabilities=prediction.get("probabilities", []),
            visuals=visuals,
            details=details,
            source=SourceInfo(
                primary_engine="atlas",
                selected_engine="atlas",
                fallback_available=fallback_available,
                fallback_used=False,
            ),
        )

    def _from_diagno_tumor(
        self,
        filename: str,
        payload: dict[str, Any],
        fallback_reason: str,
        atlas_payload: dict[str, Any] | None = None,
    ) -> AnalysisResult:
        atlas_prediction = None
        atlas_probabilities: list[dict[str, Any]] = []
        if atlas_payload:
            atlas_prediction = atlas_payload.get("prediction", atlas_payload)
            atlas_probabilities = atlas_prediction.get("probabilities", [])

        prediction_label = atlas_prediction["predicted_label"] if atlas_prediction else payload["prediction"]
        prediction_confidence = atlas_prediction["confidence"] if atlas_prediction else float(payload["confidence"]) / 100.0

        merged_details = dict(payload)
        if atlas_prediction:
            merged_details["tumor_type_prediction"] = atlas_prediction["predicted_label"]
            merged_details["tumor_type_confidence"] = round(atlas_prediction["confidence"] * 100, 2)
            merged_details["atlas_probabilities"] = atlas_probabilities
            merged_details["prediction"] = atlas_prediction["predicted_label"]
            merged_details["confidence"] = round(atlas_prediction["confidence"] * 100, 2)

        visuals = self._visuals_from_map(
            {
                "segmentation": ("Segmentation", payload.get("segmented_base64")),
                "heatmap": ("AI Heatmap", payload.get("heatmap_base64")),
                "crop": ("Focused Region", payload.get("cropped_base64")),
            }
        )
        return AnalysisResult(
            file_name=filename,
            scan_type="brain",
            input_type="image",
            prediction=prediction_label,
            confidence=prediction_confidence,
            probabilities=atlas_probabilities,
            visuals=visuals,
            details=merged_details,
            source=SourceInfo(
                primary_engine="atlas",
                selected_engine="diagno_tumor",
                fallback_available=True,
                fallback_used=True,
                fallback_reason=fallback_reason,
            ),
        )

    def _from_diagno_fracture(self, filename: str, payload: dict[str, Any]) -> AnalysisResult:
        visuals = self._visuals_from_map({"detection": ("Detection", payload.get("detections_image"))})
        return AnalysisResult(
            file_name=filename,
            scan_type="fracture",
            input_type="image",
            prediction=payload["prediction"],
            confidence=float(payload["confidence"]) / 100.0,
            visuals=visuals,
            details={"method_used": payload.get("method_used")},
            source=SourceInfo(
                primary_engine="diagno",
                selected_engine="diagno",
                fallback_available=False,
                fallback_used=False,
            ),
        )

    def _from_diagno_fracture_advanced(self, filename: str, payload: dict[str, Any]) -> AnalysisResult:
        visuals = self._visuals_from_map(
            {
                "original": ("Original", payload.get("outputs", {}).get("original")),
                "brightness": ("Brightness", payload.get("outputs", {}).get("brightness")),
                "clahe": ("CLAHE", payload.get("outputs", {}).get("clahe")),
                "jet_colormap": ("Jet Colormap", payload.get("outputs", {}).get("jet_colormap")),
                "retinex": ("Retinex", payload.get("outputs", {}).get("retinex")),
            }
        )
        return AnalysisResult(
            file_name=filename,
            scan_type="fracture",
            input_type="image",
            prediction=payload["prediction"],
            confidence=0.0,
            visuals=visuals,
            details=payload,
            source=SourceInfo(
                primary_engine="diagno",
                selected_engine="diagno_advanced",
                fallback_available=False,
                fallback_used=False,
            ),
        )

    def _from_diagno_dr(self, filename: str, payload: dict[str, Any]) -> AnalysisResult:
        visuals = self._visuals_from_map(
            {
                "original": ("Original", payload.get("original_base64")),
                "vessels": ("Retinal Vessels", payload.get("vessel_base64")),
                "lesions": ("Lesion Analysis", payload.get("lesion_base64")),
            }
        )
        return AnalysisResult(
            file_name=filename,
            scan_type="diabetic_retinopathy",
            input_type="image",
            prediction=payload["prediction"],
            confidence=float(payload["confidence"]) / 100.0,
            visuals=visuals,
            details=payload,
            source=SourceInfo(
                primary_engine="diagno",
                selected_engine="diagno",
                fallback_available=False,
                fallback_used=False,
            ),
        )

    def _from_diagno_ecg_signal(self, filename: str, payload: dict[str, Any]) -> AnalysisResult:
        return AnalysisResult(
            file_name=filename,
            scan_type="ecg_signal",
            input_type="signal",
            prediction=payload["prediction"],
            confidence=float(payload["confidence"]) / 100.0,
            details=payload,
            source=SourceInfo(
                primary_engine="diagno",
                selected_engine="diagno",
                fallback_available=False,
                fallback_used=False,
            ),
        )

    def _visuals_from_map(self, values: dict[str, tuple[str, str | None]]) -> list[ImagePayload]:
        visuals: list[ImagePayload] = []
        for key, (label, base64_data) in values.items():
            if base64_data:
                visuals.append(
                    ImagePayload(
                        key=key,
                        label=label,
                        base64_data=base64_data,
                    )
                )
        return visuals


analysis_service = AnalysisService()
