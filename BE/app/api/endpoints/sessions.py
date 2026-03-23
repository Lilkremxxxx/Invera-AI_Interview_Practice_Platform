import uuid
from typing import List, Optional
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.session import get_db
from app.api.endpoints.auth import get_current_user
from app.schemas.user import UserOut
from app.schemas.session import SessionCreate, SessionOut, SessionDetail
from app.schemas.question import QuestionOut
from app.schemas.answer import AnswerSubmit, AnswerOut
from app.services.plans import get_user_plan_snapshot
from app.services.scoring import ScoringRequest, score_answer

router = APIRouter()


# ─── POST /sessions ──────────────────────────────────────────────────────────
@router.post("", response_model=SessionDetail)
async def create_session(
    body: SessionCreate,
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
    valid_roles = {'frontend', 'backend', 'fullstack'}
    valid_levels = {'intern', 'junior', 'mid'}
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role không hợp lệ. Chọn: {valid_roles}")
    if body.level not in valid_levels:
        raise HTTPException(status_code=400, detail=f"Level không hợp lệ. Chọn: {valid_levels}")

    count = max(1, min(body.question_count, 15))

    # Lấy ngẫu nhiên câu hỏi cho role+level
    questions = await db.fetch(
        """
        SELECT id, role, level, text, category, difficulty
        FROM questions
        WHERE role = $1 AND level = $2
        ORDER BY RANDOM()
        LIMIT $3
        """,
        body.role, body.level, count,
    )

    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"Chưa có câu hỏi cho role={body.role}, level={body.level}"
        )

    # Tạo session
    session_row = await db.fetchrow(
        """
        INSERT INTO sessions (user_id, role, level, mode, status)
        VALUES ($1, $2, $3, $4, 'IN_PROGRESS')
        RETURNING id, user_id, role, level, mode, status, created_at, completed_at
        """,
        current_user.id, body.role, body.level, body.mode,
    )

    return SessionDetail(
        id=session_row["id"],
        user_id=session_row["user_id"],
        role=session_row["role"],
        level=session_row["level"],
        mode=session_row["mode"],
        status=session_row["status"],
        created_at=session_row["created_at"],
        completed_at=session_row["completed_at"],
        questions=[QuestionOut(**dict(q)) for q in questions],
        answers=[],
    )


