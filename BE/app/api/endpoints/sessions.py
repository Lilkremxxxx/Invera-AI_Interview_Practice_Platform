import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from app.db.session import get_db
from app.api.endpoints.auth import get_current_user
from app.core.question_bank import (
    QUESTION_BANK_ROLES,
    VALID_LEVELS,
    localized_question_dict,
    localized_question_field,
    resolve_ui_language,
)
from app.core.text_processing import sanitize_user_text
from app.schemas.user import UserOut
from app.schemas.session import SessionCatalogRole, SessionCreate, SessionOut, SessionDetail
from app.schemas.question import QuestionOut
from app.schemas.answer import AnswerSubmit, AnswerOut
from app.services.deepseek_client import DeepSeekAPIError
from app.services.plans import can_export_sessions, get_user_plan_snapshot, resolve_session_time_limit_minutes
from app.services.session_pdf import build_session_pdf_filename, build_sessions_pdf
from app.services.question_bank_seed import ensure_question_bank_minimum
from app.services.scoring import ScoringRequest, score_answer

router = APIRouter()

LEVEL_LABELS = {
    "intern": {"vi": "Thực tập sinh", "en": "Intern"},
    "fresher": {"vi": "Fresher", "en": "Fresher"},
    "junior": {"vi": "Junior", "en": "Junior"},
    "mid": {"vi": "Trung cấp", "en": "Mid-level"},
    "senior": {"vi": "Senior", "en": "Senior"},
}
MODE_LABELS = {
    "text": {"vi": "Văn bản", "en": "Text"},
    "voice": {"vi": "Giọng nói", "en": "Voice"},
    "video": {"vi": "Video", "en": "Video"},
}


async def _require_export_access(
    *,
    db: asyncpg.Connection,
    user_id,
    language: str,
):
    entitlement = await get_user_plan_snapshot(db, user_id)
    if can_export_sessions(
        is_admin=bool(entitlement.get("is_admin")),
        plan_tier=entitlement.get("plan_tier"),
        plan_status=entitlement.get("plan_status"),
    ):
        return

    detail = (
        "Tính năng export chỉ khả dụng với gói Pro hoặc Premium."
        if language == "vi"
        else "Export is only available on the Pro or Premium plan."
    )
    raise HTTPException(status_code=403, detail=detail)


async def _fetch_session_questions(
    db: asyncpg.Connection,
    *,
    major: str,
    role: str,
    level: str,
    count: int,
):
    return await db.fetch(
        """
        SELECT id, major, role, level, text, text_en, text_vi,
               category, category_en, category_vi,
               difficulty, tags
        FROM questions
        WHERE major = $1 AND role = $2 AND level = $3
        ORDER BY RANDOM()
        LIMIT $4
        """,
        major, role, level, count,
    )


def _humanize_role_label(role: str) -> str:
    return role.replace("_", " ").title()


def _serialize_answer_row(answer_row) -> AnswerOut:
    return AnswerOut(
        id=answer_row["id"],
        session_id=answer_row["session_id"],
        question_id=answer_row["question_id"],
        answer_text=sanitize_user_text(answer_row["answer_text"]),
        score=float(answer_row["score"]),
        feedback=answer_row["feedback"],
        submitted_at=answer_row["submitted_at"],
    )


async def _load_session_bundle(
    db: asyncpg.Connection,
    *,
    session_id: uuid.UUID,
    user_id,
):
    session_row = await db.fetchrow(
        "SELECT * FROM sessions WHERE id = $1 AND user_id = $2",
        session_id, user_id,
    )
    if not session_row:
        return None

    answers_rows = await db.fetch(
        """
        SELECT a.id, a.session_id, a.question_id, a.answer_text,
               a.score::float AS score, a.feedback, a.submitted_at
        FROM answers a
        WHERE a.session_id = $1
        ORDER BY a.submitted_at
        """,
        session_id,
    )

    questions_rows = await db.fetch(
        """
        SELECT q.id, q.major, q.role, q.level, q.text, q.text_en, q.text_vi,
               q.category, q.category_en, q.category_vi,
               q.difficulty, q.tags
        FROM session_question_sets sq
        JOIN questions q ON q.id = sq.question_id
        WHERE sq.session_id = $1
        ORDER BY sq.position ASC, q.id ASC
        """,
        session_id,
    )

    if not questions_rows:
        questions_rows = await db.fetch(
            """
            SELECT DISTINCT q.id, q.major, q.role, q.level, q.text, q.text_en, q.text_vi,
                   q.category, q.category_en, q.category_vi,
                   q.difficulty, q.tags
            FROM questions q
            LEFT JOIN answers a ON a.question_id = q.id AND a.session_id = $1
            WHERE q.role = $2 AND q.level = $3
              AND ($4::text IS NULL OR q.major = $4)
            ORDER BY a.submitted_at NULLS LAST, q.id
            LIMIT 15
            """,
            session_id, session_row["role"], session_row["level"], session_row["major"],
        )

    avg_score = None
    if answers_rows:
        avg_score = round(sum(float(a["score"]) for a in answers_rows) / len(answers_rows), 1)

    return {
        "session_row": session_row,
        "answers_rows": answers_rows,
        "questions_rows": questions_rows,
        "avg_score": avg_score,
    }


