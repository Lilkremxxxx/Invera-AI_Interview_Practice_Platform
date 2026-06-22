from __future__ import annotations

import json
import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.db.session import get_db
from app.schemas.test_automation import AutomationBootstrapRequest, AutomationBootstrapResponse, AutomationBootstrapUserOut


router = APIRouter()


def _guard_test_automation() -> None:
    if not settings.test_automation_enabled:
        raise HTTPException(status_code=404, detail="Not found")


def _unique_email(prefix: str) -> str:
    return f"{prefix}+{uuid.uuid4().hex[:12]}@example.test"


@router.post("/bootstrap", response_model=AutomationBootstrapResponse)
async def bootstrap_test_automation(
    payload: AutomationBootstrapRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    _guard_test_automation()

    candidate_email = _unique_email(payload.candidate_email_prefix)
    admin_email = _unique_email(payload.admin_email_prefix)

    async with db.transaction():
        candidate_row = await db.fetchrow(
            """
            INSERT INTO users (email, password_hash, full_name, is_admin, email_verified, plan_tier, plan_status)
            VALUES ($1, $2, $3, FALSE, TRUE, 'pro', 'active')
            RETURNING id, email, full_name, is_admin
            """,
            candidate_email,
            "automation-password",
            payload.candidate_full_name,
        )
        admin_row = await db.fetchrow(
            """
            INSERT INTO users (email, password_hash, full_name, is_admin, email_verified, plan_tier, plan_status)
            VALUES ($1, $2, $3, TRUE, TRUE, 'admin', 'active')
            RETURNING id, email, full_name, is_admin
            """,
            admin_email,
            "automation-password",
            payload.admin_full_name,
        )

        questions: list[dict] = []
        for index, question in enumerate(payload.questions, start=1):
            row = await db.fetchrow(
                """
                INSERT INTO questions (major, role, level, text, category, difficulty, tags, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NULL)
                RETURNING id, major, role, level, text, category, difficulty, tags
                """,
                payload.session_payload.major,
                payload.session_payload.role,
                payload.session_payload.level,
                question.text,
                question.category,
                question.difficulty,
                json.dumps(question.tags),
            )
            questions.append(dict(row) if row else {"seed_index": index, **question.model_dump()})

        session_row = await db.fetchrow(
            """
            INSERT INTO sessions (user_id, major, role, level, mode, language, status, time_limit_minutes, custom_questions)
            VALUES ($1, $2, $3, $4, $5, $6, 'IN_PROGRESS', NULL, $7::jsonb)
            RETURNING id, user_id, major, role, level, mode, language, status, created_at, completed_at, time_limit_minutes
            """,
            candidate_row["id"] if candidate_row else uuid.uuid4(),
            payload.session_payload.major,
            payload.session_payload.role,
            payload.session_payload.level,
            payload.session_payload.mode,
            payload.session_payload.language,
            json.dumps([q.model_dump() for q in payload.questions]) if payload.questions else None,
        )

    return AutomationBootstrapResponse(
        candidate=AutomationBootstrapUserOut(
            id=str(candidate_row["id"]),
            email=str(candidate_row["email"]),
            full_name=str(candidate_row["full_name"]),
            is_admin=bool(candidate_row["is_admin"]),
        ),
        admin=AutomationBootstrapUserOut(
            id=str(admin_row["id"]),
            email=str(admin_row["email"]),
            full_name=str(admin_row["full_name"]),
            is_admin=bool(admin_row["is_admin"]),
        ),
        session=dict(session_row) if session_row else {},
        questions=questions,
    )
