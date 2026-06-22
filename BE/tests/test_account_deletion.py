import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import account_deletion


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeDb:
    def __init__(self):
        self.fetchrow_calls = []
        self.fetch_calls = []
        self.execute_calls = []

    def transaction(self):
        return FakeTransaction()

    async def fetchrow(self, query, *args):
        self.fetchrow_calls.append((query, args))
        if "SELECT avatar_path, resume_path" in query:
            return {
                "avatar_path": "avatars/user-1/avatar.png",
                "resume_path": "resumes/user-1/resume.pdf",
            }
        return None

    async def fetch(self, query, *args):
        self.fetch_calls.append((query, args))
        return [{"answer_id": "answer-1"}, {"answer_id": "answer-2"}]

    async def execute(self, query, *args):
        self.execute_calls.append((query, args))
        return "OK"


def test_purge_user_data_deletes_user_files_invites_and_tts(monkeypatch, tmp_path):
    uploads_dir = tmp_path / "uploads"
    private_uploads_dir = tmp_path / "private"
    (uploads_dir / "interview-tts").mkdir(parents=True)
    (uploads_dir / "interview-tts" / "answer-1.wav").write_bytes(b"audio-1")
    (uploads_dir / "interview-tts" / "answer-2.wav").write_bytes(b"audio-2")
    (uploads_dir / "avatars" / "user-1").mkdir(parents=True)
    (private_uploads_dir / "resumes" / "user-1").mkdir(parents=True)

    deleted_public_files: list[str | None] = []
    deleted_private_files: list[str | None] = []

    monkeypatch.setattr(account_deletion, "delete_public_file", lambda path: deleted_public_files.append(path))
    monkeypatch.setattr(account_deletion, "delete_private_file", lambda path: deleted_private_files.append(path))

    db = FakeDb()
    asyncio.run(
        account_deletion.purge_user_data(
            db,
            user_id="user-1",
            email="candidate@example.com",
            uploads_dir=uploads_dir,
            private_uploads_dir=private_uploads_dir,
        )
    )

    assert deleted_public_files == ["avatars/user-1/avatar.png"]
    assert deleted_private_files == ["resumes/user-1/resume.pdf"]
    assert not (uploads_dir / "interview-tts" / "answer-1.wav").exists()
    assert not (uploads_dir / "interview-tts" / "answer-2.wav").exists()
    assert any("DELETE FROM admin_invites" in query for query, _ in db.execute_calls)
    assert any("DELETE FROM users" in query for query, _ in db.execute_calls)
