import os
import sys
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.api.endpoints.admin import router as admin_router, require_admin
from app.api.endpoints.auth import get_current_user
from app.db.session import get_db
from app.schemas.user import UserOut


class FakeDb:
    def __init__(self):
        self.fetch_queries = []

    async def fetchval(self, query, *params):
        self.fetch_queries.append((query, params))
        if "COUNT(*)" in query and "questions" in query:
            return 45  # total questions
        if "COUNT(*)" in query and "sessions" in query:
            return 12  # total sessions
        if "SUM(amount_vnd)" in query:
            return 1500000  # total revenue
        return 0

    async def fetch(self, query, *params):
        self.fetch_queries.append((query, params))
        if "questions" in query:
            return [
                {
                    "id": i,
                    "major": "technology",
                    "role": "frontend",
                    "level": "junior",
                    "text": f"Question {i}",
                    "text_en": f"Question {i}",
                    "text_vi": f"Question {i}",
                    "category": "React",
                    "category_en": "React",
                    "category_vi": "React",
                    "difficulty": "medium",
                    "ideal_answer": "Ideal answer content",
                    "ideal_answer_en": "Ideal answer content",
                    "ideal_answer_vi": "Ideal answer content",
                    "tags": ["react", "frontend"],
                }
                for i in range(1, 6)
            ]
        if "payment_orders" in query:
            if "day" in query:
                return [{"day": "2026-05-30", "revenue": 500000}]
            if "month" in query:
                return [{"month": "2026-05", "revenue": 1000000}]
        if "sessions" in query:
            return [
                {
                    "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
                    "user_id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
                    "user_email": "user@example.com",
                    "user_full_name": "John Doe",
                    "major": "technology",
                    "role": "frontend",
                    "level": "junior",
                    "mode": "voice",
                    "status": "COMPLETED",
                    "created_at": datetime(2026, 5, 20, tzinfo=timezone.utc),
                    "completed_at": datetime(2026, 5, 20, tzinfo=timezone.utc),
                    "time_limit_minutes": 30,
                    "question_count": 5,
                    "avg_score": 8.5,
                }
            ]
        return []


def _build_admin_user() -> UserOut:
    return UserOut(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        email="admin@example.com",
        created_at="2026-05-05T00:00:00Z",
        full_name="Admin User",
        is_admin=True,
    )


def test_admin_list_questions_pagination():
    app = FastAPI()
    app.include_router(admin_router, prefix="/api/admin")

    fake_db = FakeDb()

    async def override_db():
        yield fake_db

    async def override_require_admin():
        return _build_admin_user()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_admin] = override_require_admin

    client = TestClient(app)
    response = client.get("/api/admin/questions?page=2&size=5&search=react")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 2
    assert data["size"] == 5
    assert data["total"] == 45
    assert len(data["items"]) == 5
    assert data["items"][0]["text"] == "Question 1"


def test_admin_revenue_endpoint(monkeypatch):
    app = FastAPI()
    app.include_router(admin_router, prefix="/api/admin")

    fake_db = FakeDb()

    async def override_db():
        yield fake_db

    async def override_require_admin():
        return _build_admin_user()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_admin] = override_require_admin

    # Mock the settings so PayOS sync is skipped or doesn't throw
    import app.api.endpoints.admin as admin_module
    from types import SimpleNamespace
    monkeypatch.setattr(admin_module, "settings", SimpleNamespace(
        payos_client_id=None,
        payos_api_key=None,
        payos_checksum_key=None
    ))

    client = TestClient(app)
    response = client.get("/api/admin/revenue")
    assert response.status_code == 200
    data = response.json()
    assert data["total_revenue"] == 1500000
    assert len(data["daily"]) == 1
    assert len(data["monthly"]) == 1
    assert data["daily"][0]["revenue"] == 500000


def test_admin_list_sessions_endpoint():
    app = FastAPI()
    app.include_router(admin_router, prefix="/api/admin")

    fake_db = FakeDb()

    async def override_db():
        yield fake_db

    async def override_require_admin():
        return _build_admin_user()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_admin] = override_require_admin

    client = TestClient(app)
    response = client.get("/api/admin/sessions?limit=10&offset=0&search=john")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 12
    assert len(data["items"]) == 1
    assert data["items"][0]["user_full_name"] == "John Doe"
