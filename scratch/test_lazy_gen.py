import asyncio
from fastapi.testclient import TestClient
from app.main import app
import sys

def test_lazy():
    client = TestClient(app)
    
    # 1. Log in or mock authenticate if needed.
    # The endpoints check current_user. We can bypass/override the dependency to return user_id.
    # Let's see if we can do this.
    # We can override get_current_user to return a dummy user matching the session's user_id.
    # Wait, what user_id does the session 6ced147b-2956-4fb8-9463-fa309a05b485 belong to?
    # Let's query it.
    
    import asyncpg
    loop = asyncio.new_event_loop()
    
    async def get_user_id():
        conn = await asyncpg.connect(
            host="100.82.138.69",
            port=5432,
            database="EXE101",
            user="cloud",
            password="cloud_pass"
        )
        val = await conn.fetchval(
            "SELECT user_id FROM sessions WHERE id = '6ced147b-2956-4fb8-9463-fa309a05b485'"
        )
        await conn.close()
        return val

    user_id = loop.run_until_complete(get_user_id())
    print(f"Session's User ID: {user_id}")
    
    from app.api.endpoints.auth import get_current_user
    from app.schemas.user import UserOut
    from datetime import datetime
    
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
    
    print("Sending GET request to /api/sessions/6ced147b-2956-4fb8-9463-fa309a05b485...")
    headers = {"X-UI-Language": "vi"}
    response = client.get("/api/sessions/6ced147b-2956-4fb8-9463-fa309a05b485", headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("\n--- Response Keys ---")
        print(data.keys())
        print(f"Has evaluation_report: {bool(data.get('evaluation_report'))}")
        print(f"Has practice_plan: {bool(data.get('practice_plan'))}")
        print("\n--- Report Snippet ---")
        print(data.get("evaluation_report")[:300] if data.get("evaluation_report") else "None")
        print("\n--- Plan Snippet ---")
        print(data.get("practice_plan")[:300] if data.get("practice_plan") else "None")
    else:
        print(response.text)

if __name__ == "__main__":
    test_lazy()
