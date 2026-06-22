from __future__ import annotations

import asyncio
import json
import re

import asyncpg

from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion


def _normalize_tags(tags: list[str] | None) -> list[str]:
    normalized: list[str] = []
    for tag in tags or []:
        value = re.sub(r"[^a-z0-9\- ]+", "", str(tag).strip().lower()).replace(" ", "-")
        if value and value not in normalized:
            normalized.append(value)
    return normalized[:8]


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _parse_json_content(content: str) -> dict:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


async def _generate_bilingual_questions(
    *,
    major: str,
    role: str,
    level: str,
    count: int,
    existing_examples: list[str] | None = None,
) -> list[dict]:
    system_prompt = """
You generate bilingual interview question-bank entries for Invera.

Return STRICT JSON only with this shape:
{
  "questions": [
    {
      "text_en": "English question",
      "text_vi": "Vietnamese question",
      "category_en": "English category",
      "category_vi": "Vietnamese category",
      "difficulty": "easy | medium | hard",
      "ideal_answer_en": "English ideal answer",
      "ideal_answer_vi": "Vietnamese ideal answer",
      "tags": ["tag-one", "tag-two"]
    }
  ]
}

Rules:
- Generate distinct, role-specific interview questions.
- Match the requested level exactly.
- Keep the ideal answer concise but interview-ready.
- Tags must be lowercase kebab-case.
""".strip()

    user_prompt = f"""
Generate exactly {count} bilingual interview question-bank entries.

Context:
- major: {major}
- role: {role}
- level: {level}

Difficulty calibration:
- intern: mostly easy
- fresher: easy to medium
- junior: mostly medium
- mid: medium to hard
- senior: mostly hard

Avoid duplicating these existing English questions:
{json.dumps((existing_examples or [])[:8], ensure_ascii=False)}
""".strip()

    last_error: Exception | None = None
    for _ in range(3):
        try:
            response = await create_chat_completion(system_prompt=system_prompt, user_prompt=user_prompt)
            payload = _parse_json_content(response["content"])
            questions = payload.get("questions")
            if not isinstance(questions, list) or len(questions) != count:
                raise ValueError("DeepSeek generation payload length mismatch.")
            return questions
        except (json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            await asyncio.sleep(1)
    raise ValueError(f"Unable to generate bilingual questions for {major}/{role}/{level}: {last_error}")


async def ensure_question_bank_minimum(
    db: asyncpg.Connection,
    *,
    major: str,
    role: str,
    level: str,
    min_count: int,
) -> None:
    current_count = await db.fetchval(
        "SELECT COUNT(*)::int FROM questions WHERE major = $1 AND role = $2 AND level = $3 AND user_id IS NULL",
        major,
        role,
        level,
    )
    needed = max(0, min_count - int(current_count or 0))
    if needed == 0:
        return

    existing_rows = await db.fetch(
        "SELECT text, text_en FROM questions WHERE major = $1 AND role = $2 AND level = $3 AND user_id IS NULL",
        major,
        role,
        level,
    )
    existing_texts = {_normalize_text(row["text_en"] or row["text"]) for row in existing_rows}
    existing_examples = [str(row["text_en"] or row["text"]).strip() for row in existing_rows]

    attempts = 0
    inserted = 0
    max_attempts = max(8, needed * 4)
    while inserted < needed and attempts < max_attempts:
        attempts += 1
        batch_size = 1 if attempts > 2 or needed - inserted == 1 else 2
        try:
            draft_questions = await _generate_bilingual_questions(
                major=major,
                role=role,
                level=level,
                count=batch_size,
                existing_examples=existing_examples,
            )
        except (DeepSeekAPIError, ValueError):
            await asyncio.sleep(1)
            continue
        for item in draft_questions:
            text_en = str(item["text_en"]).strip()
            normalized = _normalize_text(text_en)
            if not text_en or normalized in existing_texts:
                continue

            difficulty = str(item["difficulty"]).strip().lower() or "medium"
            if difficulty not in {"easy", "medium", "hard"}:
                difficulty = "medium"

            await db.execute(
                """
                INSERT INTO questions (
                    major, role, level,
                    text, text_en, text_vi,
                    category, category_en, category_vi,
                    difficulty,
                    ideal_answer, ideal_answer_en, ideal_answer_vi,
                    tags
                )
                VALUES (
                    $1, $2, $3,
                    $4, $4, $5,
                    $6, $7, $8,
                    $9,
                    $10, $11, $12,
                    $13
                )
                """,
                major,
                role,
                level,
                text_en,
                str(item["text_vi"]).strip(),
                str(item["category_en"]).strip(),
                str(item["category_en"]).strip(),
                str(item["category_vi"]).strip(),
                difficulty,
                str(item["ideal_answer_en"]).strip(),
                str(item["ideal_answer_en"]).strip(),
                str(item["ideal_answer_vi"]).strip(),
                _normalize_tags(item.get("tags", [])),
            )
            existing_texts.add(normalized)
            existing_examples.append(text_en)
            inserted += 1
            if inserted >= needed:
                break

    if inserted < needed:
        raise RuntimeError(f"Could not seed enough questions for {major}/{role}/{level}.")


async def _batch_translate_to_vi(items: list[dict]) -> dict[int, dict]:
    system_prompt = """
You are a professional translator. Translate technical and professional interview question components from English to Vietnamese.

You will receive a JSON list of questions to translate, where each question has "id", "text", "category", and "ideal_answer" fields.
Translate the "text", "category", and "ideal_answer" fields of each question into natural, professional Vietnamese.
Keep any technical terms (e.g. API, SQL, Docker, React, etc.) in English where they are commonly used by Vietnamese software developers.

Return STRICT JSON only with this shape:
{
  "translations": [
    {
      "id": 123,
      "text_vi": "Vietnamese question text",
      "category_vi": "Vietnamese category",
      "ideal_answer_vi": "Vietnamese ideal answer"
    }
  ]
}
""".strip()

    user_prompt = json.dumps({"questions": items}, ensure_ascii=False)

    response = await create_chat_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.0,
    )

    payload = _parse_json_content(response["content"])
    translations = payload.get("translations")
    if not isinstance(translations, list):
        raise ValueError("Invalid translation payload structure")

    result = {}
    for item in translations:
        q_id = int(item["id"])
        result[q_id] = {
            "text_vi": str(item.get("text_vi") or "").strip(),
            "category_vi": str(item.get("category_vi") or "").strip(),
            "ideal_answer_vi": str(item.get("ideal_answer_vi") or "").strip(),
        }
    return result


