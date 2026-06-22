import os
import sys
import asyncio
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.api.endpoints.sessions import _question_time_limit_expired
import app.services.adaptive_interview as adaptive_module
from app.services.adaptive_interview import (
    build_follow_up_generation_messages,
    follow_up_style_for_score,
    generate_follow_up_question,
)


def test_follow_up_style_for_score_uses_the_right_bucket():
    assert follow_up_style_for_score(8.2) == "deepen"
    assert follow_up_style_for_score(5.5) == "clarify"
    assert follow_up_style_for_score(2.8) == "simplify"


def test_follow_up_generation_messages_include_score_bucket_and_context():
    system_prompt, user_prompt = build_follow_up_generation_messages(
        question_text="Virtual DOM trong React là gì?",
        answer_text="Nó là bản sao in-memory của DOM thật và giúp tối ưu render.",
        score=8.4,
        language="vi",
        category="React",
        role="frontend",
        level="junior",
    )

    assert "AI interviewer" in system_prompt
    assert "deepen" in user_prompt
    assert "Virtual DOM trong React là gì?" in user_prompt
    assert "Nó là bản sao in-memory của DOM thật" in user_prompt
    assert "follow_up_question_text" in user_prompt


def test_generate_follow_up_question_uses_clarify_bucket_for_mid_score(monkeypatch):
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
        )
    )

    assert result["follow_up_style"] == "clarify"
    assert result["follow_up_question_text"] == "Can you give a concrete example?"


def test_generate_follow_up_question_falls_back_on_empty_model_output(monkeypatch):
    async def fake_completion(**kwargs):
        return {"content": ""}

    monkeypatch.setattr(adaptive_module, "create_chat_completion", fake_completion)

    result = asyncio.run(
        generate_follow_up_question(
            question_text="Explain dependency injection.",
            answer_text="I am not sure.",
            score=2.0,
            language="en",
            category="Backend",
            role="backend_engineer",
            level="junior",
        )
    )

    assert result["follow_up_style"] == "simplify"
    assert result["follow_up_question_text"]


def test_generate_follow_up_question_falls_back_on_unexpected_error(monkeypatch):
    async def boom(**kwargs):
        raise RuntimeError("unexpected failure")

    monkeypatch.setattr(adaptive_module, "create_chat_completion", boom)

    result = asyncio.run(generate_follow_up_question(
        question_text="Tell me about your caching strategy.",
        answer_text="I used Redis for read-heavy endpoints.",
        score=7.8,
        language="en",
        category="System design",
        role="backend",
        level="junior",
    ))

    assert result["follow_up_style"] == "deepen"
    assert result["follow_up_question_text"]


def test_question_time_limit_expired_uses_per_question_cap():
    started_at = datetime.now(timezone.utc) - timedelta(minutes=4, seconds=59)
    assert _question_time_limit_expired(started_at) is False

    expired_started_at = datetime.now(timezone.utc) - timedelta(minutes=5, seconds=1)
    assert _question_time_limit_expired(expired_started_at) is True
