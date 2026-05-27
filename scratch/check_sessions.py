import asyncio
import asyncpg
import sys

async def main():
    try:
        conn = await asyncpg.connect(
            host="100.82.138.69",
            port=5432,
            database="EXE101",
            user="cloud",
            password="cloud_pass"
        )
        print("Connected to DB successfully.")
        
        # 1. Fetch recent sessions
        rows = await conn.fetch(
            "SELECT id, status, completed_at, evaluation_report IS NOT NULL as has_report, practice_plan IS NOT NULL as has_plan FROM sessions ORDER BY created_at DESC LIMIT 10"
        )
        print("\n--- Recent Sessions ---")
        for r in rows:
            print(f"ID: {r['id']}, Status: {r['status']}, Completed At: {r['completed_at']}, Has Report: {r['has_report']}, Has Plan: {r['has_plan']}")
            
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
