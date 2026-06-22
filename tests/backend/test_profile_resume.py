import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

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


def test_upload_resume_rejects_pdf_without_extractable_text(monkeypatch, tmp_path):
    app = FastAPI()
    app.include_router(profile_router, prefix="/api/profile")
    fake_db = FakeProfileDb()

    async def override_db():
        yield fake_db

    monkeypatch.setattr(profile_module, "save_resume_upload", lambda **kwargs: ("resumes/test.pdf", 128))
    monkeypatch.setattr(profile_module, "resume_file_path", lambda storage_path: tmp_path / "resume.pdf")
    monkeypatch.setattr(profile_module, "extract_text_from_pdf", lambda path: "   \n  ")

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/profile/resume",
        files={"resume": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 400
    assert "không trích xuất được nội dung" in response.json()["detail"].lower()


def test_upload_resume_still_succeeds_when_cv_question_generation_fails(monkeypatch, tmp_path):
    app = FastAPI()
    app.include_router(profile_router, prefix="/api/profile")
    fake_db = FakeProfileDb()

    async def override_db():
        yield fake_db

    monkeypatch.setattr(profile_module, "save_resume_upload", lambda **kwargs: ("resumes/test.pdf", 256))
    monkeypatch.setattr(profile_module, "resume_file_path", lambda storage_path: tmp_path / "resume.pdf")
    monkeypatch.setattr(profile_module, "extract_text_from_pdf", lambda path: "Backend engineer at Example Corp")

    async def fail_generate_questions(db, user_id, extracted_text):
        raise RuntimeError("deepseek offline")

    monkeypatch.setattr(profile_module, "generate_and_save_cv_questions", fail_generate_questions)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/profile/resume",
        files={"resume": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 200
    assert response.json()["resume_uploaded"] is True


def test_upload_resume_persists_cv_questions_on_user_record(monkeypatch, tmp_path):
    app = FastAPI()
    app.include_router(profile_router, prefix="/api/profile")
    fake_db = FakeProfileDb()

    async def override_db():
        yield fake_db

    monkeypatch.setattr(profile_module, "save_resume_upload", lambda **kwargs: ("resumes/test.pdf", 256))
    monkeypatch.setattr(profile_module, "resume_file_path", lambda storage_path: tmp_path / "resume.pdf")
    monkeypatch.setattr(profile_module, "extract_text_from_pdf", lambda path: "Worked on LLM finetuning and retrieval systems")

    generated_questions = [
        {
            "text_vi": "Tôi thấy trong CV bạn có ghi bạn đã fine-tune model LLM, bạn có thể nói rõ hơn không?",
            "text_en": "I saw in your CV that you fine-tuned LLM models. Can you elaborate?",
            "category_vi": "Kỹ năng chuyên môn",
            "category_en": "Technical Skills",
            "difficulty": "medium",
            "ideal_answer_vi": "Nêu rõ mục tiêu, dữ liệu, đánh giá, và bài học.",
            "ideal_answer_en": "Explain goals, data, evaluation, and lessons learned.",
            "tags": ["CV-based"],
        }
    ]

    async def fake_generate_questions(db, user_id, extracted_text):
        return generated_questions

    monkeypatch.setattr(profile_module, "generate_and_save_cv_questions", fake_generate_questions)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/profile/resume",
        files={"resume": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 200
    update_calls = [entry for entry in fake_db.executed if "SET resume_path = $1" in entry[0]]
    assert len(update_calls) == 1
    assert update_calls[0][1][5] == generated_questions


def test_delete_resume_clears_user_scoped_cv_questions_without_touching_question_bank(monkeypatch):
    app = FastAPI()
    app.include_router(profile_router, prefix="/api/profile")
    fake_db = FakeProfileDb()
    fake_db.state.update(
        {
            "resume_path": "resumes/test.pdf",
            "resume_filename": "resume.pdf",
            "resume_content_type": "application/pdf",
        }
    )

    async def override_db():
        yield fake_db

    deleted_paths = []
    monkeypatch.setattr(profile_module, "delete_private_file", lambda path: deleted_paths.append(path))

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.delete("/api/profile/resume")

    assert response.status_code == 200
    assert deleted_paths == ["resumes/test.pdf"]
    assert any("resume_questions = NULL" in query for query, _ in fake_db.executed)
    assert all("DELETE FROM questions" not in query for query, _ in fake_db.executed)
