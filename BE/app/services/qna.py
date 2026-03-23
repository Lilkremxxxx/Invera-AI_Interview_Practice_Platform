from __future__ import annotations

import json
import re
from typing import Any

from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion


def _has_vietnamese(text: str) -> bool:
    return bool(re.search(r"[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]", text.lower()))


def _preferred_language(text: str) -> str:
    return "vi" if _has_vietnamese(text) else "en"


def _normalize_qna_response(raw: str, *, quoted_text: str | None, attachment_name: str | None, fallback_language: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("QnA response must be a JSON object.")

    result = {
        "language": parsed.get("language") if parsed.get("language") in {"vi", "en"} else fallback_language,
        "title": str(parsed.get("title") or "").strip(),
        "summary": str(parsed.get("summary") or "").strip(),
        "direct_answer": parsed.get("direct_answer") or [],
        "key_points": parsed.get("key_points") or [],
        "common_gaps": parsed.get("common_gaps") or [],
        "better_answer": parsed.get("better_answer") or [],
        "follow_up": parsed.get("follow_up") or [],
        "quoted_text": quoted_text or None,
        "attachment_name": attachment_name or None,
    }

    for key in ("direct_answer", "key_points", "common_gaps", "better_answer", "follow_up"):
        value = result[key]
        if not isinstance(value, list):
            result[key] = [str(value)]
        else:
            result[key] = [str(item).strip() for item in value if str(item).strip()]

    return result


async def answer_qna(
    *,
    user_message: str,
    quoted_text: str | None,
    attachment_name: str | None,
    attachment_text: str | None,
    conversation_history: list[dict[str, str]],
) -> dict[str, Any]:
    dominant_text = "\n".join(
        filter(
            None,
            [
                user_message,
                quoted_text or "",
                (attachment_text or "")[:1200],
            ],
        )
    )
    fallback_language = _preferred_language(dominant_text)

    system_prompt = """
You are Invera QnA, an interview-prep coach for Vietnamese students and early-career candidates.
Your job is to answer user questions about interview preparation, technical concepts, answer quality, or uploaded DOCX content.

You must keep the answer aligned with Invera's rubric principles:
- relevance to the exact question
- clear reasoning and structure
- specificity and practical examples
- trade-offs / risks when appropriate
- useful guidance for how the user should answer better in an interview

Return STRICT JSON only with this schema:
{
  "language": "vi" | "en",
  "title": "short title",
  "summary": "one short high-signal summary",
  "direct_answer": ["1-3 short paragraphs"],
  "key_points": ["3-6 bullets the user should mention or remember"],
  "common_gaps": ["0-5 common mistakes or missing points"],
  "better_answer": ["0-5 bullets for a stronger interview answer structure"],
  "follow_up": ["0-4 follow-up questions the user could ask next"]
}

Rules:
- Default to English unless the user clearly writes in Vietnamese.
- If quoted_text is provided, explain that excerpt directly and tie it back to better interview performance.
- If attachment_text is provided, use it as context but do not claim to have seen anything not present in the extracted text.
- Avoid markdown tables and avoid code fences.
- Keep the tone concise, specific, and coach-like rather than generic chatbot fluff.
""".strip()

    trimmed_history = conversation_history[-8:]
    user_payload = json.dumps(
        {
            "product": "Invera",
            "mode": "QnA",
            "user_message": user_message,
            "quoted_text": quoted_text,
            "attachment_name": attachment_name,
            "attachment_text_excerpt": (attachment_text or "")[:12000] if attachment_text else None,
            "conversation_history": trimmed_history,
            "rubric_focus": {
                "relevance": True,
                "clarity": True,
                "specificity": True,
                "tradeoffs_when_relevant": True,
                "interview_readiness": True,
            },
        },
        ensure_ascii=False,
    )

    response = await create_chat_completion(system_prompt=system_prompt, user_prompt=user_payload)
    return _normalize_qna_response(
        response["content"],
        quoted_text=quoted_text,
        attachment_name=attachment_name,
        fallback_language=fallback_language,
    )


def assistant_preview_text(structured_payload: dict[str, Any]) -> str:
    summary = str(structured_payload.get("summary") or "").strip()
    if summary:
        return summary

    direct_answer = structured_payload.get("direct_answer") or []
    if isinstance(direct_answer, list) and direct_answer:
        return str(direct_answer[0]).strip()

    return "QnA response"
