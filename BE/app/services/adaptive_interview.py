from __future__ import annotations

import json
from typing import Any

from app.core.text_processing import sanitize_user_text
from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion
from app.services.scoring import ScoringRequest, score_answer


def follow_up_style_for_score(score: float) -> str:
    if score >= 7.0:
        return "deepen"
    if score >= 4.0:
        return "clarify"
    return "simplify"


def _telemetry_confidence(telemetry_data: dict[str, Any] | None) -> float | None:
    if not telemetry_data:
        return None
    confidence = telemetry_data.get("presentationConfidence")
    if isinstance(confidence, (int, float)):
        return float(confidence)
    return None


def follow_up_style_for_score_and_telemetry(
    score: float,
    telemetry_data: dict[str, Any] | None = None,
) -> str:
    style = follow_up_style_for_score(score)
    if style != "clarify":
        return style

    confidence = _telemetry_confidence(telemetry_data)
    if confidence is not None and confidence < 50:
        return "deepen"
    return style


def _fallback_follow_up_question(
    *,
    style: str,
    question_text: str,
    answer_text: str,
    language: str,
) -> str:
    question_text = sanitize_user_text(question_text).strip()
    answer_text = sanitize_user_text(answer_text).strip()

    if language == "vi":
        if style == "deepen":
            return f"Bạn có thể đào sâu thêm cơ chế hoặc trade-off đằng sau câu trả lời về: {question_text} không?"
        if style == "clarify":
            return f"Bạn có thể cho một ví dụ cụ thể để làm rõ câu trả lời của mình về: {question_text} không?"
        return f"Bạn hãy giải thích lại phần nền tảng của chủ đề này: {question_text}."

    if style == "deepen":
        return f"Can you go one level deeper into the mechanism or trade-off behind your answer to: {question_text}?"
    if style == "clarify":
        return f"Can you give a concrete example to clarify your answer to: {question_text}?"
    return f"Can you restate the core concept from the ground up for: {question_text}?"


def build_follow_up_generation_messages(
    *,
    question_text: str,
    answer_text: str,
    score: float,
    language: str,
    category: str,
    role: str,
    level: str,
    telemetry_data: dict[str, Any] | None = None,
) -> tuple[str, str]:
    style = follow_up_style_for_score_and_telemetry(score, telemetry_data)
    system_prompt = (
        "You are an AI interviewer that writes a single follow-up question. "
        "Stay concise, realistic, and strictly grounded in the candidate's actual answer."
    )
    if language == "vi":
        system_prompt += " Hãy trả lời bằng tiếng Việt."

    user_payload = {
        "instruction": "Generate one follow-up question only.",
        "style_bucket": style,
        "language": language,
        "role": role,
        "level": level,
        "category": category,
        "original_question": sanitize_user_text(question_text),
        "candidate_answer": sanitize_user_text(answer_text),
        "output_schema": {
            "follow_up_question_text": "string",
            "follow_up_reason": "string",
        },
        "rules": [
            "Do not repeat the original question verbatim.",
            "Do not add analysis or scoring text in the question field.",
            "Keep the follow-up to one question sentence.",
            "Match the style bucket: deepen, clarify, or simplify.",
        ],
    }
    user_prompt = json.dumps(user_payload, ensure_ascii=False)
    return system_prompt, user_prompt


async def generate_follow_up_question(
    *,
    question_text: str,
    answer_text: str,
    score: float,
    language: str,
    category: str,
    role: str,
    level: str,
    telemetry_data: dict[str, Any] | None = None,
) -> dict[str, str]:
    style = follow_up_style_for_score_and_telemetry(score, telemetry_data)
    system_prompt, user_prompt = build_follow_up_generation_messages(
        question_text=question_text,
        answer_text=answer_text,
        score=score,
        language=language,
        category=category,
        role=role,
        level=level,
        telemetry_data=telemetry_data,
    )

    try:
        response = await create_chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=256,
            temperature=0.2,
        )
        payload = json.loads(response["content"])
        question = sanitize_user_text(str(payload.get("follow_up_question_text") or "")).strip()
        reason = sanitize_user_text(str(payload.get("follow_up_reason") or "")).strip()
        if not question:
            raise ValueError("Empty follow-up question")
        return {
            "follow_up_style": style,
            "follow_up_question_text": question,
            "follow_up_reason": reason,
        }
    except (DeepSeekAPIError, ValueError, json.JSONDecodeError, Exception):
        fallback_question = _fallback_follow_up_question(
            style=style,
            question_text=question_text,
            answer_text=answer_text,
            language=language,
        )
        return {
            "follow_up_style": style,
            "follow_up_question_text": fallback_question,
            "follow_up_reason": "fallback",
        }


async def score_follow_up_answer(
    *,
    original_question_text: str,
    original_answer_text: str,
    follow_up_question_text: str,
    follow_up_answer_text: str,
    role: str,
    level: str,
    category: str,
    difficulty: str,
    major: str,
    preferred_language: str,
    force_language: bool,
    telemetry_data: dict[str, Any] | None = None,
    plan_tier: str = "pro",
) -> tuple[float, str]:
    combined_question_text = (
        f"Original question: {sanitize_user_text(original_question_text)}\n"
        f"Original answer: {sanitize_user_text(original_answer_text)}\n"
        f"Follow-up question: {sanitize_user_text(follow_up_question_text)}"
    )
    combined_ideal_answer = (
        "Evaluate how well the candidate responded to the follow-up question in the context of their original answer. "
        "Reward answers that deepen, clarify, correct, or extend the original response with concrete reasoning."
    )
    return await score_answer(
        ScoringRequest(
            answer_text=follow_up_answer_text,
            ideal_answer=combined_ideal_answer,
            question_text=combined_question_text,
            role=role,
            level=level,
            category=category,
            difficulty=difficulty,
            major=major,
            preferred_language=preferred_language,
            force_language=force_language,
            telemetry_data=telemetry_data,
            plan_tier=plan_tier,
        )
    )
