import os
import sys
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.api.endpoints.sessions as sessions_module
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.sessions import router as sessions_router
from app.db.session import get_db
from app.schemas.user import UserOut


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeDb:
    def __init__(self):
        self.insert_params = None
        self.executemany_params = None
        self.previous_first_question_id = None

    def transaction(self):
        return FakeTransaction()

    async def fetchrow(self, query, *params):
        if "SELECT resume_questions" in query:
            return {"resume_questions": None}
        self.insert_params = (query, params)
        return {
            "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
            "user_id": params[0],
            "major": params[1],
            "role": params[2],
            "level": params[3],
            "mode": params[4],
            "language": params[5] if len(params) > 5 else "en",
            "status": "IN_PROGRESS",
            "created_at": datetime(2026, 5, 5, tzinfo=timezone.utc),
            "completed_at": None,
            "time_limit_minutes": params[6] if len(params) > 6 else None,
        }

    async def executemany(self, query, values):
        self.executemany_params = (query, values)

    async def fetchval(self, query, *params):
        return self.previous_first_question_id


def _build_user() -> UserOut:
    return UserOut(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        email="candidate@example.com",
        created_at="2026-05-05T00:00:00Z",
        full_name="Candidate",
        is_admin=False,
    )


def test_create_session_forces_five_minutes_per_question_and_accepts_camera_mode(monkeypatch):
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    fake_db = FakeDb()

    async def override_db():
        yield fake_db

    async def fake_plan_snapshot(db, user_id):
        return {
            "can_start_new_session": True,
            "is_admin": False,
            "plan_tier": "free_trial",
            "plan_status": "active",
        }

    async def fake_fetch_questions(db, *, major, role, level, count):
        return [
            {
                "id": 1,
                "major": major,
                "role": role,
                "level": level,
                "text": "Question 1",
                "text_en": "Question 1",
                "text_vi": "Question 1",
                "category": "General",
                "category_en": "General",
                "category_vi": "General",
                "difficulty": "easy",
                "tags": [],
            },
            {
                "id": 2,
                "major": major,
                "role": role,
                "level": level,
                "text": "Question 2",
                "text_en": "Question 2",
                "text_vi": "Question 2",
                "category": "General",
                "category_en": "General",
                "category_vi": "General",
                "difficulty": "medium",
                "tags": [],
            },
        ][:count]

    async def fake_ensure_question_bank_minimum(*args, **kwargs):
        return None

    async def passthrough_translate(db, questions):
        return questions

    monkeypatch.setattr(sessions_module, "get_user_plan_snapshot", fake_plan_snapshot)
    monkeypatch.setattr(sessions_module, "_fetch_session_questions", fake_fetch_questions)
    monkeypatch.setattr(sessions_module, "ensure_question_bank_minimum", fake_ensure_question_bank_minimum)
    monkeypatch.setattr(sessions_module, "translate_questions_to_vi_if_needed", passthrough_translate)
    monkeypatch.setattr(sessions_module, "translate_questions_to_en_if_needed", passthrough_translate)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/sessions",
        headers={"X-UI-Language": "en"},
        json={
            "major": "technology",
            "role": "frontend",
            "level": "junior",
            "mode": "camera",
            "question_count": 10,
            "time_limit_minutes": 999,
        },
    )

    assert response.status_code == 200
    assert response.json()["mode"] == "camera"
    assert fake_db.insert_params[1][4] == "camera"
    assert fake_db.insert_params[1][6] is None


def test_create_session_rotates_repeated_first_question(monkeypatch):
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    fake_db = FakeDb()
    fake_db.previous_first_question_id = 5

    async def override_db():
        yield fake_db

    async def fake_plan_snapshot(db, user_id):
        return {
            "can_start_new_session": True,
            "is_admin": False,
            "plan_tier": "free_trial",
            "plan_status": "active",
        }

    async def fake_fetch_questions(db, *, major, role, level, count):
        return [
            {
                "id": 5,
                "major": major,
                "role": role,
                "level": level,
                "text": "Responsive design là gì?",
                "text_en": "What is responsive design?",
                "text_vi": "Responsive design là gì?",
                "category": "CSS",
                "category_en": "CSS",
                "category_vi": "CSS",
                "difficulty": "easy",
                "tags": [],
            },
            {
                "id": 3,
                "major": major,
                "role": role,
                "level": level,
                "text": "Event listener là gì?",
                "text_en": "What is an event listener?",
                "text_vi": "Event listener là gì?",
                "category": "JavaScript",
                "category_en": "JavaScript",
                "category_vi": "JavaScript",
                "difficulty": "easy",
                "tags": [],
            },
        ]

    monkeypatch.setattr(sessions_module, "get_user_plan_snapshot", fake_plan_snapshot)
    monkeypatch.setattr(sessions_module, "_fetch_session_questions", fake_fetch_questions)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/sessions",
        headers={"X-UI-Language": "vi"},
        json={
            "major": "technology",
            "role": "frontend",
            "level": "intern",
            "mode": "camera",
            "question_count": 2,
        },
    )

    assert response.status_code == 200
    assert response.json()["questions"][0]["id"] == 3
    assert fake_db.executemany_params[1][0][1] == 3


