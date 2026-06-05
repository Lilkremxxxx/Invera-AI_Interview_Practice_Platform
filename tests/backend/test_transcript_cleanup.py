import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.services.transcript_cleanup as transcript_cleanup
from app.services.transcript_cleanup import correct_transcript_text


def test_correct_transcript_text_uses_question_context(monkeypatch):
    calls = []

    async def fake_chat_completion(**kwargs):
        calls.append(kwargs)
        return {"content": '{"text": "Event listener is used to listen for click events."}'}

    monkeypatch.setattr(transcript_cleanup, "create_chat_completion", fake_chat_completion)

    result = asyncio.run(
        correct_transcript_text(
            transcript="Eventually sinner is used to listen for click events.",
            question_text="What is an event listener in JavaScript?",
            language="en",
        )
    )

    assert result == "Event listener is used to listen for click events."
    assert "What is an event listener" in calls[0]["user_prompt"]
    assert "Do not add new ideas" in calls[0]["system_prompt"]


def test_correct_transcript_text_keeps_original_when_ai_expands_too_much(monkeypatch):
    async def fake_chat_completion(**kwargs):
        return {
            "content": (
                '{"text": "Event listener is used to listen for click events, '
                'then callbacks execute, then you can remove listeners, and '
                'this also improves maintainability in complex JavaScript apps."}'
            )
        }

    monkeypatch.setattr(transcript_cleanup, "create_chat_completion", fake_chat_completion)

    result = asyncio.run(
        correct_transcript_text(
            transcript="event listener click callback",
            question_text="What is an event listener?",
            language="en",
        )
    )

    assert result == "event listener click callback"


def test_correct_transcript_text_rejects_question_copying(monkeypatch):
    async def fake_chat_completion(**kwargs):
        return {"content": '{"text": "What is an event listener in JavaScript?"}'}

    monkeypatch.setattr(transcript_cleanup, "create_chat_completion", fake_chat_completion)

    result = asyncio.run(
        correct_transcript_text(
            transcript="event sinner javascript",
            question_text="What is an event listener in JavaScript?",
            language="en",
        )
    )

    assert result == "event sinner javascript"

