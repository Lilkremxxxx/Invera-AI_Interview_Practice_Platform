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
        "SELECT COUNT(*)::int FROM questions WHERE major = $1 AND role = $2 AND level = $3",
        major,
        role,
        level,
    )
    needed = max(0, min_count - int(current_count or 0))
    if needed == 0:
        return

    existing_rows = await db.fetch(
        "SELECT text, text_en FROM questions WHERE major = $1 AND role = $2 AND level = $3",
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
