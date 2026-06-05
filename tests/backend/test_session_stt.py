import os
import sys
import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.api.endpoints.auth import get_current_user
from app.api.endpoints.sessions import router as sessions_router
from app.schemas.user import UserOut


class FakeMissingSessionDb:
    async def fetchrow(self, *args, **kwargs):
        return None


class FakeInProgressSessionDb:
    async def fetchrow(self, *args, **kwargs):
        return {"id": uuid.uuid4(), "status": "IN_PROGRESS"}


def _build_user() -> UserOut:
    return UserOut(
        id=uuid.uuid4(),
        email="candidate@example.com",
        created_at="2026-05-05T00:00:00Z",
        full_name="Candidate",
        is_admin=False,
    )


def test_build_whisper_command_defaults_to_auto_language():
    from app.services.interview_stt import build_whisper_command
    from app.core.config import settings

    command = build_whisper_command(
        wav_path="/tmp/sample.wav",
        output_prefix="/tmp/out/sample",
    )

    assert command[0].endswith("whisper-cli")
    assert "-l" not in command
    assert "-m" in command
    assert any(f"ggml-{settings.whisper_model_name}.bin" in part for part in command)
    assert not any(f"ggml-{settings.whisper_en_model_name}.bin" in part for part in command)
    assert "-otxt" in command


def test_build_whisper_command_accepts_english_language():
    from app.services.interview_stt import build_whisper_command
    from app.core.config import settings

    command = build_whisper_command(
        wav_path="/tmp/sample.wav",
        output_prefix="/tmp/out/sample",
        language="en",
    )

    assert "-l" in command
    assert command[command.index("-l") + 1] == "en"
    assert any(f"ggml-{settings.whisper_en_model_name}.bin" in part for part in command)


def test_build_whisper_command_auto_uses_multilingual_model_and_no_language_flag():
    from app.services.interview_stt import build_whisper_command
    from app.core.config import settings

    command = build_whisper_command(
        wav_path="/tmp/sample.wav",
        output_prefix="/tmp/out/sample",
        language="auto",
    )

    assert "-l" not in command
    assert any(f"ggml-{settings.whisper_model_name}.bin" in part for part in command)
    assert not any(f"ggml-{settings.whisper_en_model_name}.bin" in part for part in command)


def test_build_whisper_command_uses_multilingual_model_for_vietnamese():
    from app.services.interview_stt import build_whisper_command
    from app.core.config import settings

    command = build_whisper_command(
        wav_path="/tmp/sample.wav",
        output_prefix="/tmp/out/sample",
        language="vi",
    )

    assert "-l" in command
    assert command[command.index("-l") + 1] == "vi"
    assert any(f"ggml-{settings.whisper_model_name}.bin" in part for part in command)
    assert not any(f"ggml-{settings.whisper_en_model_name}.bin" in part for part in command)


def test_build_whisper_command_rejects_unsupported_language():
    import pytest

    from app.services.interview_stt import build_whisper_command

    with pytest.raises(ValueError, match="Unsupported STT language"):
        build_whisper_command(
            wav_path="/tmp/sample.wav",
            output_prefix="/tmp/out/sample",
            language="fr",
        )


def test_answer_submit_accepts_output_language():
    from app.schemas.answer import AnswerSubmit

    payload = AnswerSubmit(
        question_id=1,
        answer_text="EventListener is an API for listening to events.",
        output_language="en",
    )

    assert payload.output_language == "en"


