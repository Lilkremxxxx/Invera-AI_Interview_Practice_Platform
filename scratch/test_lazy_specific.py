import asyncio
import sys
import uuid
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

def test_lazy_specific():
    session_id = uuid.UUID("da4f6a7a-9aca-4e2e-9f9f-72acfe04258b")
    user_id = uuid.UUID("fe197c5a-64c4-42f1-8569-4421ee43e066")
    
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
        if data.get("practice_plan"):
            print("\nPractice Plan Snippet:")
            print(data.get("practice_plan")[:300])
        else:
            print("Practice Plan is Empty!")
    else:
        print(response.text)

if __name__ == "__main__":
    test_lazy_specific()
