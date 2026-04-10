from __future__ import annotations

import io
import re
from pathlib import Path

import cv2
import numpy as np
import pydicom
from PIL import Image


def image_bytes_to_array(file_content: bytes, filename: str) -> np.ndarray:
    suffix = Path(filename).suffix.lower()
    if suffix == ".dcm":
        dicom_data = pydicom.dcmread(io.BytesIO(file_content))
        image = dicom_data.pixel_array
        if image.max() > 255:
            image = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX)
        image = image.astype(np.uint8)
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        return image
    return np.array(Image.open(io.BytesIO(file_content)).convert("RGB"))


def parse_signal_file(file_content: bytes, filename: str) -> np.ndarray:
    text = file_content.decode("utf-8", errors="ignore")
    rows = text.splitlines()
    values: list[float] = []
    for row in rows:
        parts = re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", row)
        for part in parts:
            try:
                values.append(float(part))
            except ValueError:
                continue
    if not values:
        raise ValueError(f"Could not parse ECG signal from '{filename}'.")
    return np.asarray(values, dtype=np.float32)


def detect_ecg_input_type(filename: str, file_content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".csv", ".tsv"}:
        return "ecg_signal"
    if suffix in {".png", ".jpg", ".jpeg", ".bmp", ".dcm"}:
        return "ecg_image"

    try:
        parse_signal_file(file_content, filename)
        return "ecg_signal"
    except Exception:
        return "ecg_image"
