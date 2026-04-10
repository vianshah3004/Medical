from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from unified_medical_api.models.schemas import AnalyzeResponse, ScanType
from unified_medical_api.services.analysis_service import analysis_service

router = APIRouter(tags=["scans"])


@router.get("/scans/types")
def scan_types() -> dict[str, object]:
    return {"scan_types": analysis_service.scan_types()}


@router.post("/scans/analyze", response_model=AnalyzeResponse)
async def analyze_scan(
    scan_type: Annotated[ScanType, Form(...)],
    files: Annotated[list[UploadFile], File(...)],
    mc_samples: Annotated[int, Form()] = 1,
    analysis_mode: Annotated[str, Form()] = "standard",
    preferred_engine: Annotated[str | None, Form()] = None,
) -> AnalyzeResponse:
    if mc_samples < 1 or mc_samples > 50:
        raise HTTPException(status_code=400, detail="mc_samples must be between 1 and 50.")
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required.")

    payloads: list[tuple[str, bytes]] = []
    for file in files:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail=f"Uploaded file '{file.filename}' is empty.")
        payloads.append((file.filename or "upload.bin", contents))

    try:
        return await run_in_threadpool(
            analysis_service.analyze_files,
            scan_type.value,
            payloads,
            mc_samples,
            analysis_mode,
            preferred_engine,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
