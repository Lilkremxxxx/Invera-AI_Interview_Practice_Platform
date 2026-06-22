import os
import sys
import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.api.endpoints.sessions as sessions_module
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.sessions import router as sessions_router
from app.db.session import get_db
from app.schemas.user import UserOut
import app.services.adaptive_interview as adaptive_module
from app.services.adaptive_interview import generate_follow_up_question


class FakeNonLiveSessionDb:
    async def fetchrow(self, *args, **kwargs):
        query = args[0] if args else ""
        if "FROM sessions" in query:
            return {
                "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                "role": "frontend",
                "level": "junior",
                "mode": "camera",
                "status": "IN_PROGRESS",
            }
        return None


class FakeLiveAgentDb:
    async def fetchrow(self, *args, **kwargs):
        query = args[0] if args else ""
        if "FROM sessions" in query:
            return {
                "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                "role": "frontend",
                "level": "junior",
                "mode": "live",
                "status": "IN_PROGRESS",
            }
        if "JOIN questions" in query:
            return {
                "id": 101,
                "text": "Tell me about a project you shipped.",
                "text_en": "Tell me about a project you shipped.",
                "text_vi": "Hãy kể về một dự án bạn đã triển khai.",
            }
        return None


def _build_user() -> UserOut:
    return UserOut(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        email="candidate@example.com",
        created_at=datetime(2026, 5, 5, tzinfo=timezone.utc),
        full_name="Candidate",
        is_admin=False,
    )


def test_live_agent_websocket_rejects_non_live_sessions(monkeypatch):
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    async def override_db():
        yield FakeNonLiveSessionDb()

    async def fake_authenticate_ws_user(websocket, db):
        return _build_user()

    monkeypatch.setattr(sessions_module, "_authenticate_ws_user", fake_authenticate_ws_user)

    app.dependency_overrides[get_db] = override_db

    client = TestClient(app)

    try:
        with client.websocket_connect(
            "/api/sessions/11111111-1111-1111-1111-111111111111/live-agent?token=test"
        ):
            raise AssertionError("websocket_connect should reject non-live sessions")
    except WebSocketDisconnect as exc:
        assert exc.code == 4400
        assert exc.reason == "Session is not live-enabled"


def test_live_agent_websocket_emits_ready_then_agent_events_in_order(monkeypatch):
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    async def override_db():
        yield FakeLiveAgentDb()

    async def fake_authenticate_ws_user(websocket, db):
        return _build_user()

    async def fake_stream_agent_prompt(*, role, level, question_text, language="vi"):
        assert role == "frontend"
        assert level == "junior"
        assert question_text == "Tell me about a project you shipped."
        assert language == "en"
        yield {"type": "agent_status", "status": "speaking"}
        yield {"type": "agent_transcript", "text": "Tell me about a project you shipped."}
        yield {"type": "agent_audio", "audio": "cGNhbQ=="}
        yield {"type": "agent_status", "status": "idle"}

    monkeypatch.setattr(sessions_module, "_authenticate_ws_user", fake_authenticate_ws_user)
    monkeypatch.setattr(sessions_module, "stream_agent_prompt", fake_stream_agent_prompt)

    app.dependency_overrides[get_db] = override_db

    client = TestClient(app)
    with client.websocket_connect(
        "/api/sessions/11111111-1111-1111-1111-111111111111/live-agent?token=test"
    ) as websocket:
        ready_payload = websocket.receive_json()
        websocket.send_json({"type": "ask", "questionId": 101, "language": "en"})
        speaking_payload = websocket.receive_json()
        transcript_payload = websocket.receive_json()
        audio_payload = websocket.receive_json()
        idle_payload = websocket.receive_json()

    assert ready_payload == {"type": "ready"}
    assert speaking_payload == {"type": "agent_status", "status": "speaking"}
    assert transcript_payload == {"type": "agent_transcript", "text": "Tell me about a project you shipped."}
    assert audio_payload == {"type": "agent_audio", "audio": "cGNhbQ=="}
    assert idle_payload == {"type": "agent_status", "status": "idle"}


def test_telemetry_can_nudge_follow_up_style_without_overriding_score(monkeypatch):
    async def fake_completion(**kwargs):
        return {
            "content": (
                '{"follow_up_question_text": "Can you give a concrete example?", '
                '"follow_up_reason": "clarify"}'
            )
        }

    monkeypatch.setattr(adaptive_module, "create_chat_completion", fake_completion)

    result = asyncio.run(
        generate_follow_up_question(
            question_text="Explain dependency injection.",
            answer_text="It helps with testing.",
            score=5.0,
            language="en",
            category="Backend",
            role="backend_engineer",
            level="junior",
            telemetry_data={"presentationConfidence": 35},
        )
    )

    assert result["follow_up_style"] == "deepen"
    assert result["follow_up_question_text"] == "Can you give a concrete example?"
