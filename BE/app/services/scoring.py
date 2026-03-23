from __future__ import annotations

"""
Rubric-driven scorer cho interview answers.

- Ưu tiên gọi DeepSeek (`deepseek-reasoner`) với prompt bám rubric của Invera.
- Tự động fallback về keyword matching nếu provider không khả dụng.
"""

from dataclasses import dataclass
import json
import logging
import re
from typing import Any, Tuple

from app.core.config import settings
from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ScoringRequest:
    answer_text: str
    ideal_answer: str
    question_text: str
    role: str
    level: str
    category: str
    difficulty: str


def _tokenize(text: str) -> set[str]:
    """Tách từ, lowercase, loại bỏ stopwords ngắn và ký tự đặc biệt."""
    text = text.lower()
    tokens = re.findall(r'\b[\w]+\b', text)
    stopwords = {'là', 'và', 'của', 'các', 'có', 'trong', 'được', 'cho', 'với',
                 'về', 'một', 'những', 'này', 'khi', 'từ', 'không', 'để', 'theo',
                 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'or',
                 'and', 'it', 'its', 'this', 'that', 'i', 'you', 'we', 'they'}
    return {t for t in tokens if len(t) > 2 and t not in stopwords}


def keyword_score_answer(answer_text: str, ideal_answer: str) -> Tuple[int, str]:
    """
    Tính điểm bằng keyword matching.
    Returns: (score 0-100, feedback string)
    """
    if not answer_text.strip():
        return 0, "Bạn chưa cung cấp câu trả lời. Hãy thử lại!"

    ideal_tokens = _tokenize(ideal_answer)
    answer_tokens = _tokenize(answer_text)

    if not ideal_tokens:
        return 50, "Không thể đánh giá tự động câu trả lời này."

    matched = ideal_tokens & answer_tokens
    match_ratio = len(matched) / len(ideal_tokens)

    # Bonus điểm nếu câu trả lời đủ dài (thể hiện chi tiết)
    length_bonus = min(0.1, len(answer_text) / 2000)
    raw_score = min(1.0, match_ratio + length_bonus)

    score = int(raw_score * 100)
    score = max(5, min(100, score))  # floor 5, cap 100

    feedback = _generate_feedback(score, matched, ideal_tokens, answer_tokens)
    return score, feedback


def _detect_question_type(category: str, question_text: str) -> str:
    haystack = f"{category} {question_text}".lower()
    if any(token in haystack for token in ("hành vi", "behavior", "behavioral", "soft skill")):
        return "behavioral"
    if any(token in haystack for token in ("system design", "thiết kế hệ thống", "architecture", "kiến trúc")):
        return "system_design"
    if any(token in haystack for token in ("database", "sql", "schema", "index", "cơ sở dữ liệu")):
        return "database"
    if any(token in haystack for token in ("algorithm", "dsa", "thuật toán", "complexity")):
        return "algorithm"
    return "technical_general"