def _session_pdf_payload(bundle: dict, language: str) -> dict:
    session_row = bundle["session_row"]
    locale = "vi-VN" if language == "vi" else "en-US"
    questions = [
        {
            "id": question["id"],
            "text": localized_question_field(question, "text", language),
            "category": localized_question_field(question, "category", language),
            "difficulty": question["difficulty"],
        }
        for question in bundle["questions_rows"]
    ]
    answers = [
        {
            **dict(answer),
            "answer_text": sanitize_user_text(answer["answer_text"]),
            "feedback": answer["feedback"],
        }
        for answer in bundle["answers_rows"]
    ]
    role_label = _humanize_role_label(session_row["role"])
    level_label = LEVEL_LABELS.get(session_row["level"], {}).get(language, session_row["level"])
    mode_label = MODE_LABELS.get(session_row["mode"], {}).get(language, session_row["mode"])

    return {
        "id": str(session_row["id"]),
        "role_label": role_label,
        "level_label": level_label,
        "status": session_row["status"],
        "mode": mode_label,
        "created_at_label": session_row["created_at"].astimezone().strftime("%Y-%m-%d %H:%M"),
        "completed_at_label": (
            session_row["completed_at"].astimezone().strftime("%Y-%m-%d %H:%M")
            if session_row["completed_at"] is not None
            else None
        ),
        "avg_score_label": f"{bundle['avg_score']:.1f}/10" if bundle["avg_score"] is not None else None,
        "question_count": len(questions),
        "questions": questions,
        "answers": answers,
    }


