import os
import sys
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.api.endpoints.admin import router as admin_router, require_admin
from app.db.session import get_db
from app.schemas.user import UserOut


class FakeDb:
    def __init__(self):
        self.fetchrow_calls = []
        self.fetch_calls = []
        self.execute_calls = []

    def transaction(self):
        class _Tx:
            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

        return _Tx()

    async def fetchrow(self, query, *params):
        self.fetchrow_calls.append((query, params))
        return {
            "id": uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            "code": uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            "plan_tier": "basic",
            "expires_at": datetime(2026, 7, 1, tzinfo=timezone.utc),
            "redeemed_at": None,
            "redeemed_by_email": None,
            "created_at": datetime(2026, 6, 24, tzinfo=timezone.utc),
        }

    async def fetch(self, query, *params):
        self.fetch_calls.append((query, params))
        return [
            {
                "id": uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                "code": uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                "plan_tier": "basic",
                "expires_at": datetime(2026, 7, 1, tzinfo=timezone.utc),
                "redeemed_at": None,
                "redeemed_by_email": None,
                "created_at": datetime(2026, 6, 24, tzinfo=timezone.utc),
            }
        ]

    async def execute(self, query, *params):
        self.execute_calls.append((query, params))
        return "OK"


def _build_admin_user() -> UserOut:
    return UserOut(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        email="admin@example.com",
        created_at="2026-05-05T00:00:00Z",
        full_name="Admin User",
        is_admin=True,
    )


def test_admin_can_generate_basic_code_with_7_day_expiry(monkeypatch):
    app = FastAPI()
    app.include_router(admin_router, prefix="/api/admin")

    fake_db = FakeDb()

    async def override_db():
        yield fake_db

    async def override_require_admin():
        return _build_admin_user()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_admin] = override_require_admin

    import app.api.endpoints.admin as admin_module

    monkeypatch.setattr(admin_module, "utcnow", lambda: datetime(2026, 6, 24, tzinfo=timezone.utc))
    monkeypatch.setattr(admin_module, "create_redeem_code_record", lambda *args, **kwargs: fake_db.fetchrow("", None))

    client = TestClient(app)
    response = client.post("/api/admin/redeem-codes", json={"plan_tier": "basic", "expires_in_days": 7})

    assert response.status_code == 200
    body = response.json()
    assert body["plan_tier"] == "basic"
    assert body["code"] == "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    assert body["redeemed_at"] is None


def test_admin_can_list_recent_redeem_codes():
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
    response = client.get("/api/admin/redeem-codes")

    assert response.status_code == 200
    assert response.json()[0]["code"] == "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
