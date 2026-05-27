import asyncio
import asyncpg
from app.core.config import settings

async def main():
    # Let's connect to PG using asyncpg.
    # Note: we need to parse PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DBNAME.
    # Let's load from .env or just use the config settings.
    # Let's see if we can read environment variables.
    import os
    from dotenv import load_dotenv
    load_dotenv("/home/nhatbang/EXE101/PRJ/BE/.env")
    
    conn = await asyncpg.connect(
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        database=os.getenv("PG_DBNAME")
    )
    
    # Query distinct roles, majors, and levels
    rows = await conn.fetch("SELECT DISTINCT major, role, level FROM questions ORDER BY major, role, level")
    print("--- Distinct Major, Role, Level in DB ---")
    for r in rows:
        print(f"Major: {r['major']}, Role: {r['role']}, Level: {r['level']}")
        
    # Also get the total count of questions
    count = await conn.fetchval("SELECT COUNT(*) FROM questions")
    print(f"Total questions in DB: {count}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
