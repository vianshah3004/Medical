from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import torch
import torch.nn as nn
from PIL import Image, UnidentifiedImageError
from torchvision import transforms

from .catalog import (
    CLINICAL_SYSTEM_NAME,
    IMAGE_MEAN,
    IMAGE_SIZE,
    IMAGE_STD,
    MODEL_SPECS,
)
from .gradcam import GradCAM, GradCamResult, render_gradcam_overlay


def _extract_state_dict(checkpoint: Any) -> dict[str, torch.Tensor]:
    if isinstance(checkpoint, dict):
        for key in ("state_dict", "model_state_dict", "model", "weights"):
            if key in checkpoint and isinstance(checkpoint[key], dict):
                return checkpoint[key]
    if not isinstance(checkpoint, dict):
        raise TypeError(f"Unsupported checkpoint type: {type(checkpoint)!r}")
    return checkpoint


def _resolve_attr(root: object, attr_path: str) -> object:
    current = root
    for part in attr_path.split("."):
        current = getattr(current, part)
    return current


@dataclass
class LoadedModel:
    name: str
    model: torch.nn.Module
    spec: dict[str, Any]


class InferenceService:
    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.transform = transforms.Compose(
            [
                transforms.Resize(IMAGE_SIZE),
                transforms.ToTensor(),
                transforms.Normalize(IMAGE_MEAN, IMAGE_STD),
            ]
        )
        self.models: dict[str, LoadedModel] = {}

    def load_all(self) -> None:
        for model_name, spec in MODEL_SPECS.items():
            checkpoint_path = Path(spec["checkpoint"])
            if not checkpoint_path.exists():
                raise FileNotFoundError(f"Checkpoint not found for {model_name}: {checkpoint_path}")

            model = spec["architecture"]()
            state_dict = _extract_state_dict(torch.load(checkpoint_path, map_location=self.device))
            model.load_state_dict(state_dict, strict=True)
            model.to(self.device).eval()
            self.models[model_name] = LoadedModel(name=model_name, model=model, spec=spec)

    def list_models(self) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []
        for model_name, loaded in self.models.items():
            spec = loaded.spec
            entries.append(
                {
                    "name": model_name,
                    "purpose": spec["purpose"],
                    "task_type": spec["task_type"],
                    "domain": spec["domain"],
                    "input_size": list(IMAGE_SIZE),
                    "normalization": {"mean": IMAGE_MEAN, "std": IMAGE_STD},
                    "classes": spec["classes"],
                    "checkpoint": str(spec["checkpoint"]),
                    "gradcam_supported": True,
                }
            )

        entries.append(
            {
                "name": CLINICAL_SYSTEM_NAME,
                "purpose": "Route image with the modality router and then predict with the corresponding expert",
                "task_type": "classification",
                "domain": "multi-domain",
                "input_size": list(IMAGE_SIZE),
                "normalization": {"mean": IMAGE_MEAN, "std": IMAGE_STD},
                "classes": None,
                "checkpoint": "virtual: modality_router + all *_expert checkpoints",
                "gradcam_supported": True,
            }
        )
        return entries

    def _open_image(self, image_bytes: bytes) -> Image.Image:
        try:
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except UnidentifiedImageError as exc:
            raise ValueError("Uploaded file is not a valid PNG/JPEG image.") from exc

    def _predict_single(
        self,
        model_name: str,
        image: Image.Image,
        mc_samples: int = 1,
    ) -> dict[str, Any]:
        loaded = self.models[model_name]
        x = self.transform(image).unsqueeze(0).to(self.device)

        if mc_samples > 1:
            probs = self._mc_dropout_predict(loaded.model, x, mc_samples)
        else:
            with torch.no_grad():
                logits = loaded.model(x)
                probs = torch.softmax(logits, dim=1)

        confidence, pred_idx = probs.max(dim=1)
        probabilities = [
            {
                "label": loaded.spec["classes"][idx],
                "score": round(probs[0, idx].item(), 6),
            }
            for idx in range(len(loaded.spec["classes"]))
        ]
        probabilities.sort(key=lambda item: item["score"], reverse=True)

        gradcam = self._try_gradcam(loaded, image, int(pred_idx.item()))
        return {
            "model_used": model_name,
            "predicted_label": loaded.spec["classes"][pred_idx.item()],
            "predicted_index": int(pred_idx.item()),
            "confidence": round(confidence.item(), 6),
            "probabilities": probabilities,
            "gradcam": {
                "supported": gradcam.message is None,
                "message": gradcam.message,
                "heatmap_base64": gradcam.heatmap_base64,
                "overlay_base64": gradcam.overlay_base64,
            },
        }

    def _mc_dropout_predict(self, model: torch.nn.Module, x: torch.Tensor, mc_samples: int) -> torch.Tensor:
        model.eval()
        dropout_layers = []
        for module in model.modules():
            if isinstance(module, nn.Dropout):
                module.train()
                dropout_layers.append(module)

        stochastic_probs = []
        with torch.no_grad():
            for _ in range(mc_samples):
                stochastic_probs.append(torch.softmax(model(x), dim=1))

        model.eval()
        return torch.stack(stochastic_probs, dim=0).mean(dim=0)

    def _try_gradcam(self, loaded: LoadedModel, image: Image.Image, class_idx: int) -> GradCamResult:
        try:
            target_layer = _resolve_attr(loaded.model, loaded.spec["target_layer"])
        except AttributeError:
            return GradCamResult(None, None, "No compatible Grad-CAM target layer was found.")

        x = self.transform(image).unsqueeze(0).to(self.device)
        x.requires_grad_(True)
        cam_engine = GradCAM(loaded.model, target_layer)
        try:
            cam = cam_engine.generate(x, class_idx)
            return render_gradcam_overlay(image.resize(IMAGE_SIZE), cam)
        except Exception as exc:
            return GradCamResult(None, None, f"Grad-CAM skipped: {exc}")
        finally:
            cam_engine.close()

    def predict(self, image_bytes: bytes, model_name: str, mc_samples: int = 1) -> dict[str, Any]:
        image = self._open_image(image_bytes)

        if model_name == CLINICAL_SYSTEM_NAME:
            routed = self._predict_single("modality_router", image, mc_samples=1)
            expert_model_name = f"{routed['predicted_label']}_expert"
            expert = self._predict_single(expert_model_name, image, mc_samples=mc_samples)
            return {
                "model_used": CLINICAL_SYSTEM_NAME,
                "router": routed,
                "prediction": expert,
            }

        if model_name not in self.models:
            raise ValueError(f"Unsupported model_name '{model_name}'.")

        return self._predict_single(model_name, image, mc_samples=mc_samples)
