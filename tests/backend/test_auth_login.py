import os
import sys
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.api.endpoints.auth as auth_module
from app.api.endpoints.auth import router as auth_router
from app.db.session import get_db


class FakeDb:
    def __init__(self, user_row):
        self.user_row = user_row

    async def fetchrow(self, query, *params):
        if "SELECT id, email, password_hash, provider, email_verified FROM users" in query:
            return self.user_row
        return None

    async def execute(self, query, *params):
        return "OK"


def _build_app(db: FakeDb) -> FastAPI:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/auth")

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    return app


def test_login_returns_bearer_token_for_verified_local_user(monkeypatch):
    user_row = {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "email": "user@example.com",
        "password_hash": "hashed-password",
        "provider": "local",
        "email_verified": True,
    }
    app = _build_app(FakeDb(user_row))

    monkeypatch.setattr(auth_module, "verify_password", lambda password, hashed: password == "secret" and hashed == "hashed-password")

    created_tokens: list[dict] = []

    def fake_create_access_token(*, data, expires_delta=None):
        created_tokens.append({"data": data, "expires_delta": expires_delta})
        return "jwt-token"

    monkeypatch.setattr(auth_module, "create_access_token", fake_create_access_token)

    client = TestClient(app)
    response = client.post(
        "/api/auth/login",
        data={"username": "user@example.com", "password": "secret"},
    )

    assert response.status_code == 200
    assert response.json() == {"access_token": "jwt-token", "token_type": "bearer"}
    assert created_tokens == [{"data": {"sub": "user@example.com"}, "expires_delta": created_tokens[0]["expires_delta"]}]
