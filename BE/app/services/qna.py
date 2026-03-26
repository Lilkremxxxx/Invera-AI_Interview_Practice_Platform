from __future__ import annotations

from dataclasses import dataclass
import json
import re
import unicodedata
from typing import Any

from app.core.config import settings
from app.services.deepseek_client import create_chat_completion


QNA_REFUSAL_MESSAGE = {
    "vi": (
        "Tôi chỉ là Agent hỗ trợ bạn trong việc cải thiện câu trả lời. "
        "Hãy gửi câu hỏi hoặc câu trả lời liên quan đến nội dung phỏng vấn, rubric, hoặc bài học để tôi hỗ trợ tiếp."
    ),
    "en": (
        "I am only an agent that helps improve interview answers. "
        "Please send a question or answer related to interview content, the rubric, or lesson material so I can help."
    ),
}

INTERVIEW_HINTS = {
    "interview", "phong van", "rubric", "feedback", "score", "scoring", "hr", "recruiter", "recruitment",
    "answer", "cau tra loi", "improve", "cai thien", "rewrite", "viet lai", "review", "danh gia", "phan tich",
    "giai thich", "explain", "compare", "difference", "trade-off", "tradeoff", "example", "vi du", "lesson",
    "bai hoc", "docx", "selected text", "selected_text", "resume", "cv",
}
TECH_HINTS = {
    "api", "rest", "graphql", "sql", "database", "postgres", "mysql", "mongodb", "redis", "cache", "queue",
    "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "react", "vue", "angular", "javascript", "typescript",
    "python", "java", "golang", "fastapi", "django", "spring", "node", "http", "https", "cors", "jwt", "oauth",
    "websocket", "sse", "tcp", "udp", "thread", "async", "await", "microservice", "system design", "architecture",
    "index", "join", "orm", "algorithm", "complexity", "big o", "oop", "solid", "linux", "git", "ci/cd", "devops",
    "ai", "llm", "machine learning", "deep learning",
}
CONTEXT_ACTION_HINTS = {
    "explain", "summarize", "rewrite", "review", "improve", "translate", "score", "analyze", "fix",
    "giai thich", "tom tat", "viet lai", "danh gia", "cai thien", "dich", "cham", "phan tich", "sua",
}
OFFTOPIC_HINTS = {
    "joke", "funny", "story", "movie", "music", "song", "weather", "horoscope", "dating", "boyfriend",
    "girlfriend", "game", "football", "soccer", "news", "politics", "meme", "ke chuyen", "ke chuyen cuoi",
    "thoi tiet", "tu vi", "hen ho", "nguoi yeu", "bong da", "tin tuc", "chinh tri",
}
GREETING_ONLY = {
    "hi", "hello", "hey", "yo", "alo", "aloha", "xin chao", "chao", "chao ban", "good morning", "good evening",
}
HARD_BLOCK_PATTERNS = [
    r"\btoi bi ngu\b",
    r"\btui bi ngu\b",
    r"\bngu qua\b",
    r"\bi am stupid\b",
    r"\bi'm stupid\b",
    r"\bi am dumb\b",
    r"\bi'm dumb\b",
]


@dataclass(frozen=True)
class QnaScopeDecision:
    allowed: bool
    language: str


def _normalize_text(text: str | None) -> str:
    normalized = unicodedata.normalize("NFD", (text or "").strip().lower())
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    normalized = normalized.replace("đ", "d")
    return re.sub(r"\s+", " ", normalized)


def _has_vietnamese(text: str) -> bool:
    return bool(re.search(r"[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]", text.lower()))


def _preferred_language(text: str) -> str:
    return "vi" if _has_vietnamese(text) else "en"


def _contains_any(haystack: str, needles: set[str]) -> bool:
    return any(needle in haystack for needle in needles)


def _looks_like_greeting_only(normalized_message: str) -> bool:
    stripped = normalized_message.strip("!?. ")
    return stripped in GREETING_ONLY


def _looks_contextual(normalized_message: str, has_context: bool) -> bool:
    if not has_context:
        return False
    if not normalized_message:
        return True
    if _contains_any(normalized_message, CONTEXT_ACTION_HINTS):
        return True
    return len(normalized_message.split()) <= 10


