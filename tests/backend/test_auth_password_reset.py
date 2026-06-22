import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.api.endpoints.auth import router as auth_router
from app.db.session import get_db


class FakeDb:
    def __init__(self, user_row=None, reset_row=None):
        self.user_row = user_row
        self.reset_row = reset_row
        self.execute_calls = []

    async def fetchrow(self, query, *params):
        if "FROM users WHERE email" in query:
            return self.user_row
        if "FROM users WHERE reset_token" in query:
            return self.reset_row
        return None

    async def execute(self, query, *params):
        self.execute_calls.append((query, params))
        return "OK"


def _build_app(db: FakeDb) -> FastAPI:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/auth")

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    return app


def test_forgot_password_generates_reset_link_and_stores_token(monkeypatch):
    import app.api.endpoints.auth as auth_module

    fake_db = FakeDb(
        user_row={
            "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
            "email": "user@example.com",
        }
    )
    app = _build_app(fake_db)

    monkeypatch.setattr(
        auth_module,
        "settings",
        SimpleNamespace(frontend_reset_password_url="https://example.test/reset-password"),
    )

    sent = {}

    async def fake_send_password_reset_email(recipient: str, reset_link: str) -> None:
        sent["recipient"] = recipient
        sent["reset_link"] = reset_link

    monkeypatch.setattr(auth_module, "send_password_reset_email", fake_send_password_reset_email)

    client = TestClient(app)
    response = client.post("/api/auth/forgot-password", json={"email": "user@example.com"})

    assert response.status_code == 200
    assert response.json()["message"]
    assert sent["recipient"] == "user@example.com"
    assert sent["reset_link"].startswith("https://example.test/reset-password?token=")
    assert len(fake_db.execute_calls) == 1
    assert "UPDATE users SET reset_token" in fake_db.execute_calls[0][0]


def test_forgot_password_ignores_google_accounts(monkeypatch):
    import app.api.endpoints.auth as auth_module

    fake_db = FakeDb(
        user_row={
            "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
            "email": "google-user@example.com",
            "provider": "google",
        }
    )
    app = _build_app(fake_db)

    sent = {}

    async def fake_send_password_reset_email(recipient: str, reset_link: str) -> None:
        sent["recipient"] = recipient
        sent["reset_link"] = reset_link

    monkeypatch.setattr(auth_module, "send_password_reset_email", fake_send_password_reset_email)

    client = TestClient(app)
    response = client.post("/api/auth/forgot-password", json={"email": "google-user@example.com"})

    assert response.status_code == 200
    assert response.json()["message"]
    assert sent == {}
    assert fake_db.execute_calls == []


def test_reset_password_clears_token_after_success(monkeypatch):
    import app.api.endpoints.auth as auth_module

    fake_db = FakeDb(
        reset_row={
            "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
            "reset_token_expires": datetime.now(timezone.utc) + timedelta(minutes=30),
        }
    )
    app = _build_app(fake_db)

    monkeypatch.setattr(auth_module, "hash_password", lambda password: f"hashed::{password}")

    client = TestClient(app)
    response = client.post(
        "/api/auth/reset-password",
        json={"token": "reset-token", "new_password": "new-secret"},
    )

    assert response.status_code == 200
    assert response.json()["message"]
    assert len(fake_db.execute_calls) == 1
    query, params = fake_db.execute_calls[0]
    assert "UPDATE users SET password_hash" in query
    assert params[0] == "hashed::new-secret"
    assert params[1] == fake_db.reset_row["id"]
