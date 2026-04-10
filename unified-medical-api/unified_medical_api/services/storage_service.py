from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from unified_medical_api.models.database import get_db

class StorageService:
    def __init__(self):
        self.db = get_db()

    async def create_scan_record(
        self,
        file_name: str,
        scan_type: str | None = None,
        batch_id: uuid.UUID | None = None,
        file_path: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> uuid.UUID:
        scan_id = uuid.uuid4()
        query = """
            INSERT INTO scans (id, batch_id, file_name, file_path, scan_type, metadata, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        async with self.db.get_connection() as conn:
            await conn.execute(
                query,
                scan_id,
                batch_id,
                file_name,
                file_path,
                scan_type,
                json.dumps(metadata or {}),
                "pending"
            )
        return scan_id

    async def update_scan_result(
        self,
        scan_id: uuid.UUID,
        model_output: dict[str, Any],
        status: str = "completed"
    ):
        query = """
            UPDATE scans 
            SET model_output = $1, status = $2, updated_at = $3
            WHERE id = $4
        """
        async with self.db.get_connection() as conn:
            await conn.execute(
                query,
                json.dumps(model_output),
                status,
                datetime.now(),
                scan_id
            )

    async def update_groq_insight(
        self,
        scan_id: uuid.UUID,
        groq_insights: dict[str, Any]
    ):
        query = """
            UPDATE scans 
            SET groq_insights = $1, updated_at = $2
            WHERE id = $3
        """
        async with self.db.get_connection() as conn:
            await conn.execute(
                query,
                json.dumps(groq_insights),
                datetime.now(),
                scan_id
            )

    async def update_scan_status(self, scan_id: uuid.UUID, status: str):
        query = "UPDATE scans SET status = $1, updated_at = $2 WHERE id = $3"
        async with self.db.get_connection() as conn:
            await conn.execute(query, status, datetime.now(), scan_id)

    async def get_scan(self, scan_id: uuid.UUID) -> dict[str, Any] | None:
        query = "SELECT * FROM scans WHERE id = $1"
        async with self.db.get_connection() as conn:
            row = await conn.fetchrow(query, scan_id)
            return dict(row) if row else None

    async def get_batch_scans(self, batch_id: uuid.UUID) -> list[dict[str, Any]]:
        query = "SELECT * FROM scans WHERE batch_id = $1 ORDER BY created_at ASC"
        async with self.db.get_connection() as conn:
            rows = await conn.fetch(query, batch_id)
            return [dict(row) for row in rows]

storage_service = StorageService()

def get_storage_service() -> StorageService:
    return storage_service
