#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any

import asyncpg

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "BE"))

from app.core.config import settings  # noqa: E402
from app.core.question_bank import QUESTION_BANK_ROLES, VALID_LEVELS  # noqa: E402
from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion  # noqa: E402
from app.services.question_bank_seed import ensure_question_bank_minimum  # noqa: E402


def chunked(items: list[Any], size: int) -> list[list[Any]]:
    return [items[index:index + size] for index in range(0, len(items), size)]


def normalize_tags(tags: list[str] | None) -> list[str]:
    normalized: list[str] = []
    for tag in tags or []:
        value = re.sub(r"[^a-z0-9\- ]+", "", str(tag).strip().lower()).replace(" ", "-")
        if value and value not in normalized:
            normalized.append(value)
    return normalized[:8]


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def parse_json_content(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


async def open_connection() -> asyncpg.Connection:
    return await asyncpg.connect(
        host=settings.pg_host,
        port=settings.pg_port,
        database=settings.pg_dbname,
        user=settings.pg_user,
        password=settings.pg_password,
    )


async def translate_batch(batch: list[asyncpg.Record]) -> list[dict[str, Any]]:
    items = [
        {
            "batch_key": str(index),
            "question": row["text"],
            "category": row["category"],
            "difficulty": row["difficulty"],
            "ideal_answer": row["ideal_answer"],
        }
        for index, row in enumerate(batch)
    ]
    system_prompt = """
You synchronize interview question-bank entries for Invera.
Translate each entry into both English and Vietnamese.

Return STRICT JSON only with this shape:
{
  "items": [
    {
      "batch_key": "string",
      "text_en": "English question",
      "text_vi": "Vietnamese question",
      "category_en": "English category",
      "category_vi": "Vietnamese category",
      "ideal_answer_en": "English ideal answer",
      "ideal_answer_vi": "Vietnamese ideal answer"
    }
  ]
}

Rules:
- Preserve the original meaning and interview difficulty.
- Use natural interview wording in both languages.
- Keep technology names in English when that is standard.
- Do not omit details from the ideal answer.
""".strip()
    user_prompt = json.dumps({"items": items}, ensure_ascii=False)
    last_error: Exception | None = None
    for _ in range(3):
        try:
            response = await create_chat_completion(system_prompt=system_prompt, user_prompt=user_prompt)
            payload = parse_json_content(response["content"])
            translated = payload.get("items")
            if not isinstance(translated, list) or len(translated) != len(batch):
                raise ValueError("DeepSeek translation payload length mismatch.")
            return translated
        except (json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            await asyncio.sleep(1)
    raise ValueError(f"DeepSeek translation payload invalid after retries: {last_error}")


async def translate_existing_questions(conn: asyncpg.Connection, batch_size: int) -> int:
    groups = await conn.fetch(
        """
        SELECT array_agg(id ORDER BY id) AS ids,
               text,
               category,
               difficulty,
               ideal_answer
        FROM questions
        WHERE COALESCE(text_en, '') = COALESCE(text_vi, '')
          AND COALESCE(category_en, '') = COALESCE(category_vi, '')
          AND COALESCE(ideal_answer_en, '') = COALESCE(ideal_answer_vi, '')
        GROUP BY text, category, difficulty, ideal_answer
        ORDER BY MIN(id)
        """
    )
    translated_groups = 0
    for batch in chunked(list(groups), batch_size):
        translated = await translate_batch(batch)
        for source, target in zip(batch, translated, strict=True):
            await conn.execute(
                """
                UPDATE questions
                SET text = $2,
                    text_en = $2,
                    text_vi = $3,
                    category = $4,
                    category_en = $5,
                    category_vi = $6,
                    ideal_answer = $7,
                    ideal_answer_en = $8,
                    ideal_answer_vi = $9
                WHERE id = ANY($1::int[])
                """,
                source["ids"],
                str(target["text_en"]).strip(),
                str(target["text_vi"]).strip(),
                str(target["category_en"]).strip(),
                str(target["category_en"]).strip(),
                str(target["category_vi"]).strip(),
                str(target["ideal_answer_en"]).strip(),
                str(target["ideal_answer_en"]).strip(),
                str(target["ideal_answer_vi"]).strip(),
            )
            translated_groups += 1
        print(f"Translated {translated_groups}/{len(groups)} unique question groups", flush=True)
    return translated_groups


async def generate_questions_for_combo(
    *,
    major: str,
    role: str,
    level: str,
    count: int,
) -> list[dict[str, Any]]:
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
- Generate distinct questions with no duplicates.
- Match the requested role and seniority exactly.
- Keep each question realistic for a real interview.
- Make the ideal answer concrete, structured, and interview-ready.
- Tags must be lowercase kebab-case.
- Use 3 to 6 tags per question.
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
- junior: medium with a small amount of easy
- mid: medium to hard
- senior: mostly hard
""".strip()

    last_error: Exception | None = None
    for _ in range(3):
        try:
            response = await create_chat_completion(system_prompt=system_prompt, user_prompt=user_prompt)
            payload = parse_json_content(response["content"])
            questions = payload.get("questions")
            if not isinstance(questions, list) or len(questions) != count:
                raise ValueError(
                    f"DeepSeek generated {len(questions) if isinstance(questions, list) else 'invalid'} items for {major}/{role}/{level}."
                )
            return questions
        except (json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            await asyncio.sleep(1)
    raise ValueError(f"DeepSeek generation payload invalid after retries for {major}/{role}/{level}: {last_error}")


async def fill_missing_combos(conn: asyncpg.Connection, min_per_combo: int) -> int:
    count_rows = await conn.fetch(
        """
        SELECT major, role, level, COUNT(*)::int AS question_count
        FROM questions
        GROUP BY major, role, level
        """
    )
    counts = {(row["major"], row["role"], row["level"]): row["question_count"] for row in count_rows}
    inserted_total = 0

    for major, roles in QUESTION_BANK_ROLES.items():
        for role in roles:
            for level in VALID_LEVELS:
                existing = counts.get((major, role, level), 0)
                needed = max(0, min_per_combo - existing)
                if needed == 0:
                    continue

                print(f"Generating {needed} questions for {major}/{role}/{level}", flush=True)
                await ensure_question_bank_minimum(
                    conn,
                    major=major,
                    role=role,
                    level=level,
                    min_count=min_per_combo,
                )
                counts[(major, role, level)] = min_per_combo
                inserted_total += needed

    return inserted_total


async def main() -> None:
    parser = argparse.ArgumentParser(description="Synchronize and localize the Invera question bank.")
    parser.add_argument("--min-per-combo", type=int, default=5)
    parser.add_argument("--translation-batch-size", type=int, default=2)
    args = parser.parse_args()

    conn = await open_connection()
    try:
        translated = await translate_existing_questions(conn, batch_size=args.translation_batch_size)
        inserted = await fill_missing_combos(conn, min_per_combo=args.min_per_combo)
        print(json.dumps({"translated_unique_groups": translated, "inserted_questions": inserted}, ensure_ascii=False), flush=True)
    finally:
        await conn.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (DeepSeekAPIError, asyncpg.PostgresError, ValueError, RuntimeError) as exc:
        print(f"sync_question_bank failed: {exc}", file=sys.stderr)
        raise