async def translate_questions_to_vi_if_needed(db: asyncpg.Connection, questions: list[dict | asyncpg.Record]) -> list[dict]:
    mutable_questions = [dict(q) for q in questions]

    untranslated_indices = []
    untranslated_payloads = []
    for idx, q in enumerate(mutable_questions):
        text_en = q.get("text_en") or q.get("text")
        text_vi = q.get("text_vi")
        if text_en and text_vi == text_en:
            untranslated_indices.append(idx)
            untranslated_payloads.append(q)

    if not untranslated_payloads:
        return mutable_questions

    # Fetch original ideal_answer_en from DB
    question_ids = [q["id"] for q in untranslated_payloads]
    rows = await db.fetch(
        "SELECT id, text_en, category_en, ideal_answer_en FROM questions WHERE id = ANY($1)",
        question_ids
    )
    row_map = {r["id"]: r for r in rows}

    # Prepare translation inputs
    to_translate = []
    for q in untranslated_payloads:
        q_id = q["id"]
        r = row_map.get(q_id)
        if r:
            to_translate.append({
                "id": q_id,
                "text": r["text_en"] or q.get("text") or "",
                "category": r["category_en"] or q.get("category") or "",
                "ideal_answer": r["ideal_answer_en"] or ""
            })

    if not to_translate:
        return mutable_questions

    # Call DeepSeek to translate them in batch
    try:
        translated_map = await _batch_translate_to_vi(to_translate)
        
        # Save translations back to DB and update local questions list
        for idx in untranslated_indices:
            q = mutable_questions[idx]
            q_id = q["id"]
            trans = translated_map.get(q_id)
            if trans:
                text_vi = trans["text_vi"]
                category_vi = trans["category_vi"]
                ideal_answer_vi = trans["ideal_answer_vi"]

                # Update DB
                await db.execute(
                    """
                    UPDATE questions
                    SET text_vi = $1, category_vi = $2, ideal_answer_vi = $3
                    WHERE id = $4
                    """,
                    text_vi, category_vi, ideal_answer_vi, q_id
                )

                # Update local dictionary
                q["text_vi"] = text_vi
                q["category_vi"] = category_vi
                q["ideal_answer_vi"] = ideal_answer_vi
                
    except Exception as e:
        import logging
        logger = logging.getLogger("app.services.question_bank_seed")
        logger.error(f"Failed to batch translate questions to Vietnamese: {e}", exc_info=True)

    return mutable_questions