# ─── POST /sessions ──────────────────────────────────────────────────────────
@router.post("", response_model=SessionDetail)
async def create_session(
    body: SessionCreate,
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    entitlement = await get_user_plan_snapshot(db, current_user.id)
    if not entitlement["can_start_new_session"]:
        raise HTTPException(
            status_code=403,
            detail="Bạn đã dùng hết 1 session miễn phí. Hãy nâng cấp gói để tạo phiên mới.",
        )

    # Validate role/level combo
    major = body.major.strip().lower()
    role = body.role.strip().lower()
    level = body.level.strip().lower()

    if major not in QUESTION_BANK_ROLES:
        raise HTTPException(status_code=400, detail=f"Major không hợp lệ. Chọn: {sorted(QUESTION_BANK_ROLES.keys())}")
    if role not in QUESTION_BANK_ROLES[major]:
        raise HTTPException(status_code=400, detail=f"Role không hợp lệ cho major={major}")
    if level not in VALID_LEVELS:
        raise HTTPException(status_code=400, detail=f"Level không hợp lệ. Chọn: {VALID_LEVELS}")

    count = max(1, min(body.question_count, 15))
    ui_language = resolve_ui_language(request)
    allowed_time_limit = resolve_session_time_limit_minutes(
        is_admin=bool(entitlement.get("is_admin")),
        plan_tier=entitlement.get("plan_tier"),
        plan_status=entitlement.get("plan_status"),
    )
    requested_time_limit = allowed_time_limit if body.time_limit_minutes is None else body.time_limit_minutes

    if body.time_limit_minutes not in {None, 5, 7, 10}:
        detail = (
            "Giới hạn thời gian không hợp lệ. Chỉ hỗ trợ No limit, 5, 7 hoặc 10 phút."
            if ui_language == "vi"
            else "Invalid time limit. Only No limit, 5, 7, or 10 minutes are supported."
        )
        raise HTTPException(status_code=400, detail=detail)

    if requested_time_limit != allowed_time_limit:
        detail = (
            "Giới hạn thời gian không phù hợp với gói hiện tại của bạn."
            if ui_language == "vi"
            else "This time limit is not available for your current plan."
        )
        raise HTTPException(status_code=400, detail=detail)

    # Lấy ngẫu nhiên câu hỏi cho major+role+level
    questions = await _fetch_session_questions(
        db,
        major=major,
        role=role,
        level=level,
        count=count,
    )

    if len(questions) < count:
        try:
            await ensure_question_bank_minimum(
                db,
                major=major,
                role=role,
                level=level,
                min_count=count,
            )
        except (DeepSeekAPIError, RuntimeError) as exc:
            if not questions:
                detail = (
                    f"Chưa thể chuẩn bị question bank cho major={major}, role={role}, level={level}. "
                    "Vui lòng thử lại sau ít phút."
                    if ui_language == "vi"
                    else f"Unable to prepare the question bank for major={major}, role={role}, level={level}. "
                    "Please try again in a few minutes."
                )
                raise HTTPException(status_code=503, detail=detail) from exc

        questions = await _fetch_session_questions(
            db,
            major=major,
            role=role,
            level=level,
            count=count,
        )

    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"Chưa có câu hỏi cho major={major}, role={role}, level={level}",
        )

    async with db.transaction():
        session_row = await db.fetchrow(
            """
            INSERT INTO sessions (user_id, major, role, level, mode, status, time_limit_minutes)
            VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', $6)
            RETURNING id, user_id, major, role, level, mode, status, created_at, completed_at, time_limit_minutes
            """,
            current_user.id, major, role, level, body.mode, requested_time_limit,
        )
        await db.executemany(
            """
            INSERT INTO session_question_sets (session_id, question_id, position)
            VALUES ($1, $2, $3)
            ON CONFLICT (session_id, question_id) DO NOTHING
            """,
            [(session_row["id"], question["id"], index) for index, question in enumerate(questions, start=1)],
        )

    return SessionDetail(
        id=session_row["id"],
        user_id=session_row["user_id"],
        major=session_row["major"],
        role=session_row["role"],
        level=session_row["level"],
        mode=session_row["mode"],
        status=session_row["status"],
        created_at=session_row["created_at"],
        completed_at=session_row["completed_at"],
        time_limit_minutes=session_row["time_limit_minutes"],
        questions=[QuestionOut(**localized_question_dict(q)) for q in questions],
        answers=[],
    )


