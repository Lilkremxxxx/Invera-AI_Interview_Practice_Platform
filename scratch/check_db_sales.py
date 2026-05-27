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
    
    # Let's inspect some questions for sales_representative and sales_executive
    print("--- sales_representative (tech) ---")
    rows = await conn.fetch("SELECT text, level FROM questions WHERE role='sales_representative' LIMIT 3")
    for r in rows:
        print(f"[{r['level']}] {r['text']}")
        
    print("\n--- sales_executive (business) ---")
    rows = await conn.fetch("SELECT text, level FROM questions WHERE role='sales_executive' LIMIT 3")
    for r in rows:
        print(f"[{r['level']}] {r['text']}")
        
    # Let's check marketing_manager (tech) vs marketing_executive (business)
    print("\n--- marketing_manager (tech) ---")
    rows = await conn.fetch("SELECT text, level FROM questions WHERE role='marketing_manager' LIMIT 3")
    for r in rows:
        print(f"[{r['level']}] {r['text']}")
        
    print("\n--- marketing_executive (business) ---")
    rows = await conn.fetch("SELECT text, level FROM questions WHERE role='marketing_executive' LIMIT 3")
    for r in rows:
        print(f"[{r['level']}] {r['text']}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
