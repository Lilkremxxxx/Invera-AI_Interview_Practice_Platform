import asyncio
import sys
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "BE"))

from app.core.config import settings
import asyncpg
from fastapi.testclient import TestClient
from app.main import app
from app.api.endpoints.auth import get_current_user
from app.schemas.user import UserOut

async def get_test_data():
    conn = await asyncpg.connect(
        host=settings.pg_host,
        port=settings.pg_port,
        database=settings.pg_dbname,
        user=settings.pg_user,
        password=settings.pg_password,
    )
    # Find a completed session with no evaluation_report
    row = await conn.fetchrow(
        "SELECT id, user_id FROM sessions WHERE status = 'COMPLETED' AND evaluation_report IS NULL LIMIT 1"
    )
    await conn.close()
    return row

def test_lazy_all():
    loop = asyncio.new_event_loop()
    row = loop.run_until_complete(get_test_data())
    if not row:
        print("No completed sessions without evaluation report found.")
        return
        
    session_id = row["id"]
    user_id = row["user_id"]
    print(f"Testing lazy generation on session: {session_id} for user: {user_id}")
    
    async def override_get_current_user():
        now = datetime.now()
        return UserOut(
            id=user_id,
            email="test@invera.co",
            full_name="Test User",
            is_active=True,
            is_verified=True,
            is_admin=True,
            created_at=now,
            updated_at=now,
            avatar_url=None,
            plan_tier="pro",
            plan_status="active",
            plan_expires_at=None,
            additional_sessions=10,
            can_use_qna=True,
            can_start_new_session=True
        )
        
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    client = TestClient(app)
    headers = {"X-UI-Language": "vi"}
    url = f"/api/sessions/{session_id}"
    print(f"Sending GET request to {url}...")
    response = client.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Has evaluation_report: {bool(data.get('evaluation_report'))}")
        print(f"Has practice_plan: {bool(data.get('practice_plan'))}")
        if data.get("evaluation_report"):
            print("\nReport Snippet:")
            print(data.get("evaluation_report")[:300])
        else:
            print("Report is Empty!")
    else:
        print(response.text)

if __name__ == "__main__":
    test_lazy_all()
