import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
import asyncpg
from dotenv import load_dotenv

# Load env variables
base_dir = Path(__file__).resolve().parent
env_path = base_dir / ".env"
load_dotenv(dotenv_path=env_path)

async def main():
    pg_host = os.getenv("PG_HOST", "127.0.0.1")
    pg_port = int(os.getenv("PG_PORT", "5432"))
    pg_dbname = os.getenv("PG_DBNAME", "postgres")
    pg_user = os.getenv("PG_USER", "postgres")
    pg_password = os.getenv("PG_PASSWORD", "postgres")

    print(f"Connecting to database {pg_dbname} on {pg_host}:{pg_port}...")
    conn = await asyncpg.connect(
        host=pg_host,
        port=pg_port,
        user=pg_user,
        password=pg_password,
        database=pg_dbname
    )

    try:
        # Fetch all successful payment orders for plans (excluding additional sessions), sorted by paid_at ASC
        # so the latest paid order is processed last and overrides previous ones.
        orders = await conn.fetch("""
            SELECT id, user_id, plan_tier, billing_period, paid_at 
            FROM payment_orders 
            WHERE status = 'succeeded' AND plan_tier IN ('basic', 'pro', 'premium')
            ORDER BY paid_at ASC
        """)
        
        print(f"Found {len(orders)} successful plan payment orders.")
        
        restored_count = 0
        for order in orders:
            user_id = order["user_id"]
            plan_tier = order["plan_tier"]
            billing_period = order["billing_period"]
            paid_at = order["paid_at"]

            if not paid_at:
                print(f"Warning: Order {order['id']} marked succeeded but has no paid_at timestamp. Skipping.")
                continue

            # Calculate expiration date
            duration = timedelta(days=365) if billing_period == 'year' else timedelta(days=30)
            expires_at = paid_at + duration

            # Only restore if it's still active or we just want to bring it to its correct state (active/expired)
            # We'll set the plan_tier, plan_started_at, plan_expires_at, plan_billing_period, and calculate plan_status
            current_time = datetime.now(timezone.utc)
            plan_status = 'active' if expires_at > current_time else 'expired'

            user_email = await conn.fetchval("SELECT email FROM users WHERE id = $1", user_id)
            print(f"Restoring plan for {user_email} ({user_id}): Tier={plan_tier}, Period={billing_period}, Status={plan_status}, Expires={expires_at}")

            await conn.execute("""
                UPDATE users
                SET plan_tier = $1,
                    plan_status = $2,
                    plan_billing_period = $3,
                    plan_started_at = $4,
                    plan_expires_at = $5,
                    updated_at = NOW()
                WHERE id = $6
            """, plan_tier, plan_status, billing_period, paid_at, expires_at, user_id)
            
            restored_count += 1
            
        print(f"Successfully restored plan entitlements for {restored_count} users.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
