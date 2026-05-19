from __future__ import annotations

import json
import logging
import re

from app.core.config import settings
from app.core.text_processing import sanitize_user_text
from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion

logger = logging.getLogger(__name__)


def _cleanup_is_plausible(original: str, corrected: str) -> bool:
    original_clean = sanitize_user_text(original)
    corrected_clean = sanitize_user_text(corrected)
    if not corrected_clean:
        return False

    original_words = re.findall(r"\w+", original_clean, flags=re.UNICODE)
    corrected_words = re.findall(r"\w+", corrected_clean, flags=re.UNICODE)
    if not original_words:
        return False

    if len(corrected_words) > max(len(original_words) + 6, int(len(original_words) * 1.6)):
        return False
    if len(corrected_clean) > max(len(original_clean) + 80, int(len(original_clean) * 1.7)):
        return False
    return True


async def correct_transcript_text(*, transcript: str, question_text: str, language: str) -> str:
    original = sanitize_user_text(transcript)
    question = sanitize_user_text(question_text)
    if not original or not question or not settings.interview_stt_cleanup_enabled:
        return original
    if not settings.deepseek_enabled or not settings.deepseek_api_key:
        return original

    target_language = "Vietnamese" if language == "vi" else "English"
    system_prompt = f"""
You repair speech-to-text transcripts for interview answers.
Use the interview question only to correct likely misheard technical terms, acronyms, product names, and punctuation.
Do not add new ideas, examples, claims, or explanations.
Preserve the candidate's meaning, uncertainty, grammar level, and target language: {target_language}.
Return strict JSON only: {{"text": "corrected transcript"}}
""".strip()
    user_prompt = json.dumps(
        {
            "question": question,
            "raw_transcript": original,
            "target_language": language,
        },
        ensure_ascii=False,
    )

    try:
        response = await create_chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=settings.interview_stt_cleanup_max_tokens,
            timeout_seconds=8,
            temperature=0.0,
        )
        payload = json.loads(response["content"])
        corrected = sanitize_user_text(str(payload.get("text") or ""))
    except (DeepSeekAPIError, json.JSONDecodeError, TypeError, ValueError) as exc:
        logger.warning("Transcript cleanup failed; using raw transcript: %s", exc)
        return original

    return corrected if _cleanup_is_plausible(original, corrected) else original
