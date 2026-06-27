import uuid
import random
import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import asyncpg
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect, status, BackgroundTasks
from fastapi.responses import StreamingResponse
import re
from jose import JWTError, jwt

from app.db.session import create_pool, get_db
from app.api.endpoints.auth import get_current_user, _load_user_out_by_email
from app.core.config import settings
from app.core.question_bank import (
    QUESTION_BANK_ROLES,
    VALID_LEVELS,
    localized_question_dict,
    localized_question_field,
    resolve_ui_language,
)
from app.core.text_processing import sanitize_user_text
from app.schemas.user import UserOut
from app.schemas.session import (
    SessionCatalogRole,
    SessionCreate,
    SessionOut,
    SessionDetail,
    TelemetryAnswerPoint,
    TelemetryOverviewOut,
    TelemetrySessionOverview,
    TelemetrySummary,
)
from app.schemas.question import QuestionOut
from app.schemas.answer import AnswerSubmit, AnswerOut, AnswerTranscriptOut, AnswerTtsOut, FollowUpSubmit
from app.services.deepseek_client import DeepSeekAPIError
from app.services.interview_stt import InterviewSttRuntimeError, transcribe_audio_bytes
from app.services.adaptive_interview import (
    generate_follow_up_question,
    score_follow_up_answer,
)
from app.services.plans import can_export_sessions, get_user_plan_snapshot
from app.services.session_pdf import build_session_pdf_filename, build_sessions_pdf
from app.services.session_docx import build_session_docx_filename, build_sessions_docx
from app.services.question_bank_seed import (
    ensure_question_bank_minimum,
    translate_questions_to_vi_if_needed,
    translate_questions_to_en_if_needed,
)
from app.services.scoring import ScoringRequest, score_answer
from app.services.interview_tts import build_feedback_tts_script, synthesize_feedback_audio
from app.services.transcript_cleanup import correct_transcript_text
from app.core.security import SECRET_KEY, ALGORITHM
from app.services.gemini_live import GeminiLiveAgentError, stream_agent_prompt

router = APIRouter()

ALLOWED_STT_CONTENT_TYPES = {
    "audio/webm",
    "video/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp4",
    "audio/ogg",
    "application/octet-stream",
}

LEVEL_LABELS = {
    "intern": {"vi": "Intern", "en": "Intern"},
    "fresher": {"vi": "Fresher", "en": "Fresher"},
    "junior": {"vi": "Junior", "en": "Junior"},
    "mid": {"vi": "Mid-level", "en": "Mid-level"},
    "senior": {"vi": "Senior", "en": "Senior"},
}
MODE_LABELS = {
    "text": {"vi": "Văn bản", "en": "Text"},
    "video": {"vi": "Video", "en": "Video"},
    "camera": {"vi": "Camera", "en": "Camera"},
    "live": {"vi": "Live session", "en": "Live session"},
}
ALLOWED_SESSION_MODES = {"camera", "live"}
STT_SEMAPHORE = asyncio.Semaphore(max(1, settings.interview_stt_concurrency))
TTS_SEMAPHORE = asyncio.Semaphore(max(1, settings.interview_tts_concurrency))
SCORING_SEMAPHORE = asyncio.Semaphore(max(1, settings.deepseek_scoring_concurrency))


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


def _normalize_question_text(text: str | None) -> str:
    if not text:
        return ""
    import re
    text = text.lower()
    text = re.sub(r"[^\w\s\d]", "", text)
    return " ".join(text.split())


async def _load_user_resume_questions(db: asyncpg.Connection, user_id) -> list[dict]:
    row = await db.fetchrow(
        """
        SELECT resume_questions
        FROM users
        WHERE id = $1
        """,
        user_id,
    )
    if not row:
        return []
    questions = row.get("resume_questions") if isinstance(row, dict) else row["resume_questions"]
    return questions if isinstance(questions, list) else []


def _build_cv_question_rows(
    *,
    major: str,
    role: str,
    level: str,
    stored_questions: list[dict],
    count: int,
) -> list[dict]:
    cv_candidates = [
        question for question in stored_questions
        if isinstance(question, dict) and "CV-based" in (question.get("tags") or [])
    ]
    if not cv_candidates:
        return []

    random.shuffle(cv_candidates)
    selected = cv_candidates[:count]
    rows: list[dict] = []
    for index, question in enumerate(selected, start=90):
        rows.append(
            {
                "id": index,
                "major": major,
                "role": role,
                "level": level,
                "text": question.get("text_en") or question.get("text_vi") or "",
                "text_en": question.get("text_en") or question.get("text_vi") or "",
                "text_vi": question.get("text_vi") or question.get("text_en") or "",
                "category": question.get("category_en") or question.get("category_vi") or "Projects",
                "category_en": question.get("category_en") or question.get("category_vi") or "Projects",
                "category_vi": question.get("category_vi") or question.get("category_en") or "Dự án",
                "difficulty": question.get("difficulty") or "medium",
                "tags": question.get("tags") or ["CV-based"],
            }
        )
    return rows


def _are_questions_duplicate(q1, q2) -> bool:
    texts1 = {
        _normalize_question_text(q1.get("text")),
        _normalize_question_text(q1.get("text_en")),
        _normalize_question_text(q1.get("text_vi")),
    } - {""}
    
    texts2 = {
        _normalize_question_text(q2.get("text")),
        _normalize_question_text(q2.get("text_en")),
        _normalize_question_text(q2.get("text_vi")),
    } - {""}
    
    if not texts1 or not texts2:
        return False
        
    if texts1.intersection(texts2):
        return True
        
    for t1 in texts1:
        w1 = set(t1.split())
        if not w1:
            continue
        for t2 in texts2:
            w2 = set(t2.split())
            if not w2:
                continue
            intersection = len(w1.intersection(w2))
            union = len(w1.union(w2))
            if union > 0 and (intersection / union) > 0.75:
                return True
                
    return False


async def _fetch_session_questions(
    db: asyncpg.Connection,
    *,
    major: str,
    role: str,
    level: str,
    count: int,
):
    limit = max(150, count * 10)
    candidates = await db.fetch(
        """
        SELECT id, major, role, level, text, text_en, text_vi,
               category, category_en, category_vi,
               difficulty, tags
        FROM questions
        WHERE major = $1 AND role = $2 AND level = $3 AND user_id IS NULL
        ORDER BY RANDOM()
        LIMIT $4
        """,
        major, role, level, limit,
    )
    
    unique_questions = []
    for cand in candidates:
        is_dup = False
        for uq in unique_questions:
            if _are_questions_duplicate(cand, uq):
                is_dup = True
                break
        if not is_dup:
            unique_questions.append(cand)
            if len(unique_questions) >= count:
                break
                
    return unique_questions



def _avoid_repeated_first_question(questions, previous_first_question_id):
    if not previous_first_question_id or len(questions) <= 1:
        return questions
    if questions[0]["id"] != previous_first_question_id:
        return questions

    for index, question in enumerate(questions[1:], start=1):
        if question["id"] != previous_first_question_id:
            return questions[index:] + questions[:index]
    return questions


def _humanize_role_label(role: str) -> str:
    return role.replace("_", " ").title()


