import os
import sys
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.api.endpoints.auth import get_current_user
from app.api.endpoints.sessions import router as sessions_router
from app.db.session import get_db
from app.schemas.user import UserOut


class FakeTelemetryDb:
    async def fetch(self, query, *params):
        if "GROUP BY s.id" in query:
            return [
                {
                    "session_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                    "role": "frontend",
                    "level": "junior",
                    "mode": "camera",
                    "created_at": datetime(2026, 6, 10, tzinfo=timezone.utc),
                    "completed_at": datetime(2026, 6, 10, 0, 20, tzinfo=timezone.utc),
                    "avg_score": 7.6,
                }
            ]
        if "FROM sessions s" in query and "JOIN answers a" in query:
            return [
                {
                    "session_id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                    "position": 1,
                    "question_id": 10,
                    "answer_score": 7.2,
                    "answer_submitted_at": datetime(2026, 6, 10, 0, 5, tzinfo=timezone.utc),
                    "answer_telemetry_data": {
                        "gazeRatio": 0.62,
                        "bodyPostureScore": 0.71,
                        "speakingPace": 118,
                        "fillerWordsCount": 6,
                        "presentationConfidence": 74,
                        "blinkRatio": 0.04,
                        "avgTensionScore": 0.18,
                    },
                    "follow_up_id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
                    "follow_up_score": 8.0,
                    "follow_up_submitted_at": datetime(2026, 6, 10, 0, 7, tzinfo=timezone.utc),
                    "follow_up_telemetry_data": {
                        "gazeRatio": 0.7,
                        "bodyPostureScore": 0.79,
                        "speakingPace": 110,
                        "fillerWordsCount": 4,
                        "presentationConfidence": 81,
                        "blinkRatio": 0.03,
                        "avgTensionScore": 0.12,
                    },
                }
            ]
        raise AssertionError(f"Unexpected query: {query}")


def _build_user() -> UserOut:
    return UserOut(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        email="candidate@example.com",
        created_at=datetime(2026, 5, 5, tzinfo=timezone.utc),
        full_name="Candidate",
        is_admin=False,
    )


def test_telemetry_overview_returns_session_summary_and_answer_drilldown():
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    async def override_db():
        yield FakeTelemetryDb()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.get("/api/sessions/telemetry/overview")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["sessions"]) == 1
    session = payload["sessions"][0]
    assert session["summary"]["gaze"] == 66
    assert session["summary"]["posture"] == 75
    assert session["summary"]["fillers"] == 5
    assert session["summary"]["blink"] == 4
    assert [point["label"] for point in session["answers"]] == ["Q1", "Q1b"]
    assert session["answers"][1]["is_follow_up"] is True
