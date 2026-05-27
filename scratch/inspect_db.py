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
        row = await conn.fetchrow("SELECT * FROM questions WHERE role = 'frontend' LIMIT 1")
        if row:
            for k, v in dict(row).items():
                print(f"{k}: {v}")
        else:
            print("No frontend questions found")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