def _serialize_answer_row(answer_row, *, tts_script: str | None = None, tts_audio_url: str | None = None) -> AnswerOut:
    import json
    raw_telemetry = answer_row.get("telemetry_data")
    telemetry_dict = None
    if raw_telemetry:
        if isinstance(raw_telemetry, str):
            try:
                telemetry_dict = json.loads(raw_telemetry)
            except ValueError:
                pass
        elif isinstance(raw_telemetry, dict):
            telemetry_dict = raw_telemetry

    return AnswerOut(
        id=answer_row["id"],
        session_id=answer_row["session_id"],
        question_id=answer_row["question_id"],
        answer_text=sanitize_user_text(answer_row["answer_text"]),
        score=float(answer_row["score"]),
        feedback=answer_row["feedback"],
        telemetry_data=telemetry_dict,
        follow_up_id=answer_row.get("follow_up_id"),
        follow_up_style=answer_row.get("follow_up_style"),
        follow_up_question_text=answer_row.get("follow_up_question_text"),
        follow_up_answer_text=answer_row.get("follow_up_answer_text"),
        follow_up_score=(
            float(answer_row["follow_up_score"])
            if answer_row.get("follow_up_score") is not None
            else None
        ),
        follow_up_feedback=answer_row.get("follow_up_feedback"),
        follow_up_telemetry_data=answer_row.get("follow_up_telemetry_data"),
        follow_up_generated_at=answer_row.get("follow_up_generated_at"),
        follow_up_answered_at=answer_row.get("follow_up_answered_at"),
        tts_script=tts_script,
        tts_audio_url=tts_audio_url,
        submitted_at=answer_row["submitted_at"],
    )


async def _cleanup_transcript_for_question(
    *,
    db: asyncpg.Connection,
    session_id: uuid.UUID,
    question_id: int | None,
    transcript: str,
    language: str | None,
) -> str:
    if question_id is None:
        return transcript

    question_row = await db.fetchrow(
        """
        SELECT q.id, q.text, q.text_en, q.text_vi
        FROM questions q
        JOIN session_question_sets sq
          ON sq.question_id = q.id
         AND sq.session_id = $1
        WHERE q.id = $2
        """,
        session_id, question_id,
    )
    if not question_row:
        return transcript

    cleanup_language = "vi" if str(language or "").strip().lower() == "vi" else "en"
    return await correct_transcript_text(
        transcript=transcript,
        question_text=localized_question_field(question_row, "text", cleanup_language),
        language=cleanup_language,
    )