def _rubric_prompt(question_type: str, level: str) -> str:
    type_specific = {
        "behavioral": (
            "Behavioral rubric: relevance to scenario, STAR structure, ownership/decision-making, "
            "measurable result or reflection, communication clarity."
        ),
        "system_design": (
            "System-design rubric: requirements/constraints framing, architecture decomposition, "
            "scalability/reliability/data flow, trade-offs/risks, prioritization."
        ),
        "database": (
            "Database rubric: data-model correctness, query/index reasoning, "
            "consistency/performance trade-offs, edge cases/operations."
        ),
        "algorithm": (
            "Algorithm rubric: approach selection, correctness, complexity analysis, "
            "edge cases, explanation clarity."
        ),
        "technical_general": (
            "Technical rubric: technical correctness, reasoning, completeness, "
            "specificity/examples, trade-offs/caveats."
        ),
    }[question_type]

    return f"""You are Invera's interview evaluator.

Evaluate one mock-interview answer using an evidence-based rubric.
Do not invent any experience, metrics, or implementation details not present in the answer.

Context:
- Target seniority: {level}
- Question type hint: {question_type}

Calibration:
- intern: focus on fundamentals, clarity, basic correctness
- junior: expect correct reasoning, examples, awareness of trade-offs
- mid: expect depth, prioritization, risks, and stronger judgment

Always check:
1. relevance to the prompt
2. structure and reasoning clarity
3. specificity / evidence
4. trade-offs / risks when appropriate

{type_specific}

Return STRICT JSON only with this schema:
{{
  "language": "vi" | "en",
  "question_type": "{question_type}",
  "score": 0,
  "summary": "short evidence-based assessment",
  "criteria": [
    {{
      "name": "criterion name",
      "assessment": "strong | mixed | weak",
      "evidence": "observed evidence from the answer",
      "missing": "what is missing"
    }}
  ],
  "strengths": ["max 3 short bullets"],
  "gaps": ["max 4 short bullets"],
  "improvements": ["max 3 prioritized actions"],
  "better_outline": ["max 4 short steps"],
  "follow_up": ["max 3 short follow-up questions"]
}}

Rules:
- Use the provided question_type hint unless clearly impossible.
- Keep output concise and high-signal.
- Choose output language from the dominant language of the question and answer.
"""


def _language_has_vietnamese(text: str) -> bool:
    return bool(re.search(r"[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]", text.lower()))


def _format_feedback(result: dict[str, Any]) -> str:
    language = "vi" if result.get("language") == "vi" else "en"
    labels = {
        "vi": {
            "summary": "Tóm tắt",
            "criteria": "Tiêu chí chấm",
            "strengths": "Điểm tốt",
            "gaps": "Thiếu / còn yếu",
            "improvements": "Ưu tiên cải thiện",
            "outline": "Khung trả lời tốt hơn",
            "follow_up": "Câu hỏi follow-up",
        },
        "en": {
            "summary": "Summary",
            "criteria": "Scoring criteria",
            "strengths": "Strengths",
            "gaps": "Gaps",
            "improvements": "Priority improvements",
            "outline": "Stronger answer outline",
            "follow_up": "Follow-up questions",
        },
    }[language]

    lines: list[str] = []
    summary = str(result.get("summary") or "").strip()
    if summary:
        lines.append(f"{labels['summary']}: {summary}")

    criteria = result.get("criteria") or []
    if isinstance(criteria, list) and criteria:
        lines.append("")
        lines.append(f"{labels['criteria']}:")
        for item in criteria[:5]:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            assessment = str(item.get("assessment") or "").strip()
            evidence = str(item.get("evidence") or "").strip()
            missing = str(item.get("missing") or "").strip()
            bits = [bit for bit in [name, assessment] if bit]
            title = " - ".join(bits) if bits else "Criterion"
            detail_parts = []
            if evidence:
                detail_parts.append(evidence)
            if missing:
                detail_parts.append(missing)
            detail = " | ".join(detail_parts)
            lines.append(f"- {title}: {detail}".rstrip(": "))

    for key, label in (
        ("strengths", labels["strengths"]),
        ("gaps", labels["gaps"]),
        ("improvements", labels["improvements"]),
        ("better_outline", labels["outline"]),
        ("follow_up", labels["follow_up"]),
    ):
        values = result.get(key) or []
        if not isinstance(values, list) or not values:
            continue
        lines.append("")
        lines.append(f"{label}:")
        for value in values[:5]:
            text = str(value).strip()
            if text:
                lines.append(f"- {text}")

    feedback = "\n".join(lines).strip()
    return feedback or ("Không thể tạo feedback chi tiết." if language == "vi" else "Unable to generate detailed feedback.")


