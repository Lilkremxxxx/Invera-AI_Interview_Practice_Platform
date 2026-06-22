from __future__ import annotations

import asyncio
import base64
from typing import AsyncIterator

from app.core.config import settings


class GeminiLiveAgentError(RuntimeError):
    pass


def _build_hr_prompt(*, role: str, level: str, question_text: str, language: str) -> str:
    if language == "vi":
        return (
            "Bạn là HR tiếng Việt cho nền tảng luyện phỏng vấn. "
            "Hãy đọc đúng một câu hỏi phỏng vấn chuyên ngành bằng giọng lịch sự, thanh thoát, chuyên nghiệp, "
            "không lan man, không thêm phần chào dài dòng, không tự trả lời thay ứng viên. "
            "Nếu câu hỏi có thuật ngữ chuyên môn, hãy đọc rõ ràng và tự nhiên. "
            f"Vai trò ứng tuyển: {role}. Cấp độ: {level}. "
            f"Câu hỏi cần đọc: {question_text}"
        )
    return (
        "You are a polished HR interviewer. Read exactly one interview question with a professional, calm, "
        "courteous delivery. Do not add explanations or extra commentary. "
        f"Role: {role}. Level: {level}. Question: {question_text}"
    )


async def stream_agent_prompt(
    *,
    role: str,
    level: str,
    question_text: str,
    language: str = "vi",
) -> AsyncIterator[dict]:
    if not settings.gemini_live_enabled:
        raise GeminiLiveAgentError("Gemini Live is disabled.")
    if not settings.gemini_live_api_key:
        raise GeminiLiveAgentError("Gemini Live API key is missing.")

    try:
        from google import genai
    except ImportError as exc:  # pragma: no cover - depends on runtime env
        raise GeminiLiveAgentError("google-genai is not installed.") from exc

    client = genai.Client(api_key=settings.gemini_live_api_key)
    config = {
        "response_modalities": ["AUDIO"],
        "output_audio_transcription": {},
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {
                    "voice_name": settings.gemini_live_voice,
                }
            }
        },
    }
    prompt = _build_hr_prompt(
        role=role,
        level=level,
        question_text=question_text,
        language=language,
    )

    try:
        async with asyncio.timeout(settings.gemini_live_timeout_seconds):
            async with client.aio.live.connect(model=settings.gemini_live_model, config=config) as session:
                await session.send_client_content(
                    turns={
                        "role": "user",
                        "parts": [{"text": prompt}],
                    },
                    turn_complete=True,
                )
                yield {"type": "agent_status", "status": "speaking"}
                async for response in session.receive():
                    server_content = getattr(response, "server_content", None)
                    if not server_content:
                        continue

                    model_turn = getattr(server_content, "model_turn", None)
                    if model_turn and getattr(model_turn, "parts", None):
                        for part in model_turn.parts:
                            inline_data = getattr(part, "inline_data", None)
                            if inline_data and getattr(inline_data, "data", None):
                                raw_data = inline_data.data
                                if isinstance(raw_data, str):
                                    encoded = raw_data
                                else:
                                    encoded = base64.b64encode(raw_data).decode("ascii")
                                yield {
                                    "type": "agent_audio",
                                    "audio": encoded,
                                    "mime_type": "audio/pcm;rate=24000",
                                }

                    output_transcription = getattr(server_content, "output_transcription", None)
                    if output_transcription and getattr(output_transcription, "text", None):
                        yield {
                            "type": "agent_transcript",
                            "text": output_transcription.text,
                        }

                    if getattr(server_content, "turn_complete", False):
                        break
    except TimeoutError as exc:
        raise GeminiLiveAgentError("Gemini Live request timed out.") from exc

    yield {"type": "agent_status", "status": "idle"}
    yield {"type": "turn_complete"}