async def _authenticate_ws_user(websocket: WebSocket, db: asyncpg.Connection) -> UserOut:
    token = websocket.query_params.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token.",
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if not email:
          raise HTTPException(
              status_code=status.HTTP_401_UNAUTHORIZED,
              detail="Invalid access token.",
          )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
        ) from exc

    return await _load_user_out_by_email(db, email)


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
               a.score::float AS score, a.feedback, a.telemetry_data, a.submitted_at,
               fu.id AS follow_up_id,
               fu.follow_up_style,
               fu.question_text AS follow_up_question_text,
               fu.answer_text AS follow_up_answer_text,
               fu.score::float AS follow_up_score,
               fu.feedback AS follow_up_feedback,
               fu.telemetry_data AS follow_up_telemetry_data,
               fu.generated_at AS follow_up_generated_at,
               fu.answered_at AS follow_up_answered_at
        FROM answers a
        LEFT JOIN interview_follow_ups fu ON fu.parent_answer_id = a.id
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
              AND q.user_id IS NULL
            ORDER BY a.submitted_at NULLS LAST, q.id
            LIMIT 15
            """,
            session_id, session_row["role"], session_row["level"], session_row["major"],
        )

    custom_questions = session_row["custom_questions"] if "custom_questions" in session_row else None
    if isinstance(custom_questions, list) and custom_questions:
        questions_rows = [*questions_rows, *custom_questions]

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
        "evaluation_report": session_row["evaluation_report"] if "evaluation_report" in session_row else None,
        "practice_plan": session_row["practice_plan"] if "practice_plan" in session_row else None,
    }


def _coerce_telemetry_data(raw_value) -> dict | None:
    if not raw_value:
        return None
    if isinstance(raw_value, dict):
        return raw_value
    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value)
        except ValueError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def _telemetry_summary_from_points(points: list[dict]) -> TelemetrySummary:
    if not points:
        return TelemetrySummary()

    accumulators = {
        "gaze": [],
        "posture": [],
        "wpm": [],
        "fillers": [],
        "confidence": [],
        "blink": [],
        "tension": [],
    }
    for point in points:
        telemetry = _coerce_telemetry_data(point.get("telemetry_data"))
        if not telemetry:
            continue
        if isinstance(telemetry.get("gazeRatio"), (int, float)):
            accumulators["gaze"].append(round(float(telemetry["gazeRatio"]) * 100))
        posture_ratio = telemetry.get("bodyPostureScore")
        if not isinstance(posture_ratio, (int, float)) and isinstance(telemetry.get("slouchRatio"), (int, float)):
            posture_ratio = 1 - float(telemetry["slouchRatio"])
        if isinstance(posture_ratio, (int, float)):
            accumulators["posture"].append(round(float(posture_ratio) * 100))
        if isinstance(telemetry.get("speakingPace"), (int, float)):
            accumulators["wpm"].append(round(float(telemetry["speakingPace"])))
        if isinstance(telemetry.get("fillerWordsCount"), (int, float)):
            accumulators["fillers"].append(round(float(telemetry["fillerWordsCount"])))
        if isinstance(telemetry.get("presentationConfidence"), (int, float)):
            accumulators["confidence"].append(round(float(telemetry["presentationConfidence"])))
        if isinstance(telemetry.get("blinkRatio"), (int, float)):
            accumulators["blink"].append(round(float(telemetry["blinkRatio"]) * 100))
        if isinstance(telemetry.get("avgTensionScore"), (int, float)):
            accumulators["tension"].append(round(float(telemetry["avgTensionScore"]) * 100))

    def _avg(values: list[int]) -> int:
        if not values:
            return 0
        return round(sum(values) / len(values))

    return TelemetrySummary(
        gaze=_avg(accumulators["gaze"]),
        posture=_avg(accumulators["posture"]),
        wpm=_avg(accumulators["wpm"]),
        fillers=_avg(accumulators["fillers"]),
        confidence=_avg(accumulators["confidence"]),
        blink=_avg(accumulators["blink"]),
        tension=_avg(accumulators["tension"]),
        answer_count=sum(1 for point in points if _coerce_telemetry_data(point.get("telemetry_data")) is not None),
    )


def _telemetry_point_from_row(*, row, label: str, question_id: int, is_follow_up: bool, score, submitted_at, telemetry_data) -> dict:
    return {
        "label": label,
        "question_id": question_id,
        "is_follow_up": is_follow_up,
        "score": float(score) if score is not None else None,
        "submitted_at": submitted_at,
        "telemetry_data": _coerce_telemetry_data(telemetry_data),
    }


def _validate_stt_upload(upload: UploadFile):
    if upload.content_type and upload.content_type not in ALLOWED_STT_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Định dạng audio chưa được hỗ trợ cho STT.")


def _question_time_limit_expired(question_started_at: datetime | None, *, limit_minutes: int = 5) -> bool:
    if question_started_at is None:
        return False
    started_at = question_started_at.astimezone(timezone.utc) if question_started_at.tzinfo else question_started_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) >= started_at + timedelta(minutes=limit_minutes)


async def _upsert_follow_up_question(
    *,
    db: asyncpg.Connection,
    session_id: uuid.UUID,
    answer_id: uuid.UUID,
    answer_text: str,
    score: float,
    question_row,
    language: str,
    telemetry_data: dict | None = None,
) -> dict | None:
    generated = await generate_follow_up_question(
        question_text=localized_question_field(question_row, "text", language),
        answer_text=answer_text,
        score=score,
        language=language,
        category=localized_question_field(question_row, "category", language),
        role=question_row["role"],
        level=question_row["level"],
        telemetry_data=telemetry_data,
    )
    follow_up_question_text = generated["follow_up_question_text"].strip()
    if not follow_up_question_text:
        return None

    row = await db.fetchrow(
        """
        INSERT INTO interview_follow_ups (
            session_id, parent_answer_id, follow_up_style, question_text
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (parent_answer_id) DO UPDATE
        SET follow_up_style = EXCLUDED.follow_up_style,
            question_text = EXCLUDED.question_text,
            generated_at = NOW()
        RETURNING id, session_id, parent_answer_id, follow_up_style, question_text,
                  answer_text, score::float AS score, feedback, telemetry_data,
                  generated_at, answered_at
        """,
        session_id,
        answer_id,
        generated["follow_up_style"],
        follow_up_question_text,
    )
    return dict(row) if row else None


_generating_reports: set[uuid.UUID] = set()


async def _wait_for_session_answers_ready(db: asyncpg.Connection, session_id: uuid.UUID, *, max_wait: int = 180) -> None:
    wait_interval = 2
    waited = 0
    while waited < max_wait:
        pending_count = await db.fetchval(
            "SELECT COUNT(*)::int FROM answers WHERE session_id = $1 AND feedback = 'PENDING'",
            session_id,
        )
        if pending_count == 0:
            return
        await asyncio.sleep(wait_interval)
        waited += wait_interval

async def _generate_session_report_background(*, session_id: uuid.UUID, language: str) -> None:
    if session_id in _generating_reports:
        return
    _generating_reports.add(session_id)
    from app.services.evaluation import generate_session_evaluation_and_plan

    try:
        pool = await create_pool()
        async with pool.acquire() as conn:
            await _wait_for_session_answers_ready(conn, session_id)

            session_row = await conn.fetchrow(
                """
                SELECT id, role, level, major, status, evaluation_report, practice_plan
                FROM sessions
                WHERE id = $1
                """,
                session_id,
            )
            if not session_row or session_row["status"] != "COMPLETED":
                return
            if session_row["evaluation_report"] and session_row["practice_plan"]:
                return

            evaluation_report, practice_plan = await generate_session_evaluation_and_plan(
                conn,
                session_id=session_id,
                role=session_row["role"],
                level=session_row["level"],
                major=session_row["major"],
                language=language,
            )
            await conn.execute(
                """
                UPDATE sessions
                SET evaluation_report = $1, practice_plan = $2
                WHERE id = $3
                """,
                evaluation_report,
                practice_plan,
                session_id,
            )
    except Exception as e:
        print(f"Error generating background session report for {session_id}: {e}")
    finally:
        _generating_reports.discard(session_id)


_active_report_tasks: set[asyncio.Task] = set()

def _schedule_session_report_generation(*, session_id: uuid.UUID, language: str) -> None:
    task = asyncio.create_task(_generate_session_report_background(session_id=session_id, language=language))
    _active_report_tasks.add(task)
    task.add_done_callback(_active_report_tasks.discard)


# ─── POST /sessions ──────────────────────────────────────────────────────────
@router.post("", response_model=SessionDetail)
async def create_session(
    body: SessionCreate,
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    ui_language = resolve_ui_language(request)
    entitlement = await get_user_plan_snapshot(db, current_user.id)
    if not entitlement["can_start_new_session"]:
        detail = (
            "Bạn đã dùng hết số phiên phỏng vấn cho phép. Hãy mua thêm session hoặc nâng cấp gói để tiếp tục."
            if ui_language == "vi"
            else "You have run out of available sessions. Please purchase more sessions or upgrade your plan to continue."
        )
        raise HTTPException(
            status_code=403,
            detail=detail,
        )

    # Validate role/level combo
    major = body.major.strip().lower()
    role = body.role.strip().lower()
    level = body.level.strip().lower()
    session_language = str(body.language or ui_language).strip().lower()

    if major not in QUESTION_BANK_ROLES:
        raise HTTPException(status_code=400, detail=f"Major không hợp lệ. Chọn: {sorted(QUESTION_BANK_ROLES.keys())}")
    if role not in QUESTION_BANK_ROLES[major]:
        raise HTTPException(status_code=400, detail=f"Role không hợp lệ cho major={major}")
    if level not in VALID_LEVELS:
        raise HTTPException(status_code=400, detail=f"Level không hợp lệ. Chọn: {VALID_LEVELS}")

    count = max(1, min(body.question_count, 15))
    mode = body.mode.strip().lower()
    if mode not in ALLOWED_SESSION_MODES:
        detail = (
            "Mode trả lời không hợp lệ. Chỉ hỗ trợ Camera hoặc Live session."
            if ui_language == "vi"
            else "Invalid answer mode. Only Camera or Live session are supported."
        )
        raise HTTPException(status_code=400, detail=detail)
    if session_language not in {"vi", "en"}:
        raise HTTPException(status_code=400, detail="Language không hợp lệ. Chọn: vi hoặc en.")

    plan_tier = entitlement.get("plan_tier", "free")
    plan_status = entitlement.get("plan_status", "inactive")
    is_pro_or_above = (plan_tier in ("pro", "premium", "admin") and plan_status == "active") or current_user.is_admin
    if mode == "live" and not is_pro_or_above:
        detail = (
            "Live session chỉ khả dụng với gói Pro hoặc Premium."
            if ui_language == "vi"
            else "Live session is only available on the Pro or Premium plan."
        )
        raise HTTPException(status_code=403, detail=detail)

    requested_time_limit = None

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

    previous_first_question_id = await db.fetchval(
        """
        SELECT sq.question_id
        FROM sessions s
        JOIN session_question_sets sq ON sq.session_id = s.id AND sq.position = 1
        WHERE s.user_id = $1
          AND s.major = $2
          AND s.role = $3
          AND s.level = $4
        ORDER BY s.created_at DESC
        LIMIT 1
        """,
        current_user.id, major, role, level,
    )
    questions = _avoid_repeated_first_question(questions, previous_first_question_id)
    bank_questions = list(questions)

    stored_resume_questions = await _load_user_resume_questions(db, current_user.id)
    cv_questions = _build_cv_question_rows(
        major=major,
        role=role,
        level=level,
        stored_questions=stored_resume_questions,
        count=random.randint(1, 2),
    )
    if cv_questions:
        questions.extend(cv_questions)

    if session_language == "vi":
        questions = await translate_questions_to_vi_if_needed(db, questions)
    else:
        questions = await translate_questions_to_en_if_needed(db, questions)

    # Determine if this session consumes a purchased extra session
    base_limit = 1
    if entitlement["plan_tier"] == "basic" and entitlement["plan_status"] == "active":
        base_limit = 5
    elif entitlement["plan_tier"] == "pro" and entitlement["plan_status"] == "active":
        base_limit = 8
    elif entitlement["plan_tier"] == "premium" and entitlement["plan_status"] == "active":
        base_limit = 12

    deduct_additional = (
        not entitlement.get("is_billing_exempt", False)
        and not entitlement.get("is_admin", False)
        and entitlement.get("sessions_used", 0) >= base_limit
    )

    async with db.transaction():
        if deduct_additional:
            await db.execute(
                """
                UPDATE users
                SET additional_sessions = GREATEST(0, additional_sessions - 1),
                    updated_at = NOW()
                WHERE id = $1
                """,
                current_user.id,
            )
        session_row = await db.fetchrow(
            """
            INSERT INTO sessions (user_id, major, role, level, mode, language, status, time_limit_minutes, custom_questions)
            VALUES ($1, $2, $3, $4, $5, $6, 'IN_PROGRESS', $7, $8::jsonb)
            RETURNING id, user_id, major, role, level, mode, language, status, created_at, completed_at, time_limit_minutes
            """,
            current_user.id, major, role, level, mode, session_language, requested_time_limit, json.dumps(cv_questions) if cv_questions else None,
        )
        await db.executemany(
            """
            INSERT INTO session_question_sets (session_id, question_id, position)
            VALUES ($1, $2, $3)
            ON CONFLICT (session_id, question_id) DO NOTHING
            """,
            [(session_row["id"], question["id"], index) for index, question in enumerate(bank_questions, start=1)],
        )

    return SessionDetail(
        id=session_row["id"],
        user_id=session_row["user_id"],
        major=session_row["major"],
        role=session_row["role"],
        level=session_row["level"],
        mode=session_row["mode"],
        language=session_row["language"],
        status=session_row["status"],
        created_at=session_row["created_at"],
        completed_at=session_row["completed_at"],
        time_limit_minutes=session_row["time_limit_minutes"],
        questions=[QuestionOut(**localized_question_dict(q, language=ui_language)) for q in questions],
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
        WHERE user_id IS NULL
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
            s.id, s.user_id, s.major, s.role, s.level, s.mode, s.language, s.status,
            s.created_at, s.completed_at, s.time_limit_minutes,
            s.evaluation_report, s.practice_plan,
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
            language=r["language"],
            status=r["status"],
            created_at=r["created_at"],
            completed_at=r["completed_at"],
            question_count=r["question_count"],
            avg_score=round(r["avg_score"], 1) if r["avg_score"] is not None else None,
            time_limit_minutes=r["time_limit_minutes"],
            evaluation_report=r["evaluation_report"],
            practice_plan=r["practice_plan"],
        )
        for r in rows
    ]


@router.get("/telemetry/overview", response_model=TelemetryOverviewOut)
async def get_telemetry_overview(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    session_rows = await db.fetch(
        """
        SELECT
            s.id AS session_id,
            s.role,
            s.level,
            s.mode,
            s.created_at,
            s.completed_at,
            AVG(a.score)::float AS avg_score
        FROM sessions s
        LEFT JOIN answers a ON a.session_id = s.id
        WHERE s.user_id = $1
        GROUP BY s.id
        ORDER BY s.created_at DESC
        """,
        current_user.id,
    )

    answer_rows = await db.fetch(
        """
        SELECT
            s.id AS session_id,
            sq.position,
            a.question_id,
            a.score::float AS answer_score,
            a.submitted_at AS answer_submitted_at,
            a.telemetry_data AS answer_telemetry_data,
            fu.id AS follow_up_id,
            fu.score::float AS follow_up_score,
            fu.answered_at AS follow_up_submitted_at,
            fu.telemetry_data AS follow_up_telemetry_data
        FROM sessions s
        JOIN answers a ON a.session_id = s.id
        LEFT JOIN session_question_sets sq
          ON sq.session_id = s.id
         AND sq.question_id = a.question_id
        LEFT JOIN interview_follow_ups fu ON fu.parent_answer_id = a.id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC, sq.position ASC NULLS LAST, a.submitted_at ASC
        """,
        current_user.id,
    )

    points_by_session: dict[uuid.UUID, list[dict]] = {}
    for row in answer_rows:
        session_id = row["session_id"]
        position = row["position"] or 0
        session_points = points_by_session.setdefault(session_id, [])

        answer_point = _telemetry_point_from_row(
            row=row,
            label=f"Q{position}",
            question_id=row["question_id"],
            is_follow_up=False,
            score=row["answer_score"],
            submitted_at=row["answer_submitted_at"],
            telemetry_data=row["answer_telemetry_data"],
        )
        session_points.append(answer_point)

        if row.get("follow_up_id") is not None:
            follow_up_point = _telemetry_point_from_row(
                row=row,
                label=f"Q{position}b",
                question_id=row["question_id"],
                is_follow_up=True,
                score=row["follow_up_score"],
                submitted_at=row["follow_up_submitted_at"],
                telemetry_data=row["follow_up_telemetry_data"],
            )
            session_points.append(follow_up_point)

    sessions = []
    for row in session_rows:
        session_id = row["session_id"]
        points = points_by_session.get(session_id, [])
        if not points:
            continue
        sessions.append(
            TelemetrySessionOverview(
                session_id=session_id,
                role=row["role"],
                level=row["level"],
                mode=row["mode"],
                created_at=row["created_at"],
                completed_at=row["completed_at"],
                avg_score=round(row["avg_score"], 1) if row["avg_score"] is not None else None,
                summary=_telemetry_summary_from_points(points),
                answers=[TelemetryAnswerPoint(**point) for point in points],
            )
        )

    return TelemetryOverviewOut(sessions=sessions)


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


@router.get("/{session_id}/export-docx")
async def export_session_docx(
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
    docx_bytes = build_sessions_docx(sessions=[session_payload], language=language, export_all=False)
    filename = build_session_docx_filename(
        bundle["session_row"]["role"],
        str(bundle["session_row"]["id"]),
        False,
    )
    return StreamingResponse(
        iter([docx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── GET /sessions/{id} ───────────────────────────────────────────────────────
@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: uuid.UUID,
    request: Request,
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

    session_language = str(session_row["language"] or resolve_ui_language(request)).strip().lower()
    if session_language == "vi":
        questions_rows = await translate_questions_to_vi_if_needed(db, questions_rows)
    else:
        questions_rows = await translate_questions_to_en_if_needed(db, questions_rows)

    # Lazy generation if completed but report/plan is missing
    evaluation_report = session_row["evaluation_report"]
    practice_plan = session_row["practice_plan"]
    pending_count = await db.fetchval(
        "SELECT COUNT(*)::int FROM answers WHERE session_id = $1 AND feedback = 'PENDING'",
        session_id,
    )
    if session_row["status"] == "COMPLETED" and pending_count == 0 and (not evaluation_report or not practice_plan):
        _schedule_session_report_generation(session_id=session_id, language=session_language)

    return SessionDetail(
        id=session_row["id"],
        user_id=session_row["user_id"],
        major=session_row["major"],
        role=session_row["role"],
        level=session_row["level"],
        mode=session_row["mode"],
        language=session_row["language"],
        status=session_row["status"],
        created_at=session_row["created_at"],
        completed_at=session_row["completed_at"],
        avg_score=avg_score,
        question_count=len(questions_rows),
        time_limit_minutes=session_row["time_limit_minutes"],
        questions=[QuestionOut(**localized_question_dict(q, language=session_language)) for q in questions_rows],
        answers=[_serialize_answer_row(a) for a in answers_rows],
        evaluation_report=evaluation_report,
        practice_plan=practice_plan,
    )


async def process_voice_answer_background(
    answer_id: uuid.UUID,
    session_id: uuid.UUID,
    question_id: int,
    audio_bytes: bytes,
    filename: str,
    language: str | None,
    feedback_language: str,
    force_feedback_language: bool,
):
    telemetry_dict = None
    try:
        try:
            async with STT_SEMAPHORE:
                transcript = await asyncio.wait_for(
                    asyncio.to_thread(
                        transcribe_audio_bytes,
                        audio_bytes=audio_bytes,
                        original_filename=filename,
                        language=language,
                    ),
                    timeout=settings.interview_stt_timeout_seconds,
                )
        except Exception as exc:
            import traceback
            traceback.print_exc()
            transcript = f"[Lỗi STT: {str(exc)}]"
            print(f"Error in STT transcription for answer_id={answer_id}: {exc}")

        pool = await create_pool()
        async with pool.acquire() as db:
            cleaned_transcript = await _cleanup_transcript_for_question(
                db=db,
                session_id=session_id,
                question_id=question_id,
                transcript=transcript,
                language=language,
            )
            cleaned_answer_text = sanitize_user_text(cleaned_transcript)

            question_row = await db.fetchrow(
                """
                SELECT q.text, q.text_en, q.text_vi,
                       q.category, q.category_en, q.category_vi,
                       q.difficulty,
                       q.ideal_answer, q.ideal_answer_en, q.ideal_answer_vi,
                       s.role, s.level, s.major,
                       u.plan_tier, u.plan_status, u.resume_text
                FROM questions q
                JOIN sessions s ON s.id = $2
                JOIN users u ON u.id = s.user_id
                WHERE q.id = $1
                """,
                question_id, session_id,
            )
            if not question_row:
                return

            plan_tier = "free_trial"
            if question_row:
                plan_tier = question_row["plan_tier"] or "free_trial"
                if question_row["plan_status"] != "active":
                    plan_tier = "free_trial"

            try:
                async with SCORING_SEMAPHORE:
                    score, feedback = await score_answer(
                        ScoringRequest(
                            answer_text=cleaned_answer_text,
                            ideal_answer=localized_question_field(question_row, "ideal_answer", feedback_language),
                            question_text=localized_question_field(question_row, "text", feedback_language),
                            role=question_row["role"],
                            level=question_row["level"],
                            category=localized_question_field(question_row, "category", feedback_language),
                            difficulty=question_row["difficulty"],
                            major=question_row["major"],
                            preferred_language=feedback_language,
                            force_language=force_feedback_language,
                            telemetry_data=None,
                            plan_tier=plan_tier,
                            resume_text=question_row["resume_text"],
                        )
                    )
            except Exception as exc:
                score = 0
                feedback = f"Lỗi chấm điểm: {str(exc)}"

            await db.execute(
                """
                UPDATE answers
                SET answer_text = $1, score = $2, feedback = $3, submitted_at = NOW()
                WHERE id = $4
                """,
                cleaned_answer_text, score, feedback, answer_id,
            )

            await _upsert_follow_up_question(
                db=db,
                session_id=session_id,
                answer_id=answer_id,
                answer_text=cleaned_answer_text,
                score=float(score),
                question_row=question_row,
                language=feedback_language,
                telemetry_data=telemetry_dict,
            )
    except Exception as e:
        print(f"Error in process_voice_answer_background for answer_id={answer_id}: {e}")
        try:
            pool = await create_pool()
            async with pool.acquire() as db:
                await db.execute(
                    """
                    UPDATE answers
                    SET feedback = $1, score = 0, submitted_at = NOW()
                    WHERE id = $2 AND feedback = 'PENDING'
                    """,
                    f"Lỗi xử lý: {str(e)}",
                    answer_id,
                )
        except Exception as db_exc:
            print(f"Failed to update answer fallback for answer_id={answer_id}: {db_exc}")


async def process_video_answer_background(
    answer_id: uuid.UUID,
    session_id: uuid.UUID,
    question_id: int,
    video_bytes: bytes,
    filename: str,
    telemetry_data_str: str | None,
    language: str | None,
    feedback_language: str,
    force_feedback_language: bool,
):
    try:
        try:
            async with STT_SEMAPHORE:
                transcript = await asyncio.wait_for(
                    asyncio.to_thread(
                        transcribe_audio_bytes,
                        audio_bytes=video_bytes,
                        original_filename=filename,
                        language=language,
                    ),
                    timeout=settings.interview_stt_timeout_seconds,
                )
        except Exception as exc:
            import traceback
            traceback.print_exc()
            transcript = f"[Lỗi STT: {str(exc)}]"
            print(f"Error in video STT transcription for answer_id={answer_id}: {exc}")

        pool = await create_pool()
        async with pool.acquire() as db:
            cleaned_transcript = await _cleanup_transcript_for_question(
                db=db,
                session_id=session_id,
                question_id=question_id,
                transcript=transcript,
                language=language,
            )
            cleaned_answer_text = sanitize_user_text(cleaned_transcript)

            question_row = await db.fetchrow(
                """
                SELECT q.text, q.text_en, q.text_vi,
                       q.category, q.category_en, q.category_vi,
                       q.difficulty,
                       q.ideal_answer, q.ideal_answer_en, q.ideal_answer_vi,
                       s.role, s.level, s.major,
                       u.plan_tier, u.plan_status, u.resume_text
                FROM questions q
                JOIN sessions s ON s.id = $2
                JOIN users u ON u.id = s.user_id
                WHERE q.id = $1
                """,
                question_id, session_id,
            )
            if not question_row:
                return

            plan_tier = "free_trial"
            if question_row:
                plan_tier = question_row["plan_tier"] or "free_trial"
                if question_row["plan_status"] != "active":
                    plan_tier = "free_trial"

            import json
            telemetry_dict = None
            if telemetry_data_str:
                try:
                    telemetry_dict = json.loads(telemetry_data_str)
                except Exception:
                    pass

            # Recalculate WPM and fillers from the actual Whisper transcript
            if telemetry_dict is not None and cleaned_answer_text:
                word_count = len(re.findall(r"\b[^\s]+\b", cleaned_answer_text))
                duration_sec = telemetry_dict.get("recordingDurationSec", 0) or 0
                if duration_sec > 0 and word_count > 0:
                    telemetry_dict["speakingPace"] = round((word_count / duration_sec) * 60)
                # Recalculate filler words from actual transcript
                vi_fillers = {"ừm", "à", "thì", "là", "kiểu", "ờ", "dạ"}
                en_fillers = {"uh", "um", "like", "actually", "basically"}
                words = re.findall(r"\b[^\s]+\b", cleaned_answer_text.lower())
                filler_count = sum(1 for w in words if w.strip(".,!?;:") in vi_fillers or w.strip(".,!?;:") in en_fillers)
                text_lower = cleaned_answer_text.lower()
                filler_count += text_lower.count("kiểu như") + text_lower.count("you know")
                telemetry_dict["fillerWordsCount"] = filler_count
                telemetry_data_str = json.dumps(telemetry_dict, ensure_ascii=False)

            try:
                async with SCORING_SEMAPHORE:
                    score, feedback = await score_answer(
                        ScoringRequest(
                            answer_text=cleaned_answer_text,
                            ideal_answer=localized_question_field(question_row, "ideal_answer", feedback_language),
                            question_text=localized_question_field(question_row, "text", feedback_language),
                            role=question_row["role"],
                            level=question_row["level"],
                            category=localized_question_field(question_row, "category", feedback_language),
                            difficulty=question_row["difficulty"],
                            major=question_row["major"],
                            preferred_language=feedback_language,
                            force_language=force_feedback_language,
                            telemetry_data=telemetry_dict,
                            plan_tier=plan_tier,
                            resume_text=question_row["resume_text"],
                        )
                    )
            except Exception as exc:
                score = 0
                feedback = f"Lỗi chấm điểm: {str(exc)}"

            await db.execute(
                """
                UPDATE answers
                SET answer_text = $1, score = $2, feedback = $3, telemetry_data = $4, submitted_at = NOW()
                WHERE id = $5
                """,
                cleaned_answer_text, score, feedback, telemetry_data_str, answer_id,
            )

            await _upsert_follow_up_question(
                db=db,
                session_id=session_id,
                answer_id=answer_id,
                answer_text=cleaned_answer_text,
                score=float(score),
                question_row=question_row,
                language=feedback_language,
                telemetry_data=telemetry_dict,
            )
    except Exception as e:
        print(f"Error in process_video_answer_background for answer_id={answer_id}: {e}")
        try:
            pool = await create_pool()
            async with pool.acquire() as db:
                await db.execute(
                    """
                    UPDATE answers
                    SET feedback = $1, score = 0, submitted_at = NOW()
                    WHERE id = $2 AND feedback = 'PENDING'
                    """,
                    f"Lỗi xử lý: {str(e)}",
                    answer_id,
                )
        except Exception as db_exc:
            print(f"Failed to update answer fallback for answer_id={answer_id}: {db_exc}")


@router.post("/{session_id}/stt", response_model=AnswerTranscriptOut)
async def transcribe_session_audio(
    session_id: uuid.UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    language: str | None = Form(None),
    question_id: int | None = Form(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    session_row = await db.fetchrow(
        """
        SELECT id, language, status
        FROM sessions
        WHERE id = $1 AND user_id = $2
        """,
        session_id, current_user.id,
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    if session_row["status"] != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Session đã hoàn thành, không thể dùng STT nữa.")

    _validate_stt_upload(audio)
    raw_bytes = await audio.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="File audio trống.")

    max_bytes = settings.interview_stt_max_upload_mb * 1024 * 1024
    if len(raw_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File audio vượt quá giới hạn {settings.interview_stt_max_upload_mb}MB.",
        )

    existing = await db.fetchrow(
        "SELECT id FROM answers WHERE session_id = $1 AND question_id = $2",
        session_id, question_id,
    )
    if existing:
        answer_id = existing["id"]
        await db.execute(
            """
            UPDATE answers
            SET answer_text = 'Đang xử lý...', score = 0, feedback = 'PENDING', submitted_at = NOW()
            WHERE id = $1
            """,
            answer_id,
        )
    else:
        answer_id = await db.fetchval(
            """
            INSERT INTO answers (session_id, question_id, answer_text, score, feedback)
            VALUES ($1, $2, 'Đang xử lý...', 0, 'PENDING')
            RETURNING id
            """,
            session_id, question_id,
        )

    ui_language = resolve_ui_language(request)
    feedback_language = "vi" if str(language or ui_language).strip().lower() == "vi" else "en"

    background_tasks.add_task(
        process_voice_answer_background,
        answer_id=answer_id,
        session_id=session_id,
        question_id=question_id,
        audio_bytes=raw_bytes,
        filename=audio.filename or "recording.webm",
        language=language,
        feedback_language=feedback_language,
        force_feedback_language=language is not None,
    )

    return AnswerTranscriptOut(text="Đang xử lý...")


@router.post("/{session_id}/answer-video", response_model=AnswerTranscriptOut)
async def transcribe_session_video(
    session_id: uuid.UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    language: str | None = Form(None),
    telemetry_data: str | None = Form(None),
    question_id: int | None = Form(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    session_row = await db.fetchrow(
        """
        SELECT id, status
        FROM sessions
        WHERE id = $1 AND user_id = $2
        """,
        session_id, current_user.id,
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    if session_row["status"] != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Session đã hoàn thành, không thể dùng video STT nữa.")

    _validate_stt_upload(video)
    raw_bytes = await video.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="File video trống.")

    max_bytes = settings.interview_stt_max_upload_mb * 1024 * 1024
    if len(raw_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File video vượt quá giới hạn {settings.interview_stt_max_upload_mb}MB.",
        )

    import json
    telemetry_json = None
    if telemetry_data:
        try:
            json.loads(telemetry_data)
            telemetry_json = telemetry_data
        except ValueError:
            pass

    existing = await db.fetchrow(
        "SELECT id FROM answers WHERE session_id = $1 AND question_id = $2",
        session_id, question_id,
    )
    if existing:
        answer_id = existing["id"]
        await db.execute(
            """
            UPDATE answers
            SET answer_text = 'Đang xử lý...', score = 0, feedback = 'PENDING', telemetry_data = $1, submitted_at = NOW()
            WHERE id = $2
            """,
            telemetry_json, answer_id,
        )
    else:
        answer_id = await db.fetchval(
            """
            INSERT INTO answers (session_id, question_id, answer_text, score, feedback, telemetry_data)
            VALUES ($1, $2, 'Đang xử lý...', 0, 'PENDING', $3)
            RETURNING id
            """,
            session_id, question_id, telemetry_json,
        )

    ui_language = resolve_ui_language(request)
    feedback_language = "vi" if str(language or ui_language).strip().lower() == "vi" else "en"

    background_tasks.add_task(
        process_video_answer_background,
        answer_id=answer_id,
        session_id=session_id,
        question_id=question_id,
        video_bytes=raw_bytes,
        filename=video.filename or "recording.webm",
        telemetry_data_str=telemetry_json,
        language=language,
        feedback_language=feedback_language,
        force_feedback_language=language is not None,
    )

    return AnswerTranscriptOut(text="Đang xử lý...")


@router.websocket("/{session_id}/live-agent")
async def session_live_agent_stream(
    websocket: WebSocket,
    session_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
):
    try:
        current_user = await _authenticate_ws_user(websocket, db)
    except HTTPException:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    session_row = await db.fetchrow(
        """
        SELECT id, role, level, mode, language, status
        FROM sessions
        WHERE id = $1 AND user_id = $2
        """,
        session_id,
        current_user.id,
    )
    if not session_row:
        await websocket.close(code=4404, reason="Session not found")
        return
    if session_row["mode"] != "live":
        await websocket.close(code=4400, reason="Session is not live-enabled")
        return
    if session_row["status"] != "IN_PROGRESS":
        await websocket.close(code=4400, reason="Session is not in progress")
        return

    await websocket.accept()
    await websocket.send_json({"type": "ready"})

    try:
        while True:
            payload = await websocket.receive_json()
            if payload.get("type") != "ask":
                await websocket.send_json({"type": "error", "message": "Unsupported live agent message."})
                continue

            question_id = payload.get("questionId")
            language = str(payload.get("language") or session_row["language"] or "vi").strip().lower()
            if not isinstance(question_id, int):
                await websocket.send_json({"type": "error", "message": "questionId is required."})
                continue

            question_row = await db.fetchrow(
                """
                SELECT q.id, q.text, q.text_en, q.text_vi
                FROM session_question_sets sq
                JOIN questions q ON q.id = sq.question_id
                WHERE sq.session_id = $1 AND q.id = $2
                """,
                session_id,
                question_id,
            )
            if not question_row:
                await websocket.send_json({"type": "error", "message": "Question not found for this session."})
                continue

            question_text = (
                question_row["text_vi"]
                if language == "vi" and question_row["text_vi"]
                else question_row["text_en"]
                if language == "en" and question_row["text_en"]
                else question_row["text"]
            )

            try:
                async for event in stream_agent_prompt(
                    role=session_row["role"],
                    level=session_row["level"],
                    question_text=question_text,
                    language=language if language in {"vi", "en"} else "vi",
                ):
                    await websocket.send_json(event)
            except GeminiLiveAgentError as exc:
                await websocket.send_json({"type": "error", "message": str(exc)})
    except (WebSocketDisconnect, RuntimeError):
        return


async def process_text_answer_background(
    answer_id: uuid.UUID,
    session_id: uuid.UUID,
    question_id: int,
    answer_text: str,
    telemetry_data_str: str | None,
    feedback_language: str,
    force_feedback_language: bool,
):
    try:
        pool = await create_pool()
        async with pool.acquire() as db:
            question_row = await db.fetchrow(
                """
                SELECT q.text, q.text_en, q.text_vi,
                       q.category, q.category_en, q.category_vi,
                       q.difficulty,
                       q.ideal_answer, q.ideal_answer_en, q.ideal_answer_vi,
                       s.role, s.level, s.major,
                       u.plan_tier, u.plan_status, u.resume_text
                FROM questions q
                JOIN sessions s ON s.id = $2
                JOIN users u ON u.id = s.user_id
                WHERE q.id = $1
                """,
                question_id, session_id,
            )
            if not question_row:
                return

            cleaned_answer_text = sanitize_user_text(answer_text)
            plan_tier = "free_trial"
            if question_row:
                plan_tier = question_row["plan_tier"] or "free_trial"
                if question_row["plan_status"] != "active":
                    plan_tier = "free_trial"

            import json
            telemetry_dict = None
            if telemetry_data_str:
                try:
                    telemetry_dict = json.loads(telemetry_data_str)
                except Exception:
                    pass

            # Recalculate WPM and fillers from the actual Whisper transcript
            if telemetry_dict is not None and cleaned_answer_text:
                word_count = len(re.findall(r"\b[^\s]+\b", cleaned_answer_text))
                duration_sec = telemetry_dict.get("recordingDurationSec", 0) or 0
                if duration_sec > 0 and word_count > 0:
                    telemetry_dict["speakingPace"] = round((word_count / duration_sec) * 60)
                # Recalculate filler words from actual transcript
                vi_fillers = {"ừm", "à", "thì", "là", "kiểu", "ờ", "dạ"}
                en_fillers = {"uh", "um", "like", "actually", "basically"}
                words = re.findall(r"\b[^\s]+\b", cleaned_answer_text.lower())
                filler_count = sum(1 for w in words if w.strip(".,!?;:") in vi_fillers or w.strip(".,!?;:") in en_fillers)
                text_lower = cleaned_answer_text.lower()
                filler_count += text_lower.count("kiểu như") + text_lower.count("you know")
                telemetry_dict["fillerWordsCount"] = filler_count
                telemetry_data_str = json.dumps(telemetry_dict, ensure_ascii=False)

            try:
                async with SCORING_SEMAPHORE:
                    score, feedback = await score_answer(
                        ScoringRequest(
                            answer_text=answer_text,
                            ideal_answer=localized_question_field(question_row, "ideal_answer", feedback_language),
                            question_text=localized_question_field(question_row, "text", feedback_language),
                            role=question_row["role"],
                            level=question_row["level"],
                            category=localized_question_field(question_row, "category", feedback_language),
                            difficulty=question_row["difficulty"],
                            major=question_row["major"],
                            preferred_language=feedback_language,
                            force_language=force_feedback_language,
                            telemetry_data=telemetry_dict,
                            plan_tier=plan_tier,
                            resume_text=question_row["resume_text"],
                        )
                    )
            except Exception as exc:
                score = 0
                feedback = f"Lỗi chấm điểm: {str(exc)}"

            await db.execute(
                """
                UPDATE answers
                SET score = $1, feedback = $2, telemetry_data = $3, submitted_at = NOW()
                WHERE id = $4
                """,
                score, feedback, telemetry_data_str, answer_id,
            )
    except Exception as e:
        print(f"Error in process_text_answer_background for answer_id={answer_id}: {e}")
        try:
            pool = await create_pool()
            async with pool.acquire() as db:
                await db.execute(
                    """
                    UPDATE answers
                    SET feedback = $1, score = 0, submitted_at = NOW()
                    WHERE id = $2 AND feedback = 'PENDING'
                    """,
                    f"Lỗi xử lý: {str(e)}",
                    answer_id,
                )
        except Exception as db_exc:
            print(f"Failed to update answer fallback for answer_id={answer_id}: {db_exc}")


# ─── POST /sessions/{id}/answers ─────────────────────────────────────────────
@router.post("/{session_id}/answers", response_model=AnswerOut)
async def submit_answer(
    session_id: uuid.UUID,
    body: AnswerSubmit,
    request: Request,
    background_tasks: BackgroundTasks,
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

    # Get ideal_answer for scoring
    question_row = await db.fetchrow(
        """
            SELECT q.text, q.text_en, q.text_vi,
                   q.category, q.category_en, q.category_vi,
                   q.difficulty,
                   q.ideal_answer, q.ideal_answer_en, q.ideal_answer_vi,
                   u.resume_text
        FROM questions q
        LEFT JOIN session_question_sets sq
            ON sq.question_id = q.id
           AND sq.session_id = $2
        JOIN sessions s ON s.id = $2
        JOIN users u ON u.id = s.user_id
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
    feedback_language = "vi" if str(body.output_language or ui_language).strip().lower() == "vi" else "en"
    force_feedback_language = body.output_language is not None
    cleaned_answer_text = sanitize_user_text(body.answer_text)

    if _question_time_limit_expired(body.question_started_at):
        raise HTTPException(status_code=400, detail="Hết thời gian cho câu hỏi này.")

    import json
    telemetry_json = json.dumps(body.telemetry_data) if body.telemetry_data else None

    # Upsert answer (allow retry)
    existing = await db.fetchrow(
        "SELECT id FROM answers WHERE session_id = $1 AND question_id = $2",
        session_id, body.question_id,
    )

    if existing:
        answer_row = await db.fetchrow(
            """
            UPDATE answers
            SET answer_text = $1, score = 0, feedback = 'PENDING', telemetry_data = $2, submitted_at = NOW()
            WHERE session_id = $3 AND question_id = $4
            RETURNING id, session_id, question_id, answer_text, score::float AS score, feedback, telemetry_data, submitted_at
            """,
            cleaned_answer_text, telemetry_json, session_id, body.question_id,
        )
    else:
        answer_row = await db.fetchrow(
            """
            INSERT INTO answers (session_id, question_id, answer_text, score, feedback, telemetry_data)
            VALUES ($1, $2, $3, 0, 'PENDING', $4)
            RETURNING id, session_id, question_id, answer_text, score::float AS score, feedback, telemetry_data, submitted_at
            """,
            session_id, body.question_id, cleaned_answer_text, telemetry_json,
        )

    background_tasks.add_task(
        process_text_answer_background,
        answer_id=answer_row["id"],
        session_id=session_id,
        question_id=body.question_id,
        answer_text=cleaned_answer_text,
        telemetry_data_str=telemetry_json,
        feedback_language=feedback_language,
        force_feedback_language=force_feedback_language,
    )

    return _serialize_answer_row(answer_row)


async def _load_answer_with_follow_up(
    *,
    db: asyncpg.Connection,
    session_id: uuid.UUID,
    answer_id: uuid.UUID,
    user_id: uuid.UUID,
):
    return await db.fetchrow(
        """
        SELECT a.id, a.session_id, a.question_id, a.answer_text,
               a.score::float AS score, a.feedback, a.telemetry_data, a.submitted_at,
               fu.id AS follow_up_id,
               fu.follow_up_style,
               fu.question_text AS follow_up_question_text,
               fu.answer_text AS follow_up_answer_text,
               fu.score::float AS follow_up_score,
               fu.feedback AS follow_up_feedback,
               fu.telemetry_data AS follow_up_telemetry_data,
               fu.generated_at AS follow_up_generated_at,
               fu.answered_at AS follow_up_answered_at
        FROM answers a
        JOIN sessions s ON s.id = a.session_id
        LEFT JOIN interview_follow_ups fu ON fu.parent_answer_id = a.id
        WHERE a.id = $1 AND a.session_id = $2 AND s.user_id = $3
        """,
        answer_id, session_id, user_id,
    )


@router.post("/{session_id}/answers/{answer_id}/follow-up", response_model=AnswerOut)
async def generate_answer_follow_up(
    session_id: uuid.UUID,
    answer_id: uuid.UUID,
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    answer_row = await _load_answer_with_follow_up(
        db=db,
        session_id=session_id,
        answer_id=answer_id,
        user_id=current_user.id,
    )
    if not answer_row:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu trả lời")

    if answer_row["feedback"] == "PENDING":
        raise HTTPException(status_code=400, detail="Cần chấm điểm câu trả lời chính trước khi tạo follow-up.")

    question_row = await db.fetchrow(
        """
        SELECT q.text, q.text_en, q.text_vi,
               q.category, q.category_en, q.category_vi,
               q.difficulty,
               q.ideal_answer, q.ideal_answer_en, q.ideal_answer_vi,
               s.role, s.level, s.major
        FROM answers a
        JOIN sessions s ON s.id = a.session_id
        JOIN questions q ON q.id = a.question_id
        WHERE a.id = $1 AND a.session_id = $2 AND s.user_id = $3
        """,
        answer_id, session_id, current_user.id,
    )
    if not question_row:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại")

    language = "vi" if resolve_ui_language(request) == "vi" else "en"
    await _upsert_follow_up_question(
        db=db,
        session_id=session_id,
        answer_id=answer_id,
        answer_text=sanitize_user_text(answer_row["answer_text"]),
        score=float(answer_row["score"]),
        question_row=question_row,
        language=language,
        telemetry_data=_coerce_telemetry_data(answer_row.get("telemetry_data")),
    )
    refreshed = await _load_answer_with_follow_up(
        db=db,
        session_id=session_id,
        answer_id=answer_id,
        user_id=current_user.id,
    )
    if not refreshed:
        raise HTTPException(status_code=500, detail="Không thể tạo follow-up.")
    return _serialize_answer_row(refreshed)


@router.post("/{session_id}/answers/{answer_id}/submit-follow-up", response_model=AnswerOut)
async def submit_follow_up_answer(
    session_id: uuid.UUID,
    answer_id: uuid.UUID,
    body: FollowUpSubmit,
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    answer_row = await _load_answer_with_follow_up(
        db=db,
        session_id=session_id,
        answer_id=answer_id,
        user_id=current_user.id,
    )
    if not answer_row:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu trả lời")

    question_row = await db.fetchrow(
        """
        SELECT q.text, q.text_en, q.text_vi,
               q.category, q.category_en, q.category_vi,
               q.difficulty,
               q.ideal_answer, q.ideal_answer_en, q.ideal_answer_vi,
               s.role, s.level, s.major
        FROM answers a
        JOIN sessions s ON s.id = a.session_id
        JOIN questions q ON q.id = a.question_id
        WHERE a.id = $1 AND a.session_id = $2 AND s.user_id = $3
        """,
        answer_id, session_id, current_user.id,
    )
    if not question_row:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại")

    follow_up_row = await db.fetchrow(
        """
        SELECT id, question_text, answer_text, score::float AS score, feedback, telemetry_data
        FROM interview_follow_ups
        WHERE parent_answer_id = $1
        """,
        answer_id,
    )
    if not follow_up_row:
        raise HTTPException(status_code=404, detail="Follow-up chưa được tạo")

    ui_language = resolve_ui_language(request)
    feedback_language = "vi" if str(body.output_language or ui_language).strip().lower() == "vi" else "en"
    force_feedback_language = body.output_language is not None
    cleaned_answer_text = sanitize_user_text(body.answer_text)
    if _question_time_limit_expired(body.question_started_at):
        raise HTTPException(status_code=400, detail="Hết thời gian cho câu hỏi follow-up này.")
    telemetry_json = json.dumps(body.telemetry_data) if body.telemetry_data else None

    try:
        score, feedback = await score_follow_up_answer(
            original_question_text=localized_question_field(question_row, "text", feedback_language),
            original_answer_text=sanitize_user_text(answer_row["answer_text"]),
            follow_up_question_text=sanitize_user_text(follow_up_row["question_text"]),
            follow_up_answer_text=cleaned_answer_text,
            role=question_row["role"],
            level=question_row["level"],
            category=localized_question_field(question_row, "category", feedback_language),
            difficulty=question_row["difficulty"],
            major=question_row["major"],
            preferred_language=feedback_language,
            force_language=force_feedback_language,
            telemetry_data=body.telemetry_data,
            plan_tier="pro",
        )
    except Exception as exc:
        score = 0
        feedback = f"Lỗi chấm follow-up: {str(exc)}"

    await db.execute(
        """
        UPDATE interview_follow_ups
        SET answer_text = $1,
            score = $2,
            feedback = $3,
            telemetry_data = $4,
            answered_at = NOW()
        WHERE parent_answer_id = $5
        """,
        cleaned_answer_text,
        score,
        feedback,
        telemetry_json,
        answer_id,
    )

    refreshed = await _load_answer_with_follow_up(
        db=db,
        session_id=session_id,
        answer_id=answer_id,
        user_id=current_user.id,
    )
    if not refreshed:
        raise HTTPException(status_code=500, detail="Không thể lưu follow-up.")
    return _serialize_answer_row(refreshed)


@router.post("/{session_id}/answers/{answer_id}/tts", response_model=AnswerTtsOut)
async def synthesize_answer_feedback_tts(
    session_id: uuid.UUID,
    answer_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    answer_row = await db.fetchrow(
        """
        SELECT a.id, a.score::float AS score, a.feedback
        FROM answers a
        JOIN sessions s ON s.id = a.session_id
        WHERE a.id = $1 AND a.session_id = $2 AND s.user_id = $3
        """,
        answer_id, session_id, current_user.id,
    )
    if not answer_row:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu trả lời")

    tts_script = build_feedback_tts_script(
        score=float(answer_row["score"]),
        feedback=answer_row["feedback"],
    )
    async with TTS_SEMAPHORE:
        tts_audio_url = await asyncio.to_thread(
            synthesize_feedback_audio,
            answer_id=str(answer_row["id"]),
            script=tts_script,
        )

    return AnswerTtsOut(tts_script=tts_script, tts_audio_url=tts_audio_url)


# ─── PUT /sessions/{id}/complete ─────────────────────────────────────────────
@router.put("/{session_id}/complete", response_model=SessionOut)
async def complete_session(
    session_id: uuid.UUID,
    request: Request,
    generate_report: bool = Query(True),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    session_row = await db.fetchrow(
        "SELECT id, role, level, major, status, mode, language, created_at, completed_at, time_limit_minutes, evaluation_report, practice_plan FROM sessions WHERE id = $1 AND user_id = $2",
        session_id, current_user.id,
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    # If already completed and has evaluation, skip generating again
    if session_row["status"] == 'COMPLETED' and session_row["evaluation_report"]:
        avg_row = await db.fetchrow(
            "SELECT AVG(score)::float AS avg_score, COUNT(*)::int AS cnt FROM answers WHERE session_id = $1",
            session_id,
        )
        return SessionOut(
            id=session_row["id"],
            user_id=current_user.id,
            major=session_row["major"],
            role=session_row["role"],
            level=session_row["level"],
            mode=session_row["mode"],
            language=session_row["language"],
            status=session_row["status"],
            created_at=session_row["created_at"],
            completed_at=session_row["completed_at"],
            avg_score=round(avg_row["avg_score"], 1) if avg_row["avg_score"] else None,
            question_count=avg_row["cnt"],
            time_limit_minutes=session_row["time_limit_minutes"],
            evaluation_report=session_row["evaluation_report"],
            practice_plan=session_row["practice_plan"],
        )

    ui_language = resolve_ui_language(request)

    updated = await db.fetchrow(
        """
        UPDATE sessions
        SET status = 'COMPLETED',
            completed_at = COALESCE(completed_at, NOW())
        WHERE id = $1
        RETURNING id, user_id, major, role, level, mode, language, status, created_at, completed_at, time_limit_minutes, evaluation_report, practice_plan
        """,
        session_id,
    )

    if not updated["evaluation_report"] or not updated["practice_plan"]:
        _schedule_session_report_generation(session_id=session_id, language=ui_language)

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
        language=updated["language"],
        status=updated["status"],
        created_at=updated["created_at"],
        completed_at=updated["completed_at"],
        avg_score=round(avg_row["avg_score"], 1) if avg_row["avg_score"] else None,
        question_count=avg_row["cnt"],
        time_limit_minutes=updated["time_limit_minutes"],
        evaluation_report=updated["evaluation_report"],
        practice_plan=updated["practice_plan"],
    )


# ─── GET /questions ────────────────────────────────────────────────────────────
@router.get("/questions/list", response_model=List[QuestionOut])
async def list_questions(
    request: Request,
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
            WHERE role = $1 AND level = $2 AND user_id IS NULL
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
            WHERE role = $1 AND user_id IS NULL
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
            WHERE user_id IS NULL
            ORDER BY id
            LIMIT 50
            """
        )
    ui_language = resolve_ui_language(request)
    return [QuestionOut(**localized_question_dict(r, language=ui_language)) for r in rows]
