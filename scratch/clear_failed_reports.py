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
    
    # Check sessions with error string or fallback string
    rows = await conn.fetch(
        """
        SELECT id, evaluation_report, practice_plan FROM sessions
        WHERE evaluation_report LIKE 'Lỗi tạo báo cáo tự động%'
           OR evaluation_report LIKE 'Error generating report%'
           OR practice_plan LIKE '%lỗi hệ thống%'
           OR practice_plan LIKE '%system error%'
        """
    )
    
    print(f"Found {len(rows)} sessions with failed evaluation reports/plans.")
    for r in rows:
        print(f"Resetting session {r['id']}")
        await conn.execute(
            """
            UPDATE sessions
            SET evaluation_report = NULL, practice_plan = NULL
            WHERE id = $1
            """,
            r["id"]
        )
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