def test_session_stt_route_returns_session_not_found_for_missing_session():
    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    async def override_db():
        yield FakeMissingSessionDb()

    app.dependency_overrides[get_current_user] = _build_user
    app.dependency_overrides[sessions_router.dependencies[0].dependency if sessions_router.dependencies else get_current_user] = _build_user

    from app.db.session import get_db

    app.dependency_overrides[get_db] = override_db

    client = TestClient(app)
    response = client.post(
        f"/api/sessions/{uuid.uuid4()}/stt",
        files={"audio": ("answer.webm", b"stub-audio", "audio/webm")},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Session không tồn tại"


def test_session_stt_route_runs_transcription_off_event_loop(monkeypatch):
    from app.api.endpoints import sessions as sessions_endpoint

    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    async def override_db():
        yield FakeInProgressSessionDb()

    async def fake_to_thread(func, **kwargs):
        assert func is sessions_endpoint.transcribe_audio_bytes
        assert kwargs["audio_bytes"] == b"stub-audio"
        return "thread transcript"

    monkeypatch.setattr(sessions_endpoint.asyncio, "to_thread", fake_to_thread)

    from app.db.session import get_db

    app.dependency_overrides[get_current_user] = _build_user
    app.dependency_overrides[get_db] = override_db

    client = TestClient(app)
    response = client.post(
        f"/api/sessions/{uuid.uuid4()}/stt",
        files={"audio": ("answer.webm", b"stub-audio", "audio/webm")},
    )

    assert response.status_code == 200
    assert response.json() == {"text": "thread transcript"}


def test_answer_submit_accepts_telemetry_data():
    from app.schemas.answer import AnswerSubmit

    payload = AnswerSubmit(
        question_id=1,
        answer_text="EventListener is an API for listening to events.",
        telemetry_data={
            "gazeRatio": 0.8,
            "smileRatio": 0.3,
            "slouchRatio": 0.1,
            "handGestures": 5,
            "fidgetRatio": 0.2
        }
    )

    assert payload.telemetry_data["gazeRatio"] == 0.8
    assert payload.telemetry_data["handGestures"] == 5


def test_session_video_route_runs_transcription_off_event_loop(monkeypatch):
    from app.api.endpoints import sessions as sessions_endpoint

    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    async def override_db():
        yield FakeInProgressSessionDb()

    async def fake_to_thread(func, **kwargs):
        assert func is sessions_endpoint.transcribe_audio_bytes
        assert kwargs["audio_bytes"] == b"stub-video"
        return "video transcript"

    monkeypatch.setattr(sessions_endpoint.asyncio, "to_thread", fake_to_thread)

    from app.db.session import get_db

    app.dependency_overrides[get_current_user] = _build_user
    app.dependency_overrides[get_db] = override_db

    client = TestClient(app)
    response = client.post(
        f"/api/sessions/{uuid.uuid4()}/answer-video",
        files={"video": ("answer.webm", b"stub-video", "video/webm")},
        data={"telemetry_data": '{"gazeRatio":0.8,"smileRatio":0.2,"slouchRatio":0.1,"handGestures":10,"fidgetRatio":0.1}'}
    )

    assert response.status_code == 200
    assert response.json() == {"text": "video transcript"}


def test_session_stt_websocket_streams_chunk_transcripts(monkeypatch):
    from app.api.endpoints import sessions as sessions_endpoint

    app = FastAPI()
    app.include_router(sessions_router, prefix="/api/sessions")

    async def override_db():
        yield FakeInProgressSessionDb()

    async def fake_authenticate_ws_user(websocket, db):
        return _build_user()

    class FakeRealtimeSession:
        def __init__(self, *, language=None):
            self.language = language

        def accept_chunk(self, audio_bytes, suffix=".webm"):
            assert audio_bytes == (b"x" * 5000)
            return {"type": "partial", "text": "stream transcript", "is_final": False}

        def finalize(self):
            return "final transcript"

    async def fake_to_thread(func, *args, **kwargs):
        if func is sessions_endpoint.VoskRealtimeSession:
            return FakeRealtimeSession(language=kwargs.get("language"))
        return func(*args, **kwargs)

    monkeypatch.setattr(sessions_endpoint, "_authenticate_ws_user", fake_authenticate_ws_user)
    monkeypatch.setattr(sessions_endpoint, "VoskRealtimeSession", FakeRealtimeSession)
    monkeypatch.setattr(sessions_endpoint.asyncio, "to_thread", fake_to_thread)

    from app.db.session import get_db

    app.dependency_overrides[get_db] = override_db

    client = TestClient(app)
    with client.websocket_connect("/api/sessions/00000000-0000-0000-0000-000000000001/stt-stream?token=test&language=en") as websocket:
        websocket.send_bytes(b"x" * 5000)
        payload = websocket.receive_json()
        websocket.send_text('{"type":"stop"}')
        final_payload = websocket.receive_json()

    assert payload == {
        "type": "partial",
        "seq": 1,
        "text": "stream transcript",
        "is_final": False,
    }
    assert final_payload == {
        "type": "final",
        "seq": 2,
        "text": "final transcript",
        "is_final": True,
    }


def test_resample_pcm_to_16k():
    from app.services.interview_stt_realtime import _resample_pcm_to_16k
    import struct
    
    # 1. 16000Hz should return immediately unchanged
    dummy_data = b"abcdef"
    assert _resample_pcm_to_16k(dummy_data, 16000) == dummy_data
    
    # 2. Resampling from 48000Hz to 16000Hz (3x reduction)
    # Generate 6 samples
    samples = [0, 100, 200, 300, 400, 500]
    pcm_in = struct.pack("<6h", *samples)
    pcm_out = _resample_pcm_to_16k(pcm_in, 48000)
    
    # Expected output size should be 2 samples (since ratio is 1/3)
    out_samples = struct.unpack("<2h", pcm_out)
    assert len(out_samples) == 2
    assert out_samples[0] == 0
    assert out_samples[1] == 300

