from __future__ import annotations

from pathlib import Path

from .model_defs import BrainExpert, ECGExpert, LungExpert, ModalityRouter, SkinExpert
from unified_medical_api.config import WEIGHTS_DIR

IMAGE_SIZE = (224, 224)
IMAGE_MEAN = [0.485, 0.456, 0.406]
IMAGE_STD = [0.229, 0.224, 0.225]


def _checkpoint_path(filename: str) -> Path:
    return WEIGHTS_DIR / filename


def _model_spec(
    *,
    task_type: str,
    domain: str,
    purpose: str,
    checkpoint: str,
    architecture,
    classes: list[str],
    target_layer: str,
    notes: str,
) -> dict:
    return {
        "task_type": task_type,
        "domain": domain,
        "purpose": purpose,
        "checkpoint": _checkpoint_path(checkpoint),
        "architecture": architecture,
        "classes": classes,
        "target_layer": target_layer,
        "notes": notes,
    }

MODEL_SPECS = {
    "brain_expert": _model_spec(
        task_type="classification",
        domain="brain",
        purpose="Brain MRI tumor classification",
        checkpoint="best_BrainExpert.pth",
        architecture=BrainExpert,
        classes=["Glioma", "Meningioma", "No Tumor", "Pituitary"],
        target_layer="backbone.conv_head",
        notes="EfficientNet-B2 expert reconstructed from training/inference code.",
    ),
    "lung_expert": _model_spec(
        task_type="classification",
        domain="lung",
        purpose="Chest X-ray lung disease classification",
        checkpoint="best_LungExpert.pth",
        architecture=LungExpert,
        classes=[
            "Bacterial Pneumonia",
            "COVID-19",
            "Normal",
            "Tuberculosis",
            "Viral Pneumonia",
        ],
        target_layer="backbone.features.norm5",
        notes="DenseNet121 expert reconstructed from training/inference code.",
    ),
    "skin_expert": _model_spec(
        task_type="classification",
        domain="skin",
        purpose="Skin lesion classification",
        checkpoint="best_SkinExpert.pth",
        architecture=SkinExpert,
        classes=[
            "Actinic Keratosis",
            "Atopic Dermatitis",
            "Benign Keratosis",
            "Dermatofibroma",
            "Melanocytic Nevus",
            "Melanoma",
            "Squamous Cell Carcinoma",
            "Tinea Ringworm",
            "Vascular Lesion",
        ],
        target_layer="backbone.layer4.2",
        notes="ResNet50 expert reconstructed from training/inference code.",
    ),
    "ecg_expert": _model_spec(
        task_type="classification",
        domain="ecg",
        purpose="ECG image classification",
        checkpoint="best_ECGExpert.pth",
        architecture=ECGExpert,
        classes=["Abnormal", "Infarction", "Normal", "History of MI"],
        target_layer="backbone.conv_head",
        notes="EfficientNet-B0 expert reconstructed from training/inference code.",
    ),
    "modality_router": _model_spec(
        task_type="classification",
        domain="routing",
        purpose="Route image to the correct medical modality expert",
        checkpoint="best_ModalityRouter.pth",
        architecture=ModalityRouter,
        classes=["brain", "lung", "skin", "ecg"],
        target_layer="model.layer4.2",
        notes="ResNet34 router reconstructed from training/inference code.",
    ),
}

CLINICAL_SYSTEM_NAME = "clinical_system"
