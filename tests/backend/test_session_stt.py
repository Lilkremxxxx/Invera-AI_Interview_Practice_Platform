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

    command = build_whisper_command(
        wav_path="/tmp/sample.wav",
        output_prefix="/tmp/out/sample",
    )

    assert command[0].endswith("whisper-cli")
    assert "-l" not in command
    assert "-m" in command
    assert any("ggml-small.bin" in part for part in command)
    assert not any("ggml-small.en.bin" in part for part in command)
    assert "-otxt" in command


def test_build_whisper_command_accepts_english_language():
    from app.services.interview_stt import build_whisper_command

    command = build_whisper_command(
        wav_path="/tmp/sample.wav",
        output_prefix="/tmp/out/sample",
        language="en",
    )

    assert "-l" in command
    assert command[command.index("-l") + 1] == "en"
    assert any("ggml-small.en.bin" in part for part in command)


def test_build_whisper_command_auto_uses_multilingual_model_and_no_language_flag():
    from app.services.interview_stt import build_whisper_command

    command = build_whisper_command(
        wav_path="/tmp/sample.wav",
        output_prefix="/tmp/out/sample",
        language="auto",
    )

    assert "-l" not in command
    assert any("ggml-small.bin" in part for part in command)
    assert not any("ggml-small.en.bin" in part for part in command)


def test_build_whisper_command_uses_multilingual_model_for_vietnamese():
    from app.services.interview_stt import build_whisper_command

    command = build_whisper_command(
        wav_path="/tmp/sample.wav",
        output_prefix="/tmp/out/sample",
        language="vi",
    )

    assert "-l" in command
    assert command[command.index("-l") + 1] == "vi"
    assert any("ggml-small.bin" in part for part in command)
    assert not any("ggml-small.en.bin" in part for part in command)


def test_build_whisper_command_rejects_unsupported_language():
    import pytest

    from app.services.interview_stt import build_whisper_command

    with pytest.raises(ValueError, match="Unsupported STT language"):
        build_whisper_command(
            wav_path="/tmp/sample.wav",
            output_prefix="/tmp/out/sample",
            language="fr",
        )


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