def test_create_session_rejects_live_mode_for_basic_users(monkeypatch):
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    fake_db = FakeDb()

    async def override_db():
        yield fake_db

    async def fake_plan_snapshot(db, user_id):
        return {
            "can_start_new_session": True,
            "is_admin": False,
            "plan_tier": "basic",
            "plan_status": "active",
        }

    async def fake_fetch_questions(db, *, major, role, level, count):
        return [
            {
                "id": 11,
                "major": major,
                "role": role,
                "level": level,
                "text": "Question 1",
                "text_en": "Question 1",
                "text_vi": "Question 1",
                "category": "General",
                "category_en": "General",
                "category_vi": "General",
                "difficulty": "easy",
                "tags": [],
            },
        ][:count]

    async def fake_ensure_question_bank_minimum(*args, **kwargs):
        return None

    async def passthrough_translate(db, questions):
        return questions

    monkeypatch.setattr(sessions_module, "get_user_plan_snapshot", fake_plan_snapshot)
    monkeypatch.setattr(sessions_module, "_fetch_session_questions", fake_fetch_questions)
    monkeypatch.setattr(sessions_module, "ensure_question_bank_minimum", fake_ensure_question_bank_minimum)
    monkeypatch.setattr(sessions_module, "translate_questions_to_vi_if_needed", passthrough_translate)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/sessions",
        headers={"X-UI-Language": "vi"},
        json={
            "major": "technology",
            "role": "frontend",
            "level": "junior",
            "mode": "live",
            "question_count": 1,
        },
    )

    assert response.status_code == 403
    assert "Live session" in response.json()["detail"]
    assert fake_db.insert_params is None


def test_create_session_accepts_live_mode_for_pro_users(monkeypatch):
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    fake_db = FakeDb()

    async def override_db():
        yield fake_db

    async def fake_plan_snapshot(db, user_id):
        return {
            "can_start_new_session": True,
            "is_admin": False,
            "plan_tier": "pro",
            "plan_status": "active",
        }

    async def fake_fetch_questions(db, *, major, role, level, count):
        return [
            {
                "id": 11,
                "major": major,
                "role": role,
                "level": level,
                "text": "Question 1",
                "text_en": "Question 1",
                "text_vi": "Question 1",
                "category": "General",
                "category_en": "General",
                "category_vi": "General",
                "difficulty": "easy",
                "tags": [],
            },
        ][:count]

    async def fake_ensure_question_bank_minimum(*args, **kwargs):
        return None

    async def passthrough_translate(db, questions):
        return questions

    monkeypatch.setattr(sessions_module, "get_user_plan_snapshot", fake_plan_snapshot)
    monkeypatch.setattr(sessions_module, "_fetch_session_questions", fake_fetch_questions)
    monkeypatch.setattr(sessions_module, "ensure_question_bank_minimum", fake_ensure_question_bank_minimum)
    monkeypatch.setattr(sessions_module, "translate_questions_to_vi_if_needed", passthrough_translate)
    monkeypatch.setattr(sessions_module, "translate_questions_to_en_if_needed", passthrough_translate)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/sessions",
        headers={"X-UI-Language": "vi"},
        json={
            "major": "technology",
            "role": "frontend",
            "level": "junior",
            "mode": "live",
            "question_count": 1,
        },
    )

    assert response.status_code == 200
    assert response.json()["mode"] == "live"
    assert fake_db.insert_params[1][4] == "live"


