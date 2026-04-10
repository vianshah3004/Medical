from __future__ import annotations

import os
import asyncpg
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

class Database:
    def __init__(self):
        self._pool: asyncpg.Pool | None = None

    async def connect(self):
        if not self._pool:
            if not DATABASE_URL:
                raise ValueError("DATABASE_URL must be set in environment variables.")
            self._pool = await asyncpg.create_pool(DATABASE_URL)
            print("Successfully connected to Neon database.")

    async def disconnect(self):
        if self._pool:
            await self._pool.close()
            self._pool = None

    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        if not self._pool:
            await self.connect()
        
        async with self._pool.acquire() as connection:
            yield connection

db = Database()

def get_db() -> Database:
    return db
