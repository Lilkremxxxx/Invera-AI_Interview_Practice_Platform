import os
import sys
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.api.endpoints.admin as admin_module
from app.api.endpoints.admin import require_primary_admin, router as admin_router
from app.api.endpoints.auth import get_current_user
from app.db.session import get_db
from app.schemas.user import UserOut


class FakeAdminDb:
    def __init__(self):
        self.existing_admin_email = None
        self.existing_verified_user = None
        self.invite_row = None
        self.target_admin = None
        self.execute_calls = []

    def transaction(self):
        class _Tx:
            async def __aenter__(self_inner):
                return self_inner

            async def __aexit__(self_inner, exc_type, exc, tb):
                return False

        return _Tx()

    async def fetchrow(self, query, *params):
        if "SELECT id FROM users WHERE email = $1 AND is_admin = TRUE" in query:
            return self.existing_admin_email
        if "SELECT id, email_verified, provider FROM users WHERE email = $1" in query:
            return self.existing_verified_user
        if "INSERT INTO admin_invites" in query:
            email = params[0]
            invited_by = params[1]
            activated_at = params[3] if len(params) > 3 else None
            status = "activated" if activated_at else "pending"
            self.invite_row = {
                "id": uuid.UUID("77777777-7777-7777-7777-777777777777"),
                "email": email,
                "status": status,
                "notes": params[2],
                "created_at": datetime(2026, 6, 21, tzinfo=timezone.utc),
                "activated_at": activated_at,
                "invited_by": invited_by,
            }
            return self.invite_row
        if "SELECT id, email FROM users WHERE id = $1" in query:
            return self.target_admin
        if "UPDATE users\n        SET is_admin = FALSE" in query or "UPDATE users\n        SET is_admin = TRUE" in query:
            return self.existing_verified_user or self.target_admin
        if "UPDATE admin_invites\n        SET status = 'revoked'" in query:
            return {"id": params[0]}
        return None

    async def fetchval(self, query, *params):
        if query.strip() == "SELECT NOW()":
            return datetime(2026, 6, 21, tzinfo=timezone.utc)
        return None

    async def execute(self, query, *params):
        self.execute_calls.append((query, params))


def _build_primary_admin() -> UserOut:
    return UserOut(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        email="primary@example.com",
        created_at=datetime(2026, 5, 5, tzinfo=timezone.utc),
        full_name="Primary Admin",
        is_admin=True,
        is_primary_admin=True,
    )


def _build_target_admin() -> dict:
    return {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
        "email": "admin2@example.com",
        "created_at": datetime(2026, 5, 10, tzinfo=timezone.utc),
        "full_name": "Secondary Admin",
        "is_admin": True,
        "provider": "local",
    }


def _build_verified_user() -> dict:
    return {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
        "email_verified": True,
        "provider": "local",
    }


def _build_app(fake_db: FakeAdminDb) -> FastAPI:
    app = FastAPI()
    app.include_router(admin_router, prefix="/api/admin")

    async def override_db():
        yield fake_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_primary_admin] = _build_primary_admin
    app.dependency_overrides[get_current_user] = _build_primary_admin
    return app


def test_create_invite_for_new_email_creates_pending_invite_and_signup_link(monkeypatch):
    fake_db = FakeAdminDb()
    app = _build_app(fake_db)
    sent_emails: list[tuple] = []

    async def fake_send_admin_invite_email(*args, **kwargs):
        sent_emails.append((args, kwargs))

    monkeypatch.setattr(
        admin_module,
        "settings",
        SimpleNamespace(frontend_public_url="https://invera.example"),
    )
    monkeypatch.setattr(
        admin_module,
        "send_admin_invite_email",
        fake_send_admin_invite_email,
    )

    client = TestClient(app)
    response = client.post(
        "/api/admin/invites",
        json={"email": "new-admin@example.com", "notes": "Content support"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "new-admin@example.com"
    assert payload["status"] == "pending"
    assert payload["invited_by_email"] == "primary@example.com"
    assert sent_emails
    args, kwargs = sent_emails[0]
    assert args[0] == "new-admin@example.com"
    assert args[1] == "https://invera.example/admin/signup?email=new-admin%40example.com"
    assert kwargs.get("mode", "signup") == "signup"
    assert fake_db.invite_row is not None


def test_create_invite_for_verified_user_activates_admin_and_sends_login_link(monkeypatch):
    fake_db = FakeAdminDb()
    fake_db.existing_verified_user = _build_verified_user()
    app = _build_app(fake_db)
    sent_emails: list[tuple] = []

    async def fake_send_admin_invite_email(*args, **kwargs):
        sent_emails.append((args, kwargs))

    monkeypatch.setattr(
        admin_module,
        "settings",
        SimpleNamespace(frontend_public_url="https://invera.example"),
    )
    monkeypatch.setattr(
        admin_module,
        "send_admin_invite_email",
        fake_send_admin_invite_email,
    )

    client = TestClient(app)
    response = client.post(
        "/api/admin/invites",
        json={"email": "verified-admin@example.com", "notes": "Ops admin"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "verified-admin@example.com"
    assert payload["status"] == "activated"
    assert payload["invited_by_email"] == "primary@example.com"
    assert sent_emails
    args, kwargs = sent_emails[0]
    assert args[0] == "verified-admin@example.com"
    assert args[1] == (
        "https://invera.example/admin/login?"
        "email=verified-admin%40example.com&notice=admin-access-granted"
    )
    assert kwargs["mode"] == "existing-login"
    assert kwargs["provider"] == "local"
    assert any("UPDATE users" in query and "is_admin = TRUE" in query for query, _ in fake_db.execute_calls or [])


def test_revoke_pending_invite_marks_it_revoked():
    fake_db = FakeAdminDb()
    app = _build_app(fake_db)

    client = TestClient(app)
    invite_id = "55555555-5555-5555-5555-555555555555"
    fake_db.invite_row = {
        "id": uuid.UUID(invite_id),
        "email": "pending@example.com",
        "status": "pending",
        "notes": None,
        "created_at": datetime(2026, 6, 21, tzinfo=timezone.utc),
        "activated_at": None,
        "invited_by": uuid.UUID("11111111-1111-1111-1111-111111111111"),
    }

    response = client.delete(f"/api/admin/invites/{invite_id}")

    assert response.status_code == 200
    assert response.json() == {"revoked": invite_id}
    assert fake_db.invite_row is not None


def test_remove_admin_access_revokes_user_and_their_invite():
    fake_db = FakeAdminDb()
    fake_db.target_admin = _build_target_admin()
    app = _build_app(fake_db)

    client = TestClient(app)
    response = client.delete(f"/api/admin/admin-users/{fake_db.target_admin['id']}")

    assert response.status_code == 200
    assert response.json() == {
        "removed": str(fake_db.target_admin["id"]),
        "email": fake_db.target_admin["email"],
    }
    assert any("UPDATE admin_invites" in query for query, _ in fake_db.execute_calls)
