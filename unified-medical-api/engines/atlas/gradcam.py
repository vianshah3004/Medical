from __future__ import annotations

import base64
import io
from dataclasses import dataclass

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image


@dataclass
class GradCamResult:
    heatmap_base64: str | None
    overlay_base64: str | None
    message: str | None = None


class GradCAM:
    def __init__(self, model: torch.nn.Module, target_layer: torch.nn.Module) -> None:
        self.model = model
        self.target_layer = target_layer
        self.activations = None
        self.gradients = None
        self._hooks = []
        self._register_hooks()

    def _register_hooks(self) -> None:
        self._hooks.append(self.target_layer.register_forward_hook(self._forward_hook))

    def _forward_hook(self, module, inputs, output) -> None:
        self.activations = output
        if hasattr(output, "register_hook"):
            output.register_hook(self._store_gradients)

    def _store_gradients(self, gradients) -> None:
        self.gradients = gradients

    def generate(self, input_tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        self.model.zero_grad(set_to_none=True)
        output = self.model(input_tensor)
        score = output[:, class_idx].sum()
        score.backward(retain_graph=True)

        if self.activations is None or self.gradients is None:
            raise RuntimeError("Grad-CAM hooks did not capture activations/gradients.")

        gradients = self.gradients.detach()
        activations = self.activations.detach()

        if gradients.ndim != 4 or activations.ndim != 4:
            raise RuntimeError("Grad-CAM requires 4D convolutional activations.")

        weights = gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * activations).sum(dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = F.interpolate(cam, size=input_tensor.shape[-2:], mode="bilinear", align_corners=False)
        cam = cam.squeeze().detach().cpu().numpy()
        cam = cam - cam.min()
        denom = cam.max()
        return cam / denom if denom > 0 else cam

    def close(self) -> None:
        for hook in self._hooks:
            hook.remove()
        self._hooks.clear()


def _to_base64_png(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def render_gradcam_overlay(image: Image.Image, cam: np.ndarray) -> GradCamResult:
    base = image.convert("RGB")
    heatmap = Image.fromarray(np.uint8(cam * 255), mode="L").resize(base.size)
    heatmap_rgb = Image.merge("RGB", (heatmap, ImageOps.invert(heatmap), Image.new("L", heatmap.size, 0)))
    overlay = Image.blend(base, heatmap_rgb, alpha=0.4)
    return GradCamResult(
        heatmap_base64=_to_base64_png(heatmap),
        overlay_base64=_to_base64_png(overlay),
        message=None,
    )


try:
    from PIL import ImageOps
except ImportError:  # pragma: no cover
    ImageOps = None
