from __future__ import annotations

import json
import uuid

import asyncpg
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.endpoints.auth import get_current_user
from app.db.session import get_db
from app.schemas.qna import QnaMessageCreateResult, QnaMessageOut, QnaStructuredAnswerOut, QnaThreadOut
from app.schemas.user import UserOut
from app.services.deepseek_client import DeepSeekAPIError
from app.services.qna import answer_qna, assistant_preview_text
from app.services.qna_docx import QnaDocxValidationError, extract_docx_text


router = APIRouter()


async def _ensure_thread(db: asyncpg.Connection, user_id: str) -> asyncpg.Record:
    existing = await db.fetchrow(
        """
        SELECT id, title
        FROM qna_threads
        WHERE user_id = $1
        """,
        user_id,
    )
    if existing:
        return existing

    return await db.fetchrow(
        """
        INSERT INTO qna_threads (user_id, title)
        VALUES ($1, 'Invera QnA')
        RETURNING id, title
        """,
        user_id,
    )


def _message_out(row: asyncpg.Record) -> QnaMessageOut:
    structured_payload = row["structured_payload"]
    if isinstance(structured_payload, str):
        structured_payload = json.loads(structured_payload)
    return QnaMessageOut(
        id=row["id"],
        role=row["role"],
        content=row["content"],
        structured_payload=QnaStructuredAnswerOut(**structured_payload) if structured_payload else None,
        selected_text=row["selected_text"],
        attachment_name=row["attachment_name"],
        created_at=row["created_at"],
    )


@router.get("/thread", response_model=QnaThreadOut)
async def get_qna_thread(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    thread = await _ensure_thread(db, str(current_user.id))
    rows = await db.fetch(
        """
        SELECT id, role, content, structured_payload, selected_text, attachment_name, created_at
        FROM qna_messages
        WHERE thread_id = $1
        ORDER BY created_at ASC
        """,
        thread["id"],
    )
    return QnaThreadOut(
        id=thread["id"],
        title=thread["title"],
        messages=[_message_out(row) for row in rows],
    )


@router.post("/messages", response_model=QnaMessageCreateResult)
async def create_qna_message(
    message: str = Form(""),
    selected_text: str = Form(""),
    docx: UploadFile | None = File(default=None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    clean_message = message.strip()
    clean_selected = selected_text.strip() or None

    attachment_name: str | None = None
    attachment_text: str | None = None
    if docx is not None:
        try:
            attachment_name, attachment_text = extract_docx_text(docx)
        except QnaDocxValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not clean_message and not attachment_text:
        raise HTTPException(status_code=400, detail="Please enter a question or upload a DOCX file.")

    if not clean_message and attachment_text:
        clean_message = "Please review the uploaded DOCX and answer based on its content."

    thread = await _ensure_thread(db, str(current_user.id))

    history_rows = await db.fetch(
        """
        SELECT role, content
        FROM qna_messages
        WHERE thread_id = $1
        ORDER BY created_at ASC
        LIMIT 20
        """,
        thread["id"],
    )
    conversation_history = [{"role": row["role"], "content": row["content"]} for row in history_rows]

    async with db.transaction():
        user_row = await db.fetchrow(
            """
            INSERT INTO qna_messages (thread_id, role, content, selected_text, attachment_name, attachment_text)
            VALUES ($1, 'user', $2, $3, $4, $5)
            RETURNING id, role, content, structured_payload, selected_text, attachment_name, created_at
            """,
            thread["id"],
            clean_message,
            clean_selected,
            attachment_name,
            attachment_text,
        )

        try:
            structured_payload = await answer_qna(
                user_message=clean_message,
                quoted_text=clean_selected,
                attachment_name=attachment_name,
                attachment_text=attachment_text,
                conversation_history=conversation_history,
            )
        except DeepSeekAPIError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except (ValueError, KeyError) as exc:
            raise HTTPException(status_code=502, detail="The AI returned an invalid QnA payload.") from exc

        assistant_row = await db.fetchrow(
            """
            INSERT INTO qna_messages (thread_id, role, content, structured_payload, selected_text, attachment_name, attachment_text)
            VALUES ($1, 'assistant', $2, $3::jsonb, $4, $5, $6)
            RETURNING id, role, content, structured_payload, selected_text, attachment_name, created_at
            """,
            thread["id"],
            assistant_preview_text(structured_payload),
            json.dumps(structured_payload, ensure_ascii=False),
            clean_selected,
            attachment_name,
            attachment_text,
        )

        await db.execute(
            """
            UPDATE qna_threads
            SET updated_at = NOW()
            WHERE id = $1
            """,
            thread["id"],
        )

    return QnaMessageCreateResult(
        thread_id=thread["id"],
        user_message=_message_out(user_row),
        assistant_message=_message_out(assistant_row),
    )
