from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from unified_medical_api.models.schemas import AnalyzeResponse
from unified_medical_api.services.analysis_service import analysis_service

router = APIRouter(tags=["ecg"])


@router.post("/ecg/analyze", response_model=AnalyzeResponse)
async def analyze_ecg(file: UploadFile = File(...)) -> AnalyzeResponse:
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded ECG file is empty.")

    try:
        return await run_in_threadpool(
            analysis_service.analyze_ecg_file,
            file.filename or "ecg_upload.bin",
            contents,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