# ─── GET /sessions ────────────────────────────────────────────────────────────
@router.get("", response_model=List[SessionOut])
async def list_sessions(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    rows = await db.fetch(
        """
        SELECT
            s.id, s.user_id, s.role, s.level, s.mode, s.status,
            s.created_at, s.completed_at,
            COUNT(a.id)::int            AS question_count,
            AVG(a.score)::float         AS avg_score
        FROM sessions s
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
            role=r["role"],
            level=r["level"],
            mode=r["mode"],
            status=r["status"],
            created_at=r["created_at"],
            completed_at=r["completed_at"],
            question_count=r["question_count"],
            avg_score=round(r["avg_score"], 1) if r["avg_score"] is not None else None,
        )
        for r in rows
    ]


# ─── GET /sessions/{id} ───────────────────────────────────────────────────────
@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    session_row = await db.fetchrow(
        "SELECT * FROM sessions WHERE id = $1 AND user_id = $2",
        session_id, current_user.id,
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    # Lấy answers đã nộp và join với questions để biết câu hỏi nào đã trả lời
    answers_rows = await db.fetch(
        """
        SELECT a.id, a.session_id, a.question_id, a.answer_text,
               a.score, a.feedback, a.submitted_at
        FROM answers a
        WHERE a.session_id = $1
        ORDER BY a.submitted_at
        """,
        session_id,
    )

    answered_question_ids = {a["question_id"] for a in answers_rows}

    # Lấy câu hỏi: ưu tiên lấy từ answers đã nộp, nếu chưa có answers thì lấy theo role/level
    questions_rows = await db.fetch(
        """
        SELECT DISTINCT q.id, q.role, q.level, q.text, q.category, q.difficulty
        FROM questions q
        JOIN answers a ON a.question_id = q.id
        WHERE a.session_id = $1
        ORDER BY q.id
        """,
        session_id,
    )

    # Nếu session mới (IN_PROGRESS, chưa có answers) → lấy câu hỏi theo role/level để FE vẫn có data
    if not questions_rows and session_row["status"] == "IN_PROGRESS":
        questions_rows = await db.fetch(
            """
            SELECT id, role, level, text, category, difficulty
            FROM questions
            WHERE role = $1 AND level = $2
            ORDER BY id
            LIMIT 15
            """,
            session_row["role"], session_row["level"],
        )

    avg_score = None
    if answers_rows:
        avg_score = round(sum(a["score"] for a in answers_rows) / len(answers_rows), 1)

    return SessionDetail(
        id=session_row["id"],
        user_id=session_row["user_id"],
        role=session_row["role"],
        level=session_row["level"],
        mode=session_row["mode"],
        status=session_row["status"],
        created_at=session_row["created_at"],
        completed_at=session_row["completed_at"],
        avg_score=avg_score,
        question_count=len(answers_rows),
        questions=[QuestionOut(**dict(q)) for q in questions_rows],
        answers=[AnswerOut(**dict(a)) for a in answers_rows],
    )


# ─── POST /sessions/{id}/answers ─────────────────────────────────────────────
@router.post("/{session_id}/answers", response_model=AnswerOut)
async def submit_answer(
    session_id: uuid.UUID,
    body: AnswerSubmit,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    # Verify session belongs to user and is still IN_PROGRESS
    session_row = await db.fetchrow(
        "SELECT id, status, role, level FROM sessions WHERE id = $1 AND user_id = $2",
        session_id, current_user.id,
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    if session_row["status"] != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Session đã hoàn thành, không thể nộp thêm câu trả lời")

    # Get ideal_answer for scoring
    question_row = await db.fetchrow(
        """
        SELECT text, category, difficulty, ideal_answer
        FROM questions
        WHERE id = $1
        """,
        body.question_id,
    )
    if not question_row:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại")

    # Score the answer
    score, feedback = await score_answer(
        ScoringRequest(
            answer_text=body.answer_text,
            ideal_answer=question_row["ideal_answer"],
            question_text=question_row["text"],
            role=session_row["role"],
            level=session_row["level"],
            category=question_row["category"],
            difficulty=question_row["difficulty"],
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
            RETURNING id, session_id, question_id, answer_text, score, feedback, submitted_at
            """,
            body.answer_text, score, feedback, session_id, body.question_id,
        )
    else:
        answer_row = await db.fetchrow(
            """
            INSERT INTO answers (session_id, question_id, answer_text, score, feedback)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, session_id, question_id, answer_text, score, feedback, submitted_at
            """,
            session_id, body.question_id, body.answer_text, score, feedback,
        )

    return AnswerOut(**dict(answer_row))


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
        RETURNING id, user_id, role, level, mode, status, created_at, completed_at
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
        role=updated["role"],
        level=updated["level"],
        mode=updated["mode"],
        status=updated["status"],
        created_at=updated["created_at"],
        completed_at=updated["completed_at"],
        avg_score=round(avg_row["avg_score"], 1) if avg_row["avg_score"] else None,
        question_count=avg_row["cnt"],
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
            "SELECT id, role, level, text, category, difficulty FROM questions WHERE role=$1 AND level=$2 ORDER BY id",
            role, level,
        )
    elif role:
        rows = await db.fetch(
            "SELECT id, role, level, text, category, difficulty FROM questions WHERE role=$1 ORDER BY id",
            role,
        )
    else:
        rows = await db.fetch(
            "SELECT id, role, level, text, category, difficulty FROM questions ORDER BY id LIMIT 50"
        )
    return [QuestionOut(**dict(r)) for r in rows]
