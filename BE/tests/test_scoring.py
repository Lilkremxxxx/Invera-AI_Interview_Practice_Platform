"""
Unit tests cho services/scoring.py
Chạy: cd BE && python -m pytest tests/test_scoring.py -v
"""
import asyncio
import pytest
import sys
import os

# Thêm BE/ vào path để import được package app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

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

    def test_removes_stopwords_en(self):
        tokens = _tokenize("the a an is are was were be")
        assert len(tokens) == 0

    def test_removes_stopwords_vi(self):
        tokens = _tokenize("là và của các có trong được")
        assert len(tokens) == 0

    def test_removes_short_words(self):
        tokens = _tokenize("ab x yz")
        assert len(tokens) == 0

    def test_lowercase(self):
        tokens = _tokenize("FastAPI REST API HTTP")
        assert "fastapi" in tokens
        assert "rest" in tokens
        assert "http" in tokens

    def test_real_answer(self):
        tokens = _tokenize("React sử dụng virtual DOM để tăng hiệu suất rendering")
        assert "react" in tokens
        assert "virtual" in tokens
        assert "dom" in tokens

    def test_empty_string(self):
        tokens = _tokenize("")
        assert len(tokens) == 0


class TestScoreAnswer:
    IDEAL = "React uses virtual DOM to improve performance and efficiently update the real DOM"

    def test_empty_answer_returns_zero(self):
        score, feedback = keyword_score_answer("", self.IDEAL)
        assert score == 0
        assert "chưa cung cấp" in feedback

    def test_whitespace_only_returns_zero(self):
        score, feedback = keyword_score_answer("   \n  ", self.IDEAL)
        assert score == 0

    def test_perfect_match_high_score(self):
        score, feedback = keyword_score_answer(self.IDEAL, self.IDEAL)
        assert score >= 80

    def test_partial_match_medium_score(self):
        score, feedback = keyword_score_answer("React uses virtual DOM", self.IDEAL)
        assert 20 <= score <= 80

    def test_totally_irrelevant_low_score(self):
        score, feedback = keyword_score_answer("Hôm nay thời tiết đẹp", self.IDEAL)
        assert score <= 30

    def test_score_in_range(self):
        """Điểm phải luôn trong [0, 100]."""
        test_cases = [
            ("", self.IDEAL),
            ("abc def ghi", self.IDEAL),
            (self.IDEAL * 10, self.IDEAL),
            ("completely unrelated nonsense text here", self.IDEAL),
        ]
        for answer, ideal in test_cases:
            score, _ = keyword_score_answer(answer, ideal)
            assert 0 <= score <= 100, f"Score {score} out of range for answer: {answer[:50]}"

    def test_score_floor_is_five_for_non_empty(self):
        score, _ = keyword_score_answer("xyzabc unrelated totally", self.IDEAL)
        assert score >= 5

    def test_ideal_has_no_tokens(self):
        """Nếu ideal_answer không có từ khóa, trả về 50."""
        score, feedback = keyword_score_answer("some answer", "a an the is")
        assert score == 50
        assert "Không thể đánh giá" in feedback

    def test_feedback_returns_string(self):
        _, feedback = keyword_score_answer("React virtual DOM performance", self.IDEAL)
        assert isinstance(feedback, str)
        assert len(feedback) > 0

    def test_length_bonus_for_long_answer(self):
        """Câu trả lời dài hơn nên có điểm cao hơn hoặc bằng."""
        short_ans = "React virtual DOM"
        long_ans = short_ans + " " + ("React virtual DOM update performance rendering efficiently " * 20)
        score_short, _ = keyword_score_answer(short_ans, self.IDEAL)
        score_long, _ = keyword_score_answer(long_ans, self.IDEAL)
        # Long answer with same keywords should have equal or higher score
        assert score_long >= score_short

    def test_async_score_falls_back_to_keyword_when_provider_disabled(self, monkeypatch):
        monkeypatch.setattr(scoring, "_deepseek_is_enabled", lambda: False)

        req = ScoringRequest(
            answer_text="React uses virtual DOM",
            ideal_answer=self.IDEAL,
            question_text="Virtual DOM trong React là gì?",
            role="frontend",
            level="junior",
            category="React",
            difficulty="medium",
        )
        score, feedback = asyncio.run(score_answer(req))
        assert 20 <= score <= 80
        assert isinstance(feedback, str)

    def test_async_score_uses_deepseek_response_when_available(self, monkeypatch):
        async def fake_llm(_request):
            return 88, "Summary: Strong answer"

        monkeypatch.setattr(scoring, "_deepseek_is_enabled", lambda: True)
        monkeypatch.setattr(scoring, "_score_with_deepseek", fake_llm)

        req = ScoringRequest(
            answer_text="I would explain reconciliation and DOM diffing.",
            ideal_answer=self.IDEAL,
            question_text="Virtual DOM trong React là gì?",
            role="frontend",
            level="junior",
            category="React",
            difficulty="medium",
        )
        score, feedback = asyncio.run(score_answer(req))
        assert score == 88
        assert feedback == "Summary: Strong answer"


class TestGenerateFeedback:
    def test_high_score_positive_message(self):
        matched = {"react", "virtual", "dom", "performance", "update"}
        ideal = matched.copy()
        answer = matched.copy()
        fb = _generate_feedback(90, matched, ideal, answer)
        assert "Tốt" in fb or "✅" in fb

    def test_medium_score_encouraging_message(self):
        matched = {"react", "virtual"}
        ideal = {"react", "virtual", "dom", "performance"}
        answer = {"react", "virtual", "other"}
        fb = _generate_feedback(60, matched, ideal, answer)
        assert "Khá tốt" in fb or "👍" in fb

    def test_low_score_improvement_message(self):
        matched = {"react"}
        ideal = {"react", "virtual", "dom", "performance", "update"}
        answer = {"react"}
        fb = _generate_feedback(20, matched, ideal, answer)
        assert "❌" in fb or "Cần cải thiện" in fb

    def test_missing_keywords_shown_in_feedback(self):
        matched = {"react"}
        ideal = {"react", "virtual", "dom"}
        answer = {"react"}
        fb = _generate_feedback(40, matched, ideal, answer)
        # Should mention missing keywords
        assert "virtual" in fb or "dom" in fb or "bổ sung" in fb.lower() or "cần" in fb.lower()
