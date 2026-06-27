import asyncio
import sys
import uuid
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.endpoints import sessions


class FakeDb:
    def __init__(self):
        self.pending_counts = [2, 1, 0]
        self.fetchrow_calls = []
        self.fetchval_calls = []
        self.updated = False

    async def fetchrow(self, query, *args):
        self.fetchrow_calls.append((query, args))
        if query.startswith("SELECT id, role, level, major, status, mode, language, created_at, completed_at, time_limit_minutes, evaluation_report, practice_plan FROM sessions"):
            return {
                "id": uuid.UUID("b547d21d-6044-4309-afbf-43ccef5fcded"),
                "role": "frontend",
                "level": "junior",
                "major": "technology",
                "status": "IN_PROGRESS",
                "mode": "camera",
                "language": "en",
                "created_at": "2026-05-05T00:00:00Z",
                "completed_at": None,
                "time_limit_minutes": None,
                "evaluation_report": None,
                "practice_plan": None,
            }
        if "UPDATE sessions" in query:
            self.updated = True
            return {
                "id": uuid.UUID("b547d21d-6044-4309-afbf-43ccef5fcded"),
                "user_id": uuid.UUID("c547d21d-6044-4309-afbf-43ccef5fcded"),
                "major": "technology",
                "role": "frontend",
                "level": "junior",
                "mode": "camera",
                "language": "en",
                "status": "COMPLETED",
                "created_at": "2026-05-05T00:00:00Z",
                "completed_at": "2026-05-05T00:01:00Z",
                "time_limit_minutes": None,
                "evaluation_report": None,
                "practice_plan": None,
            }
        if "SELECT AVG(score)::float AS avg_score, COUNT(*)::int AS cnt FROM answers" in query:
            return {"avg_score": 8.5, "cnt": 1}
        return None

    async def fetchval(self, query, *args):
        self.fetchval_calls.append((query, args))
        if "COUNT(*)::int FROM answers WHERE session_id = $1 AND feedback = 'PENDING'" in query:
            if self.pending_counts:
                return self.pending_counts.pop(0)
            return 0
        return None

    async def execute(self, query, *args):
        return "OK"


def test_complete_session_does_not_wait_for_pending_answers_before_returning(monkeypatch):
    async def fake_sleep(_seconds):
        return None

    monkeypatch.setattr(sessions.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(sessions, "_schedule_session_report_generation", lambda **kwargs: None)

    db = FakeDb()
    current_user = SimpleNamespace(id=uuid.UUID("c547d21d-6044-4309-afbf-43ccef5fcded"))
    request = SimpleNamespace(headers={"x-ui-language": "en"})

    result = asyncio.run(
        sessions.complete_session(
            session_id=uuid.UUID("b547d21d-6044-4309-afbf-43ccef5fcded"),
            request=request,
            generate_report=False,
            db=db,
            current_user=current_user,
        )
    )

    assert db.pending_counts == [2, 1, 0]  # Should not be consumed
    assert db.updated is True
    assert result.avg_score == 8.5
    assert result.question_count == 1
