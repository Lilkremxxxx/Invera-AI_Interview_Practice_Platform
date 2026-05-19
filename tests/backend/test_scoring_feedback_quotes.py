import os
import sys
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.services.scoring import (
    ScoringRequest,
    _fill_missing_criterion_quotes,
    _format_feedback,
    _heuristic_result,
    score_answer,
)


def test_format_feedback_includes_candidate_quote_for_each_criterion():
    feedback = _format_feedback(
        {
            "language": "vi",
            "summary": "Có nền tảng nhưng cần cụ thể hơn.",
            "criteria": [
                {
                    "name": "Kiến thức và độ chính xác kỹ thuật",
                    "assessment": "mixed",
                    "quote": "Em sẽ dùng cache để giảm latency.",
                    "evidence": "Ý này đúng hướng nhưng chưa nói loại cache và invalidation.",
                    "missing": "Bổ sung ràng buộc, edge case, và cách kiểm soát cache stale.",
                }
            ],
        }
    )

    assert "Trích dẫn: “Em sẽ dùng cache để giảm latency.”" in feedback
    assert "Đánh giá: Ý này đúng hướng nhưng chưa nói loại cache và invalidation." in feedback
    assert "Thiếu: Bổ sung ràng buộc, edge case, và cách kiểm soát cache stale." in feedback


def test_heuristic_feedback_quotes_actual_candidate_answer_text():
    request = ScoringRequest(
        answer_text=(
            "Em sẽ dùng cache nhiều tầng để giảm p95 latency. "
            "Đầu tiên đo baseline, sau đó thêm Redis cache và theo dõi hit rate."
        ),
        ideal_answer="Discuss baseline, caching, observability, invalidation, and rollout risks.",
        question_text="Bạn sẽ giảm p95 latency cho API gợi ý sản phẩm như thế nào?",
        role="backend",
        level="junior",
        category="system design",
        difficulty="medium",
        major="technology",
        preferred_language="vi",
    )

    result = _heuristic_result(request)
    feedback = _format_feedback(result)

    assert "Trích dẫn: “Em sẽ dùng cache nhiều tầng để giảm p95 latency." in feedback
    assert "Đánh giá:" in feedback


def test_feedback_summary_is_not_over_positive_when_any_criterion_is_weak():
    feedback = _format_feedback(
        {
            "language": "vi",
            "score": 6.8,
            "summary": "Câu trả lời khá tốt và đáng tin.",
            "criteria": [
                {
                    "name": "Bám sát câu hỏi",
                    "assessment": "strong",
                    "quote": "Em sẽ dùng cache.",
                    "evidence": "Đúng hướng.",
                    "missing": "Cần rõ hơn.",
                },
                {
                    "name": "Độ sâu và judgment",
                    "assessment": "weak",
                    "quote": "Em sẽ dùng cache.",
                    "evidence": "Chưa nêu trade-off hoặc rủi ro.",
                    "missing": "Bổ sung invalidation, rollback, và stale data risk.",
                },
            ],
        }
    )

    first_line = feedback.splitlines()[0]
    assert "khá tốt" not in first_line.lower()
    assert "đáng tin" not in first_line.lower()
    assert "tiêu chí yếu" in first_line.lower()
    assert "Độ sâu và judgment" in first_line


def test_quote_repair_rejects_question_text_and_uses_distinct_answer_excerpts():
    answer_text = (
        "Responsive design giúp giao diện thích nghi với nhiều kích thước màn hình. "
        "Em thường dùng CSS media queries, flexible grid và relative units. "
        "Ví dụ trên mobile em ưu tiên nội dung chính trước rồi mới hiển thị sidebar. "
        "Trade-off là phải test nhiều breakpoint để tránh layout bị vỡ."
    )
    result = {
        "criteria": [
            {"name": "Bám sát câu hỏi", "quote": "Responsive design là gì?"},
            {"name": "Độ rõ ràng và lập luận", "quote": "Responsive design là gì?"},
            {"name": "Tính cụ thể", "quote": "Responsive design là gì?"},
            {"name": "Độ sâu và judgment", "quote": "Responsive design là gì?"},
        ]
    }

    repaired = _fill_missing_criterion_quotes(result, answer_text)
    quotes = [item["quote"] for item in repaired["criteria"]]

    assert "Responsive design là gì?" not in quotes
    assert len(set(quotes)) >= 3
    assert all(quote in answer_text for quote in quotes)


def test_forced_english_language_keeps_english_feedback_for_vietnamese_answer():
    request = ScoringRequest(
        answer_text="Em sẽ dùng media query và flexible layout để giao diện tự thích nghi.",
        ideal_answer="Responsive design adapts layouts across viewport sizes using flexible grids, media queries, and testing.",
        question_text="What is responsive design?",
        role="frontend",
        level="intern",
        category="CSS",
        difficulty="easy",
        major="technology",
        preferred_language="en",
        force_language=True,
    )

    result = _heuristic_result(request)
    feedback = _format_feedback(result)

    assert result["language"] == "en"
    assert "Summary:" in feedback
    assert "Tóm tắt:" not in feedback


def test_score_answer_forced_english_short_answer_is_not_vietnamese_guard():
    score, feedback = asyncio.run(score_answer(
        ScoringRequest(
            answer_text="Em dùng media query.",
            ideal_answer="Responsive design adapts layouts across viewport sizes.",
            question_text="What is responsive design?",
            role="frontend",
            level="intern",
            category="CSS",
            difficulty="easy",
            major="technology",
            preferred_language="en",
            force_language=True,
        )
    ))

    assert score > 0
    assert "The answer is too short" in feedback
    assert "Câu trả lời quá ngắn" not in feedback