async def _batch_translate_to_en(items: list[dict]) -> dict[int, dict]:
    if not items:
        return {}

    system_prompt = """
You are a professional translator. Translate technical and professional interview question components from Vietnamese to English.

You will receive a JSON list of questions to translate, where each question has "id", "text", "category", and "ideal_answer" fields.
Translate the "text", "category", and "ideal_answer" fields of each question into natural, professional English suitable for a software engineering or professional interview.

Return STRICT JSON only with this shape:
{
  "translations": [
    {
      "id": 123,
      "text_en": "English question text",
      "category_en": "English category",
      "ideal_answer_en": "English ideal answer"
    }
  ]
}
""".strip()

    user_prompt = json.dumps({"questions": items}, ensure_ascii=False)

    response = await create_chat_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.0,
    )

    payload = _parse_json_content(response["content"])
    translations = payload.get("translations")
    if not isinstance(translations, list):
        raise ValueError("Invalid translation payload structure")

    result = {}
    for item in translations:
        q_id = int(item["id"])
        result[q_id] = {
            "text_en": str(item.get("text_en") or "").strip(),
            "category_en": str(item.get("category_en") or "").strip(),
            "ideal_answer_en": str(item.get("ideal_answer_en") or "").strip(),
        }
    return result


async def translate_questions_to_en_if_needed(db: asyncpg.Connection, questions: list[dict | asyncpg.Record]) -> list[dict]:
    mutable_questions = [dict(q) for q in questions]

    # Heuristic to check if text contains Vietnamese diacritics
    vietnamese_diacritics = re.compile(
        r"[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]"
    )

    untranslated_indices = []
    untranslated_payloads = []
    for idx, q in enumerate(mutable_questions):
        text_en = q.get("text_en") or q.get("text")
        # If text_en is empty, or contains Vietnamese text, we need to translate it
        if text_en and vietnamese_diacritics.search(text_en.lower()):
            untranslated_indices.append(idx)
            untranslated_payloads.append(q)

    if not untranslated_payloads:
        return mutable_questions

    # Fetch original ideal_answer_vi/text_vi from DB
    question_ids = [q["id"] for q in untranslated_payloads]
    rows = await db.fetch(
        "SELECT id, text_vi, category_vi, ideal_answer_vi FROM questions WHERE id = ANY($1)",
        question_ids
    )
    row_map = {r["id"]: r for r in rows}

    # Prepare translation inputs
    to_translate = []
    for q in untranslated_payloads:
        q_id = q["id"]
        r = row_map.get(q_id)
        if r:
            to_translate.append({
                "id": q_id,
                "text": r["text_vi"] or q.get("text") or "",
                "category": r["category_vi"] or q.get("category") or "",
                "ideal_answer": r["ideal_answer_vi"] or ""
            })

    if not to_translate:
        return mutable_questions

    # Call DeepSeek to translate them in batch
    try:
        translated_map = await _batch_translate_to_en(to_translate)
        
        # Save translations back to DB and update local questions list
        for idx in untranslated_indices:
            q = mutable_questions[idx]
            q_id = q["id"]
            trans = translated_map.get(q_id)
            if trans:
                text_en = trans["text_en"]
                category_en = trans["category_en"]
                ideal_answer_en = trans["ideal_answer_en"]

                # Update DB
                await db.execute(
                    """
                    UPDATE questions
                    SET text_en = $1, category_en = $2, ideal_answer_en = $3
                    WHERE id = $4
                    """,
                    text_en, category_en, ideal_answer_en, q_id
                )

                # Update local dictionary
                q["text_en"] = text_en
                q["category_en"] = category_en
                q["ideal_answer_en"] = ideal_answer_en
                
    except Exception as e:
        import logging
        logger = logging.getLogger("app.services.question_bank_seed")
        logger.error(f"Failed to batch translate questions to English: {e}", exc_info=True)

    return mutable_questions
