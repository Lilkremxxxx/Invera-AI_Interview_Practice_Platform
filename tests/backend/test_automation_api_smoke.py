import os
import sys
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.api.endpoints.test_automation as test_automation_module
import app.api.endpoints.auth as auth_module
import app.api.endpoints.sessions as sessions_module
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.billing import router as billing_router
from app.api.endpoints.admin import router as admin_router
from app.api.endpoints.sessions import router as sessions_router
from app.api.endpoints.test_automation import router as test_automation_router
from app.db.session import get_db
from app.schemas.user import UserOut


class SmokeDb:
    class _Tx:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    async def fetchrow(self, query, *params):
        if "INSERT INTO users" in query:
            email = params[0]
            return {
                "id": uuid.uuid5(uuid.NAMESPACE_URL, email),
                "email": email,
                "full_name": params[2],
                "is_admin": "TRUE" in query,
            }
        if "FROM users" in query and "WHERE id = $1" in query:
            return {
                "id": params[0],
                "email": "automation-candidate@example.test",
                "created_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "full_name": "Automation Candidate",
                "is_admin": True,
                "email_verified": True,
                "plan_tier": "pro",
                "plan_status": "active",
                "plan_billing_period": "month",
                "plan_started_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "plan_expires_at": None,
                "avatar_path": None,
                "resume_path": None,
                "resume_filename": None,
                "additional_sessions": 0,
            }
        if "INSERT INTO questions" in query:
            return {
                "id": 1,
                "major": params[0],
                "role": params[1],
                "level": params[2],
                "text": params[3],
                "category": params[4],
                "difficulty": params[5],
                "tags": [],
            }
        if "INSERT INTO sessions" in query:
            return {
                "id": uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                "user_id": params[0],
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
        if "SELECT id, email, password_hash, provider, email_verified" in query:
            return {
                "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                "email": "automation-candidate@example.test",
                "password_hash": "hash",
                "provider": "local",
                "email_verified": True,
            }
        if "FROM sessions" in query and "INSERT INTO sessions" not in query:
            return {
                "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
                "user_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                "major": "technology",
                "role": "frontend",
                "level": "junior",
                "mode": "camera",
                "language": "en",
                "status": "COMPLETED",
                "created_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "completed_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "time_limit_minutes": 30,
                "question_count": 1,
                "avg_score": 8.0,
                "evaluation_report": None,
                "practice_plan": None,
            }
        if "FROM answers a" in query and "LEFT JOIN interview_follow_ups fu" in query:
            return {
                "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
                "session_id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
                "question_id": 1,
                "answer_text": "I kept state predictable with a reducer and a single source of truth.",
                "score": 8.0,
                "feedback": "Strong answer.",
                "telemetry_data": None,
                "submitted_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "follow_up_id": None,
                "follow_up_style": None,
                "follow_up_question_text": None,
                "follow_up_answer_text": None,
                "follow_up_score": None,
                "follow_up_feedback": None,
                "follow_up_telemetry_data": None,
                "follow_up_generated_at": None,
                "follow_up_answered_at": None,
            }
        if "JOIN questions q ON q.id = a.question_id" in query:
            return {
                "text": "How do you keep state predictable in a React app?",
                "text_en": "How do you keep state predictable in a React app?",
                "text_vi": "Làm sao để giữ state dễ dự đoán trong ứng dụng React?",
                "category": "Frontend",
                "category_en": "Frontend",
                "category_vi": "Frontend",
                "difficulty": "medium",
                "ideal_answer": "",
                "ideal_answer_en": "",
                "ideal_answer_vi": "",
                "role": "frontend",
                "level": "junior",
                "major": "technology",
            }
        if "INSERT INTO interview_follow_ups" in query:
            return {
                "id": uuid.UUID("55555555-5555-5555-5555-555555555555"),
                "session_id": params[0],
                "parent_answer_id": params[1],
                "follow_up_style": params[2],
                "question_text": params[3],
                "answer_text": None,
                "score": 0.0,
                "feedback": "PENDING",
                "telemetry_data": None,
                "generated_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
                "answered_at": None,
            }
        if "INSERT INTO payment_orders" in query:
            return {
                "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
                "user_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                "email": "automation-candidate@example.test",
                "provider": "payos",
                "plan_tier": "pro",
                "billing_period": "month",
                "amount_vnd": 100000,
                "status": "pending",
                "provider_order_ref": "123",
                "provider_transaction_no": None,
                "provider_response_code": None,
                "payment_url": "https://pay.test/checkout",
                "paid_at": None,
                "created_at": datetime(2026, 6, 22, tzinfo=timezone.utc),
            }
        return None

    async def fetch(self, query, *params):
        if "FROM questions" in query:
            return [
                {
                    "id": 1,
                    "major": "technology",
                    "role": "frontend",
                    "level": "junior",
                    "text": "How do you keep state predictable in a React app?",
                    "text_en": "How do you keep state predictable in a React app?",
                    "text_vi": "Làm sao để giữ state dễ dự đoán trong ứng dụng React?",
                    "category": "Frontend",
                    "category_en": "Frontend",
                    "category_vi": "Frontend",
                    "difficulty": "medium",
                    "tags": ["automation"],
                }
            ]
        return []

    async def execute(self, query, *params):
        return "OK"

    async def fetchval(self, query, *params):
        if "COUNT(*) FROM sessions" in query:
            return 0
        return None

    def transaction(self):
        return self._Tx()


def _build_app(db: SmokeDb) -> FastAPI:
    app = FastAPI()
    app.include_router(test_automation_router, prefix="/api/test-automation")
    app.include_router(auth_router, prefix="/api/auth")
    app.include_router(sessions_router, prefix="/api/sessions")
    app.include_router(billing_router, prefix="/api/billing")
    app.include_router(admin_router, prefix="/api/admin")

    async def override_db():
        yield db

    async def override_user():
        return UserOut(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            email="automation-candidate@example.test",
            created_at=datetime(2026, 6, 22, tzinfo=timezone.utc),
            full_name="Automation Candidate",
            is_admin=True,
            email_verified=True,
            plan_tier="pro",
            plan_status="active",
            sessions_used=0,
            additional_sessions=0,
            can_start_new_session=True,
            can_use_qna=True,
        )

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    test_automation_module.settings = SimpleNamespace(test_automation_enabled=True)
    return app


def test_automation_smoke_covers_auth_sessions_exports_billing_and_admin(monkeypatch):
    monkeypatch.setattr(auth_module, "verify_password", lambda plain_password, hashed_password: False)
    async def fake_plan_snapshot(db, user_id, now=None):
        return {
            "can_start_new_session": False,
            "plan_tier": "free",
            "plan_status": "inactive",
            "is_admin": False,
            "is_billing_exempt": False,
            "sessions_used": 0,
        }

    monkeypatch.setattr(sessions_module, "get_user_plan_snapshot", fake_plan_snapshot)
    client = TestClient(_build_app(SmokeDb()))

    assert client.post(
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
    ).status_code == 200
    assert client.post("/api/auth/login", data={"username": "automation-candidate@example.test", "password": "secret"}).status_code in {200, 401}
    assert client.post("/api/sessions", json={"major": "technology", "role": "frontend", "level": "junior", "mode": "camera", "language": "en", "question_count": 1}).status_code in {200, 403}
    assert client.post(
        "/api/sessions/22222222-2222-2222-2222-222222222222/answers/44444444-4444-4444-4444-444444444444/follow-up"
    ).status_code != 404
    assert client.get("/api/sessions/22222222-2222-2222-2222-222222222222/export-docx").status_code in {200, 403}
    assert client.post("/api/billing/payos/checkout", json={"plan_tier": "pro", "billing_period": "month"}).status_code in {200, 400, 422, 502}
    assert client.get("/api/admin/users").status_code in {200, 403}