def _normalize_model_response(content: str, request: ScoringRequest) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    result = json.loads(cleaned)
    if not isinstance(result, dict):
        raise ValueError("DeepSeek scoring output must be a JSON object.")

    score = result.get("score")
    if not isinstance(score, int):
        if isinstance(score, float):
            score = int(round(score))
        elif isinstance(score, str) and score.strip().isdigit():
            score = int(score.strip())
        else:
            raise ValueError("DeepSeek scoring output is missing an integer score.")

    result["score"] = max(0, min(100, score))
    result["question_type"] = result.get("question_type") or _detect_question_type(
        request.category,
        request.question_text,
    )

    if result.get("language") not in {"vi", "en"}:
        result["language"] = (
            "vi"
            if _language_has_vietnamese(
                f"{request.question_text}\n{request.answer_text}\n{result.get('summary', '')}"
            )
            else "en"
        )

    for key in ("criteria", "strengths", "gaps", "improvements", "better_outline", "follow_up"):
        value = result.get(key)
        if value is None:
            result[key] = []
        elif not isinstance(value, list):
            result[key] = [str(value)]

    result["summary"] = str(result.get("summary") or "").strip()
    return result


async def _score_with_deepseek(request: ScoringRequest) -> Tuple[int, str]:
    question_type = _detect_question_type(request.category, request.question_text)
    user_payload = json.dumps(
        {
            "product": "Invera",
            "objective": "Score a mock-interview answer and generate actionable feedback.",
            "candidate_context": {
                "target_role": request.role,
                "seniority_level": request.level,
            },
            "question": {
                "text": request.question_text,
                "category": request.category,
                "difficulty": request.difficulty,
                "question_type_hint": question_type,
            },
            "reference_answer": request.ideal_answer,
            "candidate_answer": request.answer_text,
            "rubric_contract": {
                "must_be_evidence_based": True,
                "must_not_require_verbatim_match_with_reference_answer": True,
                "must_return_priority_improvements": True,
                "must_return_follow_up_questions": True,
            },
        },
        ensure_ascii=False,
    )
    response = await create_chat_completion(
        system_prompt=_rubric_prompt(question_type, request.level),
        user_prompt=user_payload,
    )
    normalized = _normalize_model_response(response["content"], request)
    return normalized["score"], _format_feedback(normalized)


async def score_answer(request: ScoringRequest) -> Tuple[int, str]:
    if not request.answer_text.strip():
        return 0, "Bạn chưa cung cấp câu trả lời. Hãy thử lại!"

    if _deepseek_is_enabled():
        try:
            return await _score_with_deepseek(request)
        except (DeepSeekAPIError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("DeepSeek scoring failed; falling back to keyword scorer: %s", exc)
        except Exception:
            logger.exception("Unexpected DeepSeek scoring failure; falling back to keyword scorer.")

    return keyword_score_answer(request.answer_text, request.ideal_answer)


def _deepseek_is_enabled() -> bool:
    return bool(settings.deepseek_enabled and settings.deepseek_api_key)


def _generate_feedback(score: int, matched: set, ideal_tokens: set, answer_tokens: set) -> str:
    missing = ideal_tokens - answer_tokens
    missing_sample = list(missing)[:5]

    if score >= 80:
        base = "✅ Tốt! Câu trả lời của bạn bao phủ được hầu hết các điểm chính."
        if missing_sample:
            base += f" Có thể bổ sung thêm về: {', '.join(missing_sample)}."
    elif score >= 55:
        base = "👍 Khá tốt! Bạn đã đề cập được nhiều điểm quan trọng."
        if missing_sample:
            base += f" Cần bổ sung thêm: {', '.join(missing_sample)}."
        base += " Hãy cung cấp nhiều ví dụ cụ thể hơn."
    elif score >= 35:
        base = "📝 Cần cải thiện. Câu trả lời còn thiếu nhiều điểm quan trọng."
        if missing_sample:
            base += f" Các từ khóa cần đề cập: {', '.join(missing_sample)}."
        base += " Hãy nghiên cứu thêm và trả lời chi tiết hơn."
    else:
        base = "❌ Cần cải thiện nhiều. Câu trả lời chưa đáp ứng yêu cầu của câu hỏi."
        if missing_sample:
            base += f" Hãy tìm hiểu về: {', '.join(missing_sample)}."
        base += " Xem lại lý thuyết và thực hành thêm."

    return base