@router.get("/catalog", response_model=List[SessionCatalogRole])
async def list_session_catalog(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    rows = await db.fetch(
        """
        SELECT major, role, level, COUNT(*)::int AS question_count
        FROM questions
        GROUP BY major, role, level
        ORDER BY major, role, level
        """
    )

    catalog: dict[tuple[str, str], dict[str, object]] = {
        (major, role): {
            "major": major,
            "role": role,
            "total_questions": 0,
            "counts_by_level": {level: 0 for level in VALID_LEVELS},
        }
        for major, roles in QUESTION_BANK_ROLES.items()
        for role in roles
    }
    for row in rows:
        key = (row["major"], row["role"])
        entry = catalog[key]
        counts_by_level = entry["counts_by_level"]
        counts_by_level[row["level"]] = row["question_count"]
        entry["total_questions"] += row["question_count"]

    return [
        SessionCatalogRole(**catalog[(major, role)])
        for major, roles in QUESTION_BANK_ROLES.items()
        for role in roles
    ]


# ─── GET /sessions ────────────────────────────────────────────────────────────
@router.get("", response_model=List[SessionOut])
async def list_sessions(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    rows = await db.fetch(
        """
        SELECT
            s.id, s.user_id, s.major, s.role, s.level, s.mode, s.status,
            s.created_at, s.completed_at, s.time_limit_minutes,
            COUNT(DISTINCT sq.question_id)::int AS question_count,
            AVG(a.score)::float         AS avg_score
        FROM sessions s
        LEFT JOIN session_question_sets sq ON sq.session_id = s.id
        LEFT JOIN answers a ON a.session_id = s.id
        WHERE s.user_id = $1
        GROUP BY s.id
        ORDER BY s.created_at DESC
        """,
        current_user.id,
    )

    return [
        SessionOut(
            id=r["id"],
            user_id=r["user_id"],
            major=r["major"],
            role=r["role"],
            level=r["level"],
            mode=r["mode"],
            status=r["status"],
            created_at=r["created_at"],
            completed_at=r["completed_at"],
            question_count=r["question_count"],
            avg_score=round(r["avg_score"], 1) if r["avg_score"] is not None else None,
            time_limit_minutes=r["time_limit_minutes"],
        )
        for r in rows
    ]


@router.get("/exports/all-pdf")
async def export_all_sessions_pdf(
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    language = resolve_ui_language(request)
    await _require_export_access(db=db, user_id=current_user.id, language=language)
    session_ids = await db.fetch(
        "SELECT id FROM sessions WHERE user_id = $1 ORDER BY created_at DESC",
        current_user.id,
    )
    bundles = []
    for row in session_ids:
        bundle = await _load_session_bundle(db, session_id=row["id"], user_id=current_user.id)
        if bundle is not None:
            bundles.append(_session_pdf_payload(bundle, language))

    pdf_bytes = build_sessions_pdf(sessions=bundles, language=language, export_all=True)
    filename = build_session_pdf_filename("sessions", "all", True)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{session_id}/export-pdf")
async def export_session_pdf(
    session_id: uuid.UUID,
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    language = resolve_ui_language(request)
    await _require_export_access(db=db, user_id=current_user.id, language=language)
    bundle = await _load_session_bundle(db, session_id=session_id, user_id=current_user.id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    session_payload = _session_pdf_payload(bundle, language)
    pdf_bytes = build_sessions_pdf(sessions=[session_payload], language=language, export_all=False)
    filename = build_session_pdf_filename(
        bundle["session_row"]["role"],
        str(bundle["session_row"]["id"]),
        False,
    )
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── GET /sessions/{id} ───────────────────────────────────────────────────────
@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    bundle = await _load_session_bundle(db, session_id=session_id, user_id=current_user.id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    session_row = bundle["session_row"]
    answers_rows = bundle["answers_rows"]
    questions_rows = bundle["questions_rows"]
    avg_score = bundle["avg_score"]

    return SessionDetail(
        id=session_row["id"],
        user_id=session_row["user_id"],
        major=session_row["major"],
        role=session_row["role"],
        level=session_row["level"],
        mode=session_row["mode"],
        status=session_row["status"],
        created_at=session_row["created_at"],
        completed_at=session_row["completed_at"],
        avg_score=avg_score,
        question_count=len(questions_rows),
        time_limit_minutes=session_row["time_limit_minutes"],
        questions=[QuestionOut(**localized_question_dict(q)) for q in questions_rows],
        answers=[_serialize_answer_row(a) for a in answers_rows],
    )


# ─── POST /sessions/{id}/answers ─────────────────────────────────────────────
@router.post("/{session_id}/answers", response_model=AnswerOut)
async def submit_answer(
    session_id: uuid.UUID,
    body: AnswerSubmit,
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    # Verify session belongs to user and is still IN_PROGRESS
    session_row = await db.fetchrow(
        """
        SELECT id, status, major, role, level, created_at, time_limit_minutes
        FROM sessions
        WHERE id = $1 AND user_id = $2
        """,
        session_id, current_user.id,
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    if session_row["status"] != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Session đã hoàn thành, không thể nộp thêm câu trả lời")

    if session_row["time_limit_minutes"] is not None:
        deadline = session_row["created_at"] + timedelta(minutes=int(session_row["time_limit_minutes"]))
        if datetime.now(timezone.utc) >= deadline:
            await db.execute(
                """
                UPDATE sessions
                SET status = 'COMPLETED', completed_at = COALESCE(completed_at, NOW())
                WHERE id = $1 AND status = 'IN_PROGRESS'
                """,
                session_id,
            )
            ui_language = resolve_ui_language(request)
            detail = (
                "Đã hết thời gian của session này."
                if ui_language == "vi"
                else "This session has reached its time limit."
            )
            raise HTTPException(status_code=400, detail=detail)

    # Get ideal_answer for scoring
    question_row = await db.fetchrow(
        """
        SELECT q.text, q.text_en, q.text_vi,
               q.category, q.category_en, q.category_vi,
               q.difficulty,
               q.ideal_answer, q.ideal_answer_en, q.ideal_answer_vi
        FROM questions q
        LEFT JOIN session_question_sets sq
            ON sq.question_id = q.id
           AND sq.session_id = $2
        WHERE q.id = $1
          AND (
            sq.session_id IS NOT NULL
            OR (
                q.role = $3
                AND q.level = $4
                AND ($5::text IS NULL OR q.major = $5)
            )
          )
        """,
        body.question_id, session_id, session_row["role"], session_row["level"], session_row["major"],
    )
    if not question_row:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại")

    ui_language = resolve_ui_language(request)
    cleaned_answer_text = sanitize_user_text(body.answer_text)

    # Score the answer
    score, feedback = await score_answer(
        ScoringRequest(
            answer_text=cleaned_answer_text,
            ideal_answer=localized_question_field(question_row, "ideal_answer", ui_language),
            question_text=localized_question_field(question_row, "text", ui_language),
            role=session_row["role"],
            level=session_row["level"],
            category=localized_question_field(question_row, "category", ui_language),
            difficulty=question_row["difficulty"],
            preferred_language=ui_language,
        )
    )

    # Upsert answer (allow retry)
    existing = await db.fetchrow(
        "SELECT id FROM answers WHERE session_id = $1 AND question_id = $2",
        session_id, body.question_id,
    )

    if existing:
        answer_row = await db.fetchrow(
            """
            UPDATE answers
            SET answer_text = $1, score = $2, feedback = $3, submitted_at = NOW()
            WHERE session_id = $4 AND question_id = $5
            RETURNING id, session_id, question_id, answer_text, score::float AS score, feedback, submitted_at
            """,
            cleaned_answer_text, score, feedback, session_id, body.question_id,
        )
    else:
        answer_row = await db.fetchrow(
            """
            INSERT INTO answers (session_id, question_id, answer_text, score, feedback)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, session_id, question_id, answer_text, score::float AS score, feedback, submitted_at
            """,
            session_id, body.question_id, cleaned_answer_text, score, feedback,
        )

    return _serialize_answer_row(answer_row)


# ─── PUT /sessions/{id}/complete ─────────────────────────────────────────────
@router.put("/{session_id}/complete", response_model=SessionOut)
async def complete_session(
    session_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    session_row = await db.fetchrow(
        "SELECT id, status FROM sessions WHERE id = $1 AND user_id = $2",
        session_id, current_user.id,
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    updated = await db.fetchrow(
        """
        UPDATE sessions
        SET status = 'COMPLETED', completed_at = NOW()
        WHERE id = $1
        RETURNING id, user_id, major, role, level, mode, status, created_at, completed_at, time_limit_minutes
        """,
        session_id,
    )

    # Tính avg score
    avg_row = await db.fetchrow(
        "SELECT AVG(score)::float AS avg_score, COUNT(*)::int AS cnt FROM answers WHERE session_id = $1",
        session_id,
    )

    return SessionOut(
        id=updated["id"],
        user_id=updated["user_id"],
        major=updated["major"],
        role=updated["role"],
        level=updated["level"],
        mode=updated["mode"],
        status=updated["status"],
        created_at=updated["created_at"],
        completed_at=updated["completed_at"],
        avg_score=round(avg_row["avg_score"], 1) if avg_row["avg_score"] else None,
        question_count=avg_row["cnt"],
        time_limit_minutes=updated["time_limit_minutes"],
    )


# ─── GET /questions ────────────────────────────────────────────────────────────
@router.get("/questions/list", response_model=List[QuestionOut])
async def list_questions(
    role: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if role and level:
        rows = await db.fetch(
            """
            SELECT id, major, role, level, text, text_en, text_vi,
                   category, category_en, category_vi,
                   difficulty, tags
            FROM questions
            WHERE role = $1 AND level = $2
            ORDER BY id
            """,
            role, level,
        )
    elif role:
        rows = await db.fetch(
            """
            SELECT id, major, role, level, text, text_en, text_vi,
                   category, category_en, category_vi,
                   difficulty, tags
            FROM questions
            WHERE role = $1
            ORDER BY id
            """,
            role,
        )
    else:
        rows = await db.fetch(
            """
            SELECT id, major, role, level, text, text_en, text_vi,
                   category, category_en, category_vi,
                   difficulty, tags
            FROM questions
            ORDER BY id
            LIMIT 50
            """
        )
    return [QuestionOut(**localized_question_dict(r)) for r in rows]
