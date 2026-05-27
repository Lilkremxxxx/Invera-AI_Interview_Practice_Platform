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
        non_empty_tags = await conn.fetchval("SELECT COUNT(*) FROM questions WHERE array_length(tags, 1) > 0")
        print(f"Questions with non-empty tags: {non_empty_tags}")
        
        sample_questions = await conn.fetch("SELECT category, tags, role, level FROM questions WHERE array_length(tags, 1) > 0 LIMIT 5")
        for r in sample_questions:
            print(f"Role: {r['role']}, Level: {r['level']}, Category: {r['category']}, Tags: {r['tags']}")
            
        distinct_categories = await conn.fetch("SELECT DISTINCT category FROM questions LIMIT 20")
        print("\nSome distinct categories:")
        for r in distinct_categories:
            print("-", r['category'])
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
