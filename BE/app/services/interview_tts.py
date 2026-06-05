from __future__ import annotations

import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Callable

from app.core.config import settings

logger = logging.getLogger(__name__)

TtsGenerator = Callable[[str, Path], None]


def _normalize_script(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


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


def _extract_priority_improvements(feedback: str, *, limit: int = 3) -> list[str]:
    improvements: list[str] = []
    in_priority_section = False

    for line in feedback.splitlines():
        cleaned = line.strip()
        if not cleaned:
            continue

        lower = cleaned.lower().rstrip(":")
        if lower in {"priority improvements", "ưu tiên cải thiện", "ưu tiên cải thiện chính"}:
            in_priority_section = True
            continue
        if in_priority_section and cleaned.endswith(":"):
            break

        if not in_priority_section:
            continue

        item = cleaned.lstrip("-• ").strip()
        if item:
            improvements.append(item.rstrip("."))
        if len(improvements) >= limit:
            break

    if improvements:
        return improvements

    fallback = _extract_priority_improvement(feedback)
    return [fallback] if fallback else []


def _trim_to_sentence_boundary(text: str, max_chars: int) -> str:
    if max_chars <= 0 or len(text) <= max_chars:
        return text

    clipped = text[:max_chars].rstrip()
    sentence_end = max(clipped.rfind("."), clipped.rfind("!"), clipped.rfind("?"))
    if sentence_end >= max_chars * 0.55:
        return clipped[: sentence_end + 1].strip()

    word_end = clipped.rfind(" ")
    if word_end >= max_chars * 0.55:
        return f"{clipped[:word_end].rstrip()}."
    return f"{clipped.rstrip('.')}."


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


def _detect_feedback_language(feedback: str) -> str:
    lowered = feedback.lower()
    if re.search(r"[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", lowered):
        return "vi"
    if any(marker in lowered for marker in ("tóm tắt:", "điểm tốt:", "ưu tiên cải thiện", "tiêu chí chấm")):
        return "vi"
    return "en"


def build_feedback_tts_script(*, score: float, feedback: str, language: str | None = None) -> str:
    script_language = "vi" if str(language or _detect_feedback_language(feedback)).strip().lower() == "vi" else "en"
    score_text = f"{score:.1f}"
    normalized_feedback = _normalize_script(feedback)
    vietnamese_parts = [
        f"Điểm rubric của bạn là {score_text} trên 10.",
        _vietnamese_score_message(score),
        normalized_feedback,
    ]

    english_parts = [
        f"Your rubric score is {score_text} out of 10.",
        _english_score_message(score),
        normalized_feedback,
    ]

    if getattr(settings, "interview_tts_script_language", "vi") != "bilingual":
        full_script = _normalize_script(" ".join(vietnamese_parts if script_language == "vi" else english_parts))
        max_chars = int(getattr(settings, "interview_tts_max_chars", 0) or 0)
        if max_chars <= 0 or len(full_script) <= max_chars:
            return full_script

        improvements = _extract_priority_improvements(feedback)
        if script_language == "vi":
            score_part = f"Điểm rubric của bạn là {score_text} trên 10."
            score_message = _vietnamese_score_message(score)
            priority_label = "Ưu tiên cải thiện"
        else:
            score_part = f"Your rubric score is {score_text} out of 10."
            score_message = _english_score_message(score)
            priority_label = "Priority improvements"
        priority_part = f"{priority_label}: " + "; ".join(improvements) + "." if improvements else ""

        if improvements:
            for count in range(len(improvements), 0, -1):
                priority_part = f"{priority_label}: " + "; ".join(improvements[:count]) + "."
                compact_script = _normalize_script(" ".join([score_part, score_message, priority_part]))
                if len(compact_script) <= max_chars:
                    return compact_script
                compact_script = _normalize_script(" ".join([score_part, priority_part]))
                if len(compact_script) <= max_chars:
                    return compact_script

        compact_script = _normalize_script(" ".join([score_part, score_message, priority_part]))
        return _trim_to_sentence_boundary(compact_script, max_chars)

    return _normalize_script(
        " ".join(
            ["Vietnamese feedback."]
            + vietnamese_parts
            + ["English feedback."]
            + english_parts
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

    return KittenTTS(getattr(settings, "kitten_tts_model", "KittenML/kitten-tts-nano-0.8"))


@lru_cache(maxsize=1)
def _load_vieneu_model():
    try:
        from vieneu import Vieneu  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "VieNeu-TTS is not installed. Install `vieneu` to enable Vietnamese interview TTS."
        ) from exc

    return Vieneu(mode=getattr(settings, "vieneu_tts_mode", "turbo"))


@lru_cache(maxsize=1)
def _load_kokoro_model():
    model_path = getattr(settings, "kokoro_tts_model_path")
    voices_path = getattr(settings, "kokoro_tts_voices_path")
    if not model_path.exists() or not voices_path.exists():
        raise RuntimeError(
            f"Kokoro model files are missing. Expected {model_path} and {voices_path}."
        )

    try:
        from kokoro_onnx import Kokoro  # type: ignore
    except ImportError as exc:
        raise RuntimeError("kokoro-onnx is not installed. Install `kokoro-onnx` to enable English Kokoro TTS.") from exc

    return Kokoro(str(model_path), str(voices_path))


def _kitten_generate_to_file(text: str, output_path: Path) -> None:
    model = _load_kitten_model()
    model.generate_to_file(
        text=text,
        output_path=str(output_path),
        voice=settings.kitten_tts_voice,
        speed=settings.kitten_tts_speed,
        sample_rate=settings.kitten_tts_sample_rate,
    )


def _vieneu_generate_to_file(text: str, output_path: Path) -> None:
    model = _load_vieneu_model()
    voice_id = getattr(settings, "vieneu_tts_voice", None)
    voice = model.get_preset_voice(voice_id) if voice_id else None
    audio = model.infer(text=text, voice=voice, show_progress=False)
    model.save(audio, str(output_path))


def _kokoro_generate_to_file(text: str, output_path: Path) -> None:
    import soundfile as sf

    model = _load_kokoro_model()
    samples, sample_rate = model.create(
        text,
        voice=getattr(settings, "kokoro_tts_voice", "af_sarah"),
        speed=getattr(settings, "kokoro_tts_speed", 1.0),
        lang=getattr(settings, "kokoro_tts_language", "en-us"),
    )
    sf.write(str(output_path), samples, sample_rate)


def _get_default_generator() -> TtsGenerator:
    engine = getattr(settings, "interview_tts_engine", "kitten").lower()
    if engine == "vieneu":
        def generate_with_fallback(text: str, output_path: Path) -> None:
            try:
                _vieneu_generate_to_file(text, output_path)
            except Exception:
                logger.exception("VieNeu-TTS failed; falling back to KittenTTS.")
                _kitten_generate_to_file(text, output_path)

        return generate_with_fallback

    return _kitten_generate_to_file


def _get_generator_for_language(language: str) -> TtsGenerator:
    engine = getattr(settings, "interview_tts_engine", "kitten").lower()
    english_engine = getattr(settings, "interview_tts_english_engine", "kitten").lower()
    if language == "en" and english_engine == "kokoro":
        return _kokoro_generate_to_file
    if language == "en" and engine == "vieneu":
        return _kitten_generate_to_file
    return _get_default_generator()


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
        script_language = _detect_feedback_language(script)
        (generator or _get_generator_for_language(script_language))(script, output_path)
    except Exception:
        logger.exception("Unable to synthesize interview TTS for answer_id=%s", safe_answer_id)
        return None

    if not output_path.exists() or output_path.stat().st_size == 0:
        logger.warning("Interview TTS generator produced no audio for answer_id=%s", safe_answer_id)
        return None

    return f"/media/interview-tts/{output_path.name}?v={output_path.stat().st_mtime_ns}"
