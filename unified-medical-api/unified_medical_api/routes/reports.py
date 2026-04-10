from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from unified_medical_api.models.schemas import ReportRequest
from unified_medical_api.services.report_service import report_service

router = APIRouter(tags=["reports"])


@router.post("/reports/generate")
async def generate_report(request: ReportRequest) -> FileResponse:
    report_path = await run_in_threadpool(report_service.generate_report, request)
    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=report_path.name,
    )

