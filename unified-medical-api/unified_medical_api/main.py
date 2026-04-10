from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from unified_medical_api.routes.ecg import router as ecg_router
from unified_medical_api.routes.health import router as health_router
from unified_medical_api.routes.reports import router as reports_router
from unified_medical_api.routes.scans import router as scans_router
from unified_medical_api.services.registry import registry


@asynccontextmanager
async def lifespan(_: FastAPI):
    registry.load()
    yield


app = FastAPI(
    title="Unified Medical AI API",
    version="1.0.0",
    description="Merged Atlas + DiagnoScope inference service with fallback routing.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(scans_router, prefix="/api/v1")
app.include_router(ecg_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")

