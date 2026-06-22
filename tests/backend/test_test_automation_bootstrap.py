import os
import sys
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.api.endpoints.test_automation as test_automation_module
from app.api.endpoints.test_automation import router as test_automation_router
from app.db.session import get_db
from app.schemas.user import UserOut


class FakeBootstrapDb:
    class _Tx:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    def __init__(self):
        self.calls = []

    async def fetchrow(self, query, *params):
        self.calls.append(("fetchrow", query, params))
        if "FROM users" in query and "email = $1" in query:
            return None
        if "INSERT INTO users" in query:
            email = params[0]
            return {
                "id": uuid.uuid5(uuid.NAMESPACE_URL, email),
                "email": email,
                "created_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "full_name": params[2],
                "is_admin": "TRUE" in query or params[3] is True,
                "is_primary_admin": False,
                "email_verified": True,
                "plan_tier": "pro",
                "plan_status": "active",
                "plan_billing_period": "month",
                "plan_started_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "plan_expires_at": None,
                "session_limit": 8,
                "sessions_used": 0,
                "additional_sessions": 0,
                "can_start_new_session": True,
                "can_use_qna": False,
                "is_billing_exempt": False,
                "avatar_url": None,
                "resume_uploaded": False,
                "resume_filename": None,
            }
        if "INSERT INTO sessions" in query:
            return {
                "id": uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                "user_id": uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                "major": params[1],
                "role": params[2],
                "level": params[3],
                "mode": params[4],
                "language": params[5],
                "status": "IN_PROGRESS",
                "created_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "completed_at": None,
                "time_limit_minutes": None,
            }
        return None

    async def fetch(self, query, *params):
        self.calls.append(("fetch", query, params))
        if "INSERT INTO questions" in query:
            return []
        return []

    async def execute(self, query, *params):
        self.calls.append(("execute", query, params))
        return "OK"

    def transaction(self):
        return self._Tx()


def _build_app(db: FakeBootstrapDb, enabled: bool = True) -> FastAPI:
    app = FastAPI()
    app.include_router(test_automation_router, prefix="/api/test-automation")

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    test_automation_module.settings = SimpleNamespace(test_automation_enabled=enabled)
    return app


def test_test_automation_bootstrap_is_forbidden_when_disabled():
    app = _build_app(FakeBootstrapDb(), enabled=False)
    client = TestClient(app)

    response = client.post(
        "/api/test-automation/bootstrap",
        json={
            "session_payload": {
                "major": "technology",
                "role": "frontend",
                "level": "junior",
                "mode": "camera",
                "language": "en",
                "question_count": 1,
            }
        },
    )

    assert response.status_code == 404


def test_test_automation_bootstrap_seeds_unique_candidate_and_admin_fixtures():
    db = FakeBootstrapDb()
    app = _build_app(db, enabled=True)
    client = TestClient(app)

    response = client.post(
        "/api/test-automation/bootstrap",
        json={
            "candidate_email_prefix": "automation-candidate",
            "admin_email_prefix": "automation-admin",
            "session_payload": {
                "major": "technology",
                "role": "frontend",
                "level": "junior",
                "mode": "camera",
                "language": "en",
                "question_count": 2,
            },
            "questions": [
                {
                    "text": "How do you keep state predictable in a React app?",
                    "category": "Frontend",
                    "difficulty": "medium",
                    "tags": ["automation"],
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["candidate"]["email"].startswith("automation-candidate+")
    assert payload["admin"]["email"].startswith("automation-admin+")
    assert payload["session"]["mode"] == "camera"
    assert payload["questions"][0]["text"] == "How do you keep state predictable in a React app?"
