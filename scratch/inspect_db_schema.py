import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "BE"))

from app.core.config import settings
import asyncpg

async def main():
    conn = await asyncpg.connect(
        host=settings.pg_host,
        port=settings.pg_port,
        database=settings.pg_dbname,
        user=settings.pg_user,
        password=settings.pg_password,
    )
    try:
        rows = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'questions'
            ORDER BY ordinal_position
        """)
        print("--- questions Table columns ---")
        for r in rows:
            print(f"Col: {r['column_name']}, Type: {r['data_type']}, Nullable: {r['is_nullable']}, Default: {r['column_default']}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
