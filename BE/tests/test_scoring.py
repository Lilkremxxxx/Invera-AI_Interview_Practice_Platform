"""
Unit tests for services/scoring.py
Run: cd BE && python -m pytest tests/test_scoring.py -v
"""

import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services import scoring
from app.services.scoring import (
    ScoringRequest,
    _generate_feedback,
    _tokenize,
    keyword_score_answer,
    score_answer,
)


class TestTokenize:
    def test_basic_tokenize(self):
        tokens = _tokenize("Python is a programming language")
        assert "python" in tokens
        assert "programming" in tokens
        assert "language" in tokens

    def test_removes_stopwords(self):
        tokens = _tokenize("the a an is are was were be la va cua cac co trong duoc")
        assert len(tokens) == 0

    def test_empty_string(self):
        assert _tokenize("") == set()


class TestHeuristicScoring:
    IDEAL = (
        "React uses a virtual DOM to compare updates in memory before applying minimal changes to the real DOM. "
        "This improves rendering efficiency and helps React keep UI updates predictable."
    )
    QUESTION = "What is the Virtual DOM in React and why does it improve rendering performance?"

    def test_empty_answer_returns_zero(self):
        score, feedback = keyword_score_answer("", self.IDEAL, self.QUESTION)
        assert score == 0.0
        assert "cung cấp" in feedback.lower()

    def test_short_vietnamese_answer_is_scored_low(self):
        req = ScoringRequest(
            answer_text="React dung DOM ao de render nhanh hon.",
            ideal_answer=self.IDEAL,
            question_text=self.QUESTION,
            role="frontend",
            level="junior",
            category="React",
            difficulty="medium",
        )
        score, feedback = asyncio.run(score_answer(req))
        assert 0.0 <= score <= 2.5
        assert "quá ngắn" in feedback.lower()

    def test_irrelevant_answer_returns_fast_off_topic_feedback(self, monkeypatch):
        monkeypatch.setattr(scoring, "_deepseek_is_enabled", lambda: True)

        async def should_not_run(_request):
            raise AssertionError("DeepSeek should not run for clearly off-topic answers")

        monkeypatch.setattr(scoring, "_score_with_deepseek", should_not_run)

        req = ScoringRequest(
            answer_text=(
                "I enjoy football, weekend travel, cooking with friends, watching movies, and talking about music, "
                "food, and family plans every Saturday night."
            ),
            ideal_answer=self.IDEAL,
            question_text=self.QUESTION,
            role="frontend",
            level="junior",
            category="React",
            difficulty="medium",
            preferred_language="en",
        )
        score, feedback = asyncio.run(score_answer(req))
        assert 0.0 <= score <= 3.0
        assert "off the question" in feedback.lower() or "not relevant" in feedback.lower()

    def test_detailed_relevant_answer_scores_reasonably_high(self):
        answer = (
            "The Virtual DOM is an in-memory representation of the UI. React first compares the new tree with the "
            "previous one, then updates only the changed parts of the real DOM. In practice this reduces unnecessary "
            "DOM mutations, keeps rendering more efficient, and gives developers a predictable update model."
        )
        score, _ = keyword_score_answer(answer, self.IDEAL, self.QUESTION, category="React", difficulty="medium")
        assert 6.5 <= score <= 10.0

    def test_irrelevant_answer_stays_low(self):
        score, _ = keyword_score_answer(
            "Today the weather is beautiful and I want to go outside.",
            self.IDEAL,
            self.QUESTION,
            category="React",
            difficulty="medium",
        )
        assert 0.0 <= score <= 4.0

    def test_score_in_range(self):
        test_cases = [
            "",
            "abc def ghi",
            self.IDEAL * 5,
            "completely unrelated nonsense text here",
        ]
        for answer in test_cases:
            score, _ = keyword_score_answer(answer, self.IDEAL, self.QUESTION)
            assert 0.0 <= score <= 10.0

    def test_async_score_falls_back_to_heuristic_when_provider_disabled(self, monkeypatch):
        monkeypatch.setattr(scoring, "_deepseek_is_enabled", lambda: False)

        req = ScoringRequest(
            answer_text=(
                "React keeps a virtual DOM in memory, compares changes first, and then updates only the parts of the "
                "real DOM that actually changed. That makes rendering more efficient in many UI updates."
            ),
            ideal_answer=self.IDEAL,
            question_text=self.QUESTION,
            role="frontend",
            level="junior",
            category="React",
            difficulty="medium",
        )
        score, feedback = asyncio.run(score_answer(req))
        assert 5.0 <= score <= 10.0
        assert isinstance(feedback, str) and feedback

    def test_async_score_uses_deepseek_response_when_available(self, monkeypatch):
        async def fake_llm(_request):
            return 7.8, "Summary: Strong answer"

        monkeypatch.setattr(scoring, "_deepseek_is_enabled", lambda: True)
        monkeypatch.setattr(scoring, "_score_with_deepseek", fake_llm)

        req = ScoringRequest(
            answer_text="I would explain reconciliation and DOM diffing, then give a UI example.",
            ideal_answer=self.IDEAL,
            question_text=self.QUESTION,
            role="frontend",
            level="junior",
            category="React",
            difficulty="medium",
        )
        score, feedback = asyncio.run(score_answer(req))
        assert score == 7.8
        assert feedback == "Summary: Strong answer"


class TestGenerateFeedback:
    def test_high_score_message(self):
        feedback = _generate_feedback(9.0)
        assert "mạnh" in feedback.lower() or "strong" in feedback.lower()

    def test_medium_score_message(self):
        feedback = _generate_feedback(6.8)
        assert "khá tốt" in feedback.lower() or "solid" in feedback.lower()

    def test_low_score_message(self):
        feedback = _generate_feedback(2.0)
        assert "yếu" in feedback.lower() or "weak" in feedback.lower()
