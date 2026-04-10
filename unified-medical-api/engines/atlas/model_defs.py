from __future__ import annotations

import timm
import torch.nn as nn
from torchvision import models


class BrainExpert(nn.Module):
    def __init__(self, num_classes: int = 4) -> None:
        super().__init__()
        self.backbone = timm.create_model(
            "efficientnet_b2",
            pretrained=False,
            num_classes=0,
            global_pool="avg",
        )
        self.fc = nn.Sequential(
            nn.Linear(1408, 512),
            nn.BatchNorm1d(512),
            nn.Hardswish(),
            nn.Dropout(p=0.4),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.fc(features)


class LungExpert(nn.Module):
    def __init__(self, num_classes: int = 5) -> None:
        super().__init__()
        self.backbone = models.densenet121(weights=None)
        num_features = self.backbone.classifier.in_features
        self.backbone.classifier = nn.Identity()
        self.head = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)


class SkinExpert(nn.Module):
    def __init__(self, num_classes: int = 9) -> None:
        super().__init__()
        self.backbone = models.resnet50(weights=None)
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        self.head = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=0.45),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)


class ECGExpert(nn.Module):
    def __init__(self, num_classes: int = 4) -> None:
        super().__init__()
        self.backbone = timm.create_model("efficientnet_b0", pretrained=False, num_classes=0)
        self.head = nn.Sequential(
            nn.Linear(1280, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)


class ModalityRouter(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.model = models.resnet34(weights=None)
        self.model.fc = nn.Linear(self.model.fc.in_features, 4)

    def forward(self, x):
        return self.model(x)
