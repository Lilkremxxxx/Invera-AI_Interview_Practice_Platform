import os
import sys
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.api.endpoints.profile as profile_module
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.profile import router as profile_router
from app.db.session import get_db
from app.schemas.user import UserOut


class FakeProfileDb:
    def __init__(self):
        self.state = {
            "avatar_path": None,
            "resume_path": None,
            "resume_filename": None,
            "resume_content_type": None,
        }
        self.executed = []

    def transaction(self):
        class _Tx:
            async def __aenter__(self_inner):
                return self_inner

            async def __aexit__(self_inner, exc_type, exc, tb):
                return False

        return _Tx()

    async def fetchrow(self, query, *params):
        if "SELECT avatar_path, resume_path" in query:
            return self.state
        raise AssertionError(f"Unexpected fetchrow query: {query}")

    async def execute(self, query, *params):
        self.executed.append((query, params))


def _build_user() -> UserOut:
    return UserOut(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        email="candidate@example.com",
        created_at=datetime(2026, 5, 5, tzinfo=timezone.utc),
        full_name="Candidate",
        is_admin=False,
    )


def test_upload_avatar_updates_user_row_and_removes_previous_file(monkeypatch):
    app = FastAPI()
    app.include_router(profile_router, prefix="/api/profile")
    fake_db = FakeProfileDb()
    fake_db.state["avatar_path"] = "avatars/old-avatar.png"

    async def override_db():
        yield fake_db

    deleted_paths: list[str] = []
    monkeypatch.setattr(profile_module, "save_avatar_upload", lambda **kwargs: ("avatars/new-avatar.png", 128))
    monkeypatch.setattr(profile_module, "avatar_url", lambda storage_path: f"https://cdn.example/{storage_path}")
    monkeypatch.setattr(profile_module, "delete_public_file", lambda path: deleted_paths.append(path))

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/profile/avatar",
        files={"avatar": ("avatar.png", b"avatar-bytes", "image/png")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Cập nhật avatar thành công.",
        "avatar_url": "https://cdn.example/avatars/new-avatar.png",
    }
    assert deleted_paths == ["avatars/old-avatar.png"]
    assert any("UPDATE users" in query and "avatar_path = $1" in query for query, _ in fake_db.executed)


def test_delete_avatar_clears_avatar_path_and_deletes_file(monkeypatch):
    app = FastAPI()
    app.include_router(profile_router, prefix="/api/profile")
    fake_db = FakeProfileDb()
    fake_db.state["avatar_path"] = "avatars/old-avatar.png"

    async def override_db():
        yield fake_db

    deleted_paths: list[str] = []
    monkeypatch.setattr(profile_module, "delete_public_file", lambda path: deleted_paths.append(path))

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.delete("/api/profile/avatar")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Đã xóa avatar.",
        "avatar_url": None,
    }
    assert deleted_paths == ["avatars/old-avatar.png"]
    assert any("SET avatar_path = NULL" in query for query, _ in fake_db.executed)
