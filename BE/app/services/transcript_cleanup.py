from __future__ import annotations

import json
import logging
import re

from app.core.config import settings
from app.core.text_processing import sanitize_user_text
from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion

logger = logging.getLogger(__name__)


def _cleanup_is_plausible(original: str, corrected: str, question: str = "") -> bool:
    original_clean = sanitize_user_text(original)
    corrected_clean = sanitize_user_text(corrected)
    question_clean = sanitize_user_text(question)
    
    if not corrected_clean:
        return False

    original_words = re.findall(r"\w+", original_clean, flags=re.UNICODE)
    corrected_words = re.findall(r"\w+", corrected_clean, flags=re.UNICODE)
    question_words = re.findall(r"\w+", question_clean, flags=re.UNICODE)
    
    if not original_words:
        return False

    if len(corrected_words) > max(len(original_words) + 6, int(len(original_words) * 1.6)):
        return False
    if len(corrected_clean) > max(len(original_clean) + 80, int(len(original_clean) * 1.7)):
        return False

    # Check if corrected text is just copying the question
    if question_clean:
        corrected_norm = re.sub(r"\s+", "", corrected_clean.lower())
        question_norm = re.sub(r"\s+", "", question_clean.lower())
        
        # If corrected is identical to the question
        if corrected_norm == question_norm:
            return False
            
        # If corrected is a large part of the question, but the original was not
        if len(question_words) > 3:
            if corrected_norm in question_norm and len(corrected_words) > len(original_words) + 2:
                return False
                
            corrected_set = set(w.lower() for w in corrected_words)
            question_set = set(w.lower() for w in question_words)
            original_set = set(w.lower() for w in original_words)
            
            corrected_overlap = len(corrected_set.intersection(question_set)) / len(corrected_set) if corrected_set else 0
            original_overlap = len(original_set.intersection(question_set)) / len(original_set) if original_set else 0
            
            if corrected_overlap > 0.85 and original_overlap < 0.5 and len(corrected_words) > len(original_words):
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

    return corrected if _cleanup_is_plausible(original, corrected, question) else original