def evaluate_qna_scope(
    *,
    user_message: str,
    quoted_text: str | None,
    attachment_text: str | None,
) -> QnaScopeDecision:
    combined = "\n".join(filter(None, [user_message, quoted_text or "", (attachment_text or "")[:400]]))
    language = _preferred_language(combined)
    normalized_message = _normalize_text(user_message)
    has_context = bool((quoted_text or "").strip() or (attachment_text or "").strip())

    if any(re.search(pattern, normalized_message) for pattern in HARD_BLOCK_PATTERNS):
        return QnaScopeDecision(allowed=False, language=language)

    if _looks_contextual(normalized_message, has_context):
        return QnaScopeDecision(allowed=True, language=language)

    if _looks_like_greeting_only(normalized_message):
        return QnaScopeDecision(allowed=False, language=language)

    has_interview_signal = _contains_any(normalized_message, INTERVIEW_HINTS)
    has_technical_signal = _contains_any(normalized_message, TECH_HINTS)
    has_offtopic_signal = _contains_any(normalized_message, OFFTOPIC_HINTS)

    if has_offtopic_signal and not (has_interview_signal or has_technical_signal or has_context):
        return QnaScopeDecision(allowed=False, language=language)

    if has_interview_signal or has_technical_signal:
        return QnaScopeDecision(allowed=True, language=language)

    if has_context and len(normalized_message.split()) <= 14:
        return QnaScopeDecision(allowed=True, language=language)

    if len(normalized_message.split()) <= 4:
        return QnaScopeDecision(allowed=False, language=language)

    return QnaScopeDecision(allowed=False, language=language)


def qna_scope_refusal(
    *,
    user_message: str,
    quoted_text: str | None,
    attachment_name: str | None,
    language: str | None = None,
) -> dict[str, Any]:
    resolved_language = language or _preferred_language("\n".join(filter(None, [user_message, quoted_text or ""])))
    summary = QNA_REFUSAL_MESSAGE[resolved_language]

    if resolved_language == "vi":
        return {
            "language": "vi",
            "title": "Ngoài phạm vi QnA",
            "summary": summary,
            "direct_answer": [summary],
            "key_points": [
                "Bạn có thể hỏi cách cải thiện câu trả lời phỏng vấn.",
                "Bạn có thể hỏi về rubric, selected text, hoặc DOCX đã upload.",
                "Bạn có thể hỏi cách giải thích một khái niệm kỹ thuật để trả lời phỏng vấn tốt hơn.",
            ],
            "common_gaps": [],
            "better_answer": [],
            "follow_up": [
                "Hãy giúp mình cải thiện câu trả lời này theo rubric.",
                "Giải thích giúp mình khái niệm này theo cách để trả lời phỏng vấn.",
            ],
            "quoted_text": quoted_text or None,
            "attachment_name": attachment_name or None,
        }

    return {
        "language": "en",
        "title": "Outside QnA scope",
        "summary": summary,
        "direct_answer": [summary],
        "key_points": [
            "You can ask how to improve an interview answer.",
            "You can ask about the rubric, selected text, or uploaded DOCX content.",
            "You can ask for a technical concept explained in interview-ready language.",
        ],
        "common_gaps": [],
        "better_answer": [],
        "follow_up": [
            "Help me improve this interview answer using the rubric.",
            "Explain this concept in a way that sounds strong in an interview.",
        ],
        "quoted_text": quoted_text or None,
        "attachment_name": attachment_name or None,
    }


def _attachment_excerpt(attachment_text: str | None, quoted_text: str | None) -> str | None:
    if not attachment_text:
        return None

    compact_attachment = re.sub(r"\s+", " ", attachment_text).strip()
    if len(compact_attachment) <= 2200:
        return compact_attachment

    compact_quote = re.sub(r"\s+", " ", quoted_text or "").strip()
    if compact_quote:
        needle = compact_quote[:180].lower()
        index = compact_attachment.lower().find(needle)
        if index >= 0:
            start = max(0, index - 700)
            end = min(len(compact_attachment), index + len(needle) + 700)
            return compact_attachment[start:end]

    return compact_attachment[:2200]


def _normalize_qna_response(
    raw: str,
    *,
    quoted_text: str | None,
    attachment_name: str | None,
    fallback_language: str,
) -> dict[str, Any]:
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
    scope = evaluate_qna_scope(
        user_message=user_message,
        quoted_text=quoted_text,
        attachment_text=attachment_text,
    )
    if not scope.allowed:
        return qna_scope_refusal(
            user_message=user_message,
            quoted_text=quoted_text,
            attachment_name=attachment_name,
            language=scope.language,
        )

    dominant_text = "\n".join(filter(None, [user_message, quoted_text or "", (attachment_text or "")[:400]]))
    fallback_language = _preferred_language(dominant_text)

    system_prompt = """
You are Invera QnA, a bounded interview-answer coach.

Allowed scope:
- interview answers, rubric-based feedback, answer improvement
- interview-ready explanations of technical concepts
- selected quoted text
- uploaded DOCX lesson or study content

Blocked scope:
- casual chat, greetings, jokes, self-talk, insults, unrelated life topics, entertainment, or random requests

If the request is outside scope, return JSON that uses the refusal message exactly in the user's language and do not answer the off-topic content.

Return STRICT JSON only:
{
  "language": "vi" | "en",
  "title": "short title",
  "summary": "one short summary",
  "direct_answer": ["1-3 short paragraphs"],
  "key_points": ["2-5 bullets"],
  "common_gaps": ["0-4 bullets"],
  "better_answer": ["0-4 bullets"],
  "follow_up": ["0-3 bullets"]
}

Rules:
- Default to English unless the user clearly writes in Vietnamese.
- If quoted_text is present, explain it directly and connect it to a stronger interview answer.
- If attachment_text_excerpt is present, only use that excerpt as context.
- Stay concise and specific. No markdown tables, no code fences.
""".strip()

    trimmed_history = [
        {"role": item["role"], "content": item["content"][:500]}
        for item in conversation_history[-6:]
        if item.get("content")
    ]
    user_payload = json.dumps(
        {
            "product": "Invera",
            "mode": "QnA",
            "user_message": user_message,
            "quoted_text": quoted_text,
            "attachment_name": attachment_name,
            "attachment_text_excerpt": _attachment_excerpt(attachment_text, quoted_text),
            "conversation_history": trimmed_history,
            "out_of_scope_refusal": {
                "vi": QNA_REFUSAL_MESSAGE["vi"],
                "en": QNA_REFUSAL_MESSAGE["en"],
            },
        },
        ensure_ascii=False,
    )

    response = await create_chat_completion(
        system_prompt=system_prompt,
        user_prompt=user_payload,
        max_tokens=settings.deepseek_qna_max_tokens,
        timeout_seconds=settings.deepseek_qna_timeout_seconds,
        temperature=0.2,
    )
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