def test_create_session_only_appends_cv_tagged_user_questions(monkeypatch):
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    class FakeCvDb(FakeDb):
        def __init__(self):
            super().__init__()
            self.resume_questions = [
                {
                    "text_vi": "Tôi thấy trong CV bạn có ghi bạn xây dựng hệ thống RAG, bạn có thể nói rõ hơn không?",
                    "text_en": "I saw in your CV that you built a RAG system. Can you elaborate?",
                    "category_vi": "Dự án",
                    "category_en": "Projects",
                    "difficulty": "medium",
                    "ideal_answer_vi": "Nêu rõ kiến trúc, indexing, retrieval và trade-off.",
                    "ideal_answer_en": "Explain the architecture, indexing, retrieval, and trade-offs.",
                    "tags": ["CV-based"],
                },
                {
                    "text_vi": "Câu custom không thuộc CV",
                    "text_en": "A custom non-CV question",
                    "category_vi": "Chung",
                    "category_en": "General",
                    "difficulty": "medium",
                    "ideal_answer_vi": "Không dùng",
                    "ideal_answer_en": "Do not use",
                    "tags": ["custom"],
                },
            ]

        async def fetch(self, query, *params):
            raise AssertionError(f"Unexpected fetch query: {query}")

        async def fetchrow(self, query, *params):
            if "SELECT resume_questions" in query:
                return {"resume_questions": self.resume_questions}
            return await super().fetchrow(query, *params)

    fake_db = FakeCvDb()

    async def override_db():
        yield fake_db

    async def fake_plan_snapshot(db, user_id):
        return {
            "can_start_new_session": True,
            "is_admin": False,
            "plan_tier": "free_trial",
            "plan_status": "active",
        }

    async def fake_fetch_questions(db, *, major, role, level, count):
        return [
            {
                "id": 1,
                "major": major,
                "role": role,
                "level": level,
                "text": "Base question",
                "text_en": "Base question",
                "text_vi": "Base question",
                "category": "General",
                "category_en": "General",
                "category_vi": "General",
                "difficulty": "easy",
                "tags": [],
            }
        ]

    async def passthrough_translate(db, questions):
        return questions

    monkeypatch.setattr(sessions_module, "get_user_plan_snapshot", fake_plan_snapshot)
    monkeypatch.setattr(sessions_module, "_fetch_session_questions", fake_fetch_questions)
    monkeypatch.setattr(sessions_module, "translate_questions_to_vi_if_needed", passthrough_translate)
    monkeypatch.setattr(sessions_module, "translate_questions_to_en_if_needed", passthrough_translate)
    monkeypatch.setattr(sessions_module.random, "randint", lambda a, b: 2)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/sessions",
        headers={"X-UI-Language": "en"},
        json={
            "major": "technology",
            "role": "frontend",
            "level": "junior",
            "mode": "camera",
            "question_count": 1,
        },
    )

    assert response.status_code == 200
    question_ids = [question["id"] for question in response.json()["questions"]]
    assert question_ids == [1, 90]
    assert all(question["tags"] == ["CV-based"] or question["id"] == 1 for question in response.json()["questions"])
    assert fake_db.insert_params[1][6] is None


def test_complete_session_can_schedule_report_generation_without_waiting(monkeypatch):
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    session_id = uuid.UUID("33333333-3333-3333-3333-333333333333")
    user = _build_user()
    scheduled = []

    class CompleteFakeDb:
        async def fetchrow(self, query, *params):
            if "SELECT id, role, level, major, status" in query:
                return {
                    "id": session_id,
                    "role": "frontend",
                    "level": "junior",
                    "major": "technology",
                    "status": "IN_PROGRESS",
                    "mode": "text",
                    "language": "en",
                    "created_at": datetime(2026, 5, 5, tzinfo=timezone.utc),
                    "completed_at": None,
                    "time_limit_minutes": 25,
                    "evaluation_report": None,
                    "practice_plan": None,
                }
            if "UPDATE sessions" in query:
                return {
                    "id": session_id,
                    "user_id": user.id,
                    "major": "technology",
                    "role": "frontend",
                    "level": "junior",
                    "mode": "text",
                    "language": "en",
                    "status": "COMPLETED",
                    "created_at": datetime(2026, 5, 5, tzinfo=timezone.utc),
                    "completed_at": datetime(2026, 5, 5, 0, 5, tzinfo=timezone.utc),
                    "time_limit_minutes": 25,
                    "evaluation_report": None,
                    "practice_plan": None,
                }
            if "SELECT AVG(score)" in query:
                return {"avg_score": 8.0, "cnt": 1}
            raise AssertionError(f"Unexpected query: {query}")

    async def override_db():
        yield CompleteFakeDb()

    def fake_schedule_report(*, session_id, language):
        scheduled.append((session_id, language))

    monkeypatch.setattr(sessions_module, "_schedule_session_report_generation", fake_schedule_report)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    response = client.put(f"/api/sessions/{session_id}/complete?generate_report=false")

    assert response.status_code == 200
    assert scheduled == [(session_id, "en")]
    assert response.json()["status"] == "COMPLETED"
    assert response.json()["evaluation_report"] is None
    assert response.json()["practice_plan"] is None
