import asyncio

from app.services.adaptive_interview import follow_up_style_for_score_and_telemetry, generate_follow_up_question
from app.services.payment_orders import delete_stale_pending_payment_orders
from app.services.scoring import ScoringRequest, score_answer
from app.services.transcript_cleanup import _cleanup_is_plausible, correct_transcript_text


def test_scoring_regression_keeps_answer_scores_in_bounds():
    score, feedback = asyncio.run(
        score_answer(
            ScoringRequest(
                answer_text="I used a cache and a queue to keep the API responsive.",
                ideal_answer="Describe a practical performance optimization with trade-offs.",
                question_text="How did you improve performance?",
                role="backend",
                level="junior",
                category="Performance",
                difficulty="medium",
                major="technology",
                preferred_language="en",
                force_language=False,
                telemetry_data=None,
                plan_tier="pro",
            )
        )
    )

    assert 0.0 <= score <= 10.0
    assert feedback


def test_transcript_cleanup_plausibility_rejects_question_copying():
    assert not _cleanup_is_plausible(
        "event listener callback",
        "How does event listener callback work?",
        "How does event listener callback work?",
    )


def test_adaptive_follow_up_uses_telemetry_to_deepen_clarify_bucket():
    assert follow_up_style_for_score_and_telemetry(4.5, {"presentationConfidence": 35}) == "deepen"


def test_payment_order_cleanup_deletes_only_stale_pending_rows():
    class FakeDb:
        async def fetch(self, query, *params):
            assert "DELETE FROM payment_orders" in query
            assert params == (72,)
            return [{"id": 1}, {"id": 2}]

    deleted = asyncio.run(delete_stale_pending_payment_orders(FakeDb()))

    assert deleted == 2
