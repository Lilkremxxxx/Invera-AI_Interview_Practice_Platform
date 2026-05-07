from __future__ import annotations

import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Callable

from app.core.config import settings

logger = logging.getLogger(__name__)

TtsGenerator = Callable[[str, Path], None]


def _clamp_script(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= settings.kitten_tts_max_chars:
        return normalized
    return f"{normalized[: settings.kitten_tts_max_chars].rsplit(' ', 1)[0]}."


def _extract_priority_improvement(feedback: str) -> str | None:
    for line in feedback.splitlines():
        cleaned = line.strip().lstrip("-• ").strip()
        if not cleaned:
            continue
        lower = cleaned.lower()
        if lower.startswith(("summary:", "tóm tắt:", "scoring criteria:", "tiêu chí chấm:")):
            continue
        if cleaned.endswith(":"):
            continue
        if len(cleaned) >= 12:
            return cleaned.rstrip(".")
    return None


def _english_score_message(score: float) -> str:
    if score >= 8.5:
        return "This is a strong interview answer. Keep the clear structure and concrete judgment."
    if score >= 6.5:
        return "This is a credible answer. Add sharper evidence and trade-offs to make it more convincing."
    if score >= 4.0:
        return "This answer has a usable foundation, but it needs more depth, structure, and specifics."
    return "This answer is still weak for interview use. Start by answering the question directly, then add one concrete example."


def _vietnamese_score_message(score: float) -> str:
    if score >= 8.5:
        return "Đây là câu trả lời mạnh khi phỏng vấn. Hãy giữ cấu trúc rõ và phần đánh giá có chiều sâu."
    if score >= 6.5:
        return "Đây là câu trả lời khá đáng tin. Hãy thêm dẫn chứng rõ hơn và nêu trade-off để thuyết phục hơn."
    if score >= 4.0:
        return "Câu trả lời có nền tảng, nhưng cần thêm độ sâu, cấu trúc, và ví dụ cụ thể."
    return "Câu trả lời hiện còn yếu cho phỏng vấn. Hãy trả lời trực tiếp câu hỏi trước, rồi thêm một ví dụ cụ thể."


def build_feedback_tts_script(*, score: float, feedback: str) -> str:
    score_text = f"{score:.1f}"
    improvement = _extract_priority_improvement(feedback)
    english_improvement = f"One priority improvement: {improvement}." if improvement else "Review the written rubric feedback for the next concrete improvement."
    vietnamese_improvement = (
        f"Một ưu tiên cần cải thiện: {improvement}."
        if improvement
        else "Hãy xem phần nhận xét theo rubric để biết bước cải thiện cụ thể tiếp theo."
    )

    return _clamp_script(
        " ".join(
            [
                "English feedback.",
                f"Your rubric score is {score_text} out of 10.",
                _english_score_message(score),
                english_improvement,
                "Vietnamese feedback.",
                f"Điểm rubric của bạn là {score_text} trên 10.",
                _vietnamese_score_message(score),
                vietnamese_improvement,
            ]
        )
    )


@lru_cache(maxsize=1)
def _load_kitten_model():
    try:
        from kittentts import KittenTTS  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "KittenTTS is not installed. Install the self-host package to enable interview TTS."
        ) from exc

    return KittenTTS("KittenML/kitten-tts-nano-0.2")


def _kitten_generate_to_file(text: str, output_path: Path) -> None:
    model = _load_kitten_model()
    model.generate_to_file(
        text=text,
        output_path=str(output_path),
        voice=settings.kitten_tts_voice,
        speed=settings.kitten_tts_speed,
        sample_rate=settings.kitten_tts_sample_rate,
    )


def synthesize_feedback_audio(
    *,
    answer_id: str,
    script: str,
    generator: TtsGenerator | None = None,
    output_root: Path | None = None,
) -> str | None:
    if not settings.interview_tts_enabled:
        return None

    safe_answer_id = re.sub(r"[^a-zA-Z0-9_-]", "", answer_id)
    if not safe_answer_id or not script.strip():
        return None

    media_root = output_root or settings.uploads_dir
    output_dir = media_root / "interview-tts"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{safe_answer_id}.wav"

    try:
        (generator or _kitten_generate_to_file)(script, output_path)
    except Exception:
        logger.exception("Unable to synthesize interview TTS for answer_id=%s", safe_answer_id)
        return None

    if not output_path.exists() or output_path.stat().st_size == 0:
        logger.warning("Interview TTS generator produced no audio for answer_id=%s", safe_answer_id)
        return None

    return f"/media/interview-tts/{output_path.name}?v={output_path.stat().st_mtime_ns}"
