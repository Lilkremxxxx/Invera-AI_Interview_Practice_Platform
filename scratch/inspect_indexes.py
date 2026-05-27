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
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'questions'
        """)
        print("--- Indexes on questions ---")
        for r in rows:
            print(f"Name: {r['indexname']}\nDef: {r['indexdef']}\n")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
