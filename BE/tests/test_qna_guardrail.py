"""
Unit tests for QnA scope guardrail.
Run: cd BE && python -m pytest tests/test_qna_guardrail.py -v
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.qna import evaluate_qna_scope, fallback_qna_answer, qna_scope_refusal


def test_blocks_random_self_talk():
    decision = evaluate_qna_scope(
        user_message="toi bi ngu",
        quoted_text=None,
        attachment_text=None,
    )
    assert decision.allowed is False


def test_blocks_greeting_only():
    decision = evaluate_qna_scope(
        user_message="chao ban",
        quoted_text=None,
        attachment_text=None,
    )
    assert decision.allowed is False


def test_allows_technical_interview_question():
    decision = evaluate_qna_scope(
        user_message="Explain CORS in a way that sounds strong in a backend interview.",
        quoted_text=None,
        attachment_text=None,
    )
    assert decision.allowed is True


def test_allows_short_follow_up_when_selected_text_exists():
    decision = evaluate_qna_scope(
        user_message="giai thich doan nay giup minh",
        quoted_text="CORS is a browser security mechanism that restricts cross-origin requests.",
        attachment_text=None,
    )
    assert decision.allowed is True


def test_refusal_payload_uses_guardrail_message():
    payload = qna_scope_refusal(
        user_message="toi bi ngu",
        quoted_text=None,
        attachment_name=None,
        language="vi",
    )
    assert "Agent" in payload["summary"]
    assert payload["language"] == "vi"


def test_fallback_respects_scope_guardrail():
    payload = fallback_qna_answer(
        user_message="ke chuyen cuoi di",
        quoted_text=None,
        attachment_name=None,
        attachment_text=None,
    )
    assert "Agent" in payload["summary"] or "agent" in payload["summary"]
