from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from unified_medical_api.services.analysis_service import get_analysis_service
from unified_medical_api.services.groq_service import get_ai_insight_service
from unified_medical_api.services.storage_service import get_storage_service

logger = logging.getLogger(__name__)

class ScanPipelineService:
    def __init__(self):
        self.analysis_service = get_analysis_service()
        self.ai_insight_service = get_ai_insight_service()
        self.storage_service = get_storage_service()

    async def run_pipeline(
        self,
        batch_id: uuid.UUID,
        scan_type: str,
        files: list[tuple[str, bytes]],
        metadata: dict[str, Any] | None = None
    ):
        """
        Runs the full pipeline for multiple files.
        This is typically called in a FastAPI BackgroundTask.
        """
        logger.info(f"Starting pipeline for batch {batch_id} with {len(files)} files.")
        
        tasks = []
        for filename, contents in files:
            tasks.append(
                self.process_single_scan(batch_id, scan_type, filename, contents, metadata)
            )
        
        # Process all scans in the batch concurrently
        await asyncio.gather(*tasks)
        logger.info(f"Pipeline completed for batch {batch_id}.")

    async def process_single_scan(
        self,
        batch_id: uuid.UUID,
        scan_type: str,
        filename: str,
        contents: bytes,
        metadata: dict[str, Any] | None = None
    ):
        scan_id = await self.storage_service.create_scan_record(
            file_name=filename,
            scan_type=scan_type,
            batch_id=batch_id,
            metadata=metadata
        )
        
        try:
            # 1. Run local medical engine analysis
            # Note: _analyze_one is sync in AnalysisService, but we run it inside our async loop
            # If it's heavy, we'd use run_in_executor, but for now we'll call it directly.
            # We wrap it to ensure it doesn't block the whole event loop if possible.
            logger.info(f"[{scan_id}] Running model analysis for {filename}")
            await self.storage_service.update_scan_status(scan_id, "processing")
            
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                self.analysis_service._analyze_one,
                scan_type,
                filename,
                contents,
                1 # mc_samples
            )
            
            model_output = result.model_dump()
            await self.storage_service.update_scan_result(scan_id, model_output, status="analyzed")
            
            # 2. Run Groq AI Insight Generation
            logger.info(f"[{scan_id}] Generating AI insights for {filename}")
            insights = await self.ai_insight_service.generate_insights(
                scan_type=scan_type,
                model_output=model_output,
                image_bytes=contents
            )
            
            await self.storage_service.update_groq_insight(scan_id, insights)
            await self.storage_service.update_scan_status(scan_id, "completed")
            logger.info(f"[{scan_id}] Successfully processed {filename}")

        except Exception as e:
            logger.error(f"[{scan_id}] Pipeline failed for {filename}: {e}", exc_info=True)
            await self.storage_service.update_scan_status(scan_id, f"failed: {str(e)}")

pipeline_service = ScanPipelineService()

def get_pipeline_service() -> ScanPipelineService:
    return pipeline_service
