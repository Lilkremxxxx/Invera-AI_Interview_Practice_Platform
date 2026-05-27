import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def main():
    load_dotenv("/home/nhatbang/EXE101/PRJ/BE/.env")
    conn = await asyncpg.connect(
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        database=os.getenv("PG_DBNAME")
    )
    
    roles = [
        'sales_representative',
        'sales_executive',
        'marketing_manager',
        'marketing_executive'
    ]
    for r in roles:
        count = await conn.fetchval("SELECT COUNT(*) FROM questions WHERE role=$1", r)
        print(f"Role: {r}, count: {count}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