def fallback_qna_answer(
    *,
    user_message: str,
    quoted_text: str | None,
    attachment_name: str | None,
    attachment_text: str | None = None,
    fallback_language: str | None = None,
    scope_allowed: bool | None = None,
) -> dict[str, Any]:
    scope = evaluate_qna_scope(
        user_message=user_message,
        quoted_text=quoted_text,
        attachment_text=attachment_text,
    )
    language = fallback_language or scope.language or _preferred_language("\n".join(filter(None, [user_message, quoted_text or ""])))

    if scope_allowed is False or not scope.allowed:
        return qna_scope_refusal(
            user_message=user_message,
            quoted_text=quoted_text,
            attachment_name=attachment_name,
            language=language,
        )

    if language == "vi":
        summary = "AI đang tạm thời không phản hồi ổn định, nên Invera trả về bản hướng dẫn ngắn để bạn tiếp tục cải thiện câu trả lời."
        direct_answer = [
            "Mình đã nhận được câu hỏi của bạn, nhưng dịch vụ AI hiện chưa phản hồi ổn định.",
            "Hãy tiếp tục gửi câu hỏi theo hướng interview: trả lời trực tiếp, giải thích lý do, thêm ví dụ, và nêu trade-off khi cần.",
        ]
        key_points = [
            "Bám sát đúng câu hỏi gốc.",
            "Nêu rõ lý do, cơ chế, hoặc cách bạn ra quyết định.",
            "Bổ sung ví dụ, kết quả, hoặc trade-off để tăng sức thuyết phục.",
        ]
        common_gaps = [
            "Trả lời quá ngắn và không giải thích vì sao.",
            "Nói khái niệm nhưng không gắn vào tình huống phỏng vấn.",
        ]
        better_answer = [
            "Mở đầu bằng câu trả lời trực tiếp.",
            "Thêm 2-3 ý giải thích ngắn gọn.",
            "Kết bằng ví dụ hoặc lưu ý quan trọng.",
        ]
        follow_up = [
            "Hãy thử gửi lại sau ít phút để nhận bản phân tích AI đầy đủ.",
            "Bạn cũng có thể hỏi lại theo dạng: explain, improve, compare, or rewrite for interview.",
        ]
        title = "Temporary QnA fallback"
    else:
        summary = "The AI service is temporarily unstable, so Invera returned a short coaching fallback."
        direct_answer = [
            "Your question was received, but the AI service is not responding reliably right now.",
            "Please keep the prompt interview-focused: direct answer, reasoning, example, and trade-off when relevant.",
        ]
        key_points = [
            "Stay close to the original interview question.",
            "Explain the reasoning or mechanism clearly.",
            "Add an example, outcome, or trade-off to sound stronger.",
        ]
        common_gaps = [
            "Answering too briefly without explaining why.",
            "Describing a concept without framing it for interview communication.",
        ]
        better_answer = [
            "Start with the direct answer.",
            "Add 2-3 short reasoning points.",
            "Close with an example or caveat.",
        ]
        follow_up = [
            "Try again in a few minutes for the full AI answer.",
            "You can also ask again using explain, improve, compare, or rewrite for interview.",
        ]
        title = "Temporary QnA fallback"

    return {
        "language": language,
        "title": title,
        "summary": summary,
        "direct_answer": direct_answer,
        "key_points": key_points,
        "common_gaps": common_gaps,
        "better_answer": better_answer,
        "follow_up": follow_up,
        "quoted_text": quoted_text or None,
        "attachment_name": attachment_name or None,
    }
