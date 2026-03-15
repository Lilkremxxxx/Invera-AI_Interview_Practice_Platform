import asyncpg
from typing import Optional
import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR.parent / ".env")

_pool: Optional[asyncpg.Pool] = None


async def create_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            host=os.getenv("PG_HOST"),
            port=int(os.getenv("PG_PORT", 5432)),
            database=os.getenv("PG_DBNAME"),
            user=os.getenv("PG_USER"),
            password=os.getenv("PG_PASSWORD"),
            min_size=5,
            max_size=20,
            timeout=30,
            command_timeout=10,
        )
        print(f"✅ Database pool created: {_pool.get_size()} connections")
    return _pool


async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        print("✅ Database pool closed")
        _pool = None


async def get_db():
    global _pool
    if _pool is None:
        await create_pool()
    async with _pool.acquire() as connection:
        yield connection
