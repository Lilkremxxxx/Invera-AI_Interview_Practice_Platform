"""
Admin-only endpoints.

- Dashboard stats/questions: any admin
- Invite/revoke/remove-admin: primary admin only
"""
from __future__ import annotations

import json
import re
from typing import Optional
from urllib.parse import urlencode
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.api.endpoints.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.schemas.admin import AdminInviteCreate, AdminInviteOut, AdminUserAccessOut
from app.schemas.question import AdminQuestionGenerateRequest, AdminQuestionGenerateResponse, AdminQuestionUpsert
from app.schemas.user import UserOut
from app.services.email import send_admin_invite_email
from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion
from app.services.profile_files import resume_file_path

router = APIRouter()

QUESTION_BANK_ROLES: dict[str, set[str]] = {
    "technology": {
        "frontend",
        "backend",
        "fullstack",
        "data_scientist",
        "machine_learning_engineer",
        "devops_engineer",
        "product_manager",
        "marketing_manager",
        "sales_representative",
        "ux_designer",
    },
    "finance": {
        "financial_analyst",
        "accountant",
        "auditor",
        "investment_banking_analyst",
    },
    "business": {
        "business_analyst",
        "operations_analyst",
        "sales_executive",
        "marketing_executive",
    },
}
VALID_LEVELS = {"intern", "fresher", "junior", "mid", "senior"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def require_admin(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bạn không có quyền admin!")
    return current_user


def require_primary_admin(current_user: UserOut = Depends(require_admin)) -> UserOut:
    if not current_user.is_primary_admin:
        raise HTTPException(status_code=403, detail="Chỉ admin chính mới được quản lý danh sách admin.")
    return current_user


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _admin_signup_link(email: str) -> str:
    base = settings.frontend_public_url.rstrip("/")
    query = urlencode({"email": email})
    return f"{base}/admin/signup?{query}"


def _admin_login_link(email: str, notice: str = "admin-access-granted") -> str:
    base = settings.frontend_public_url.rstrip("/")
    query = urlencode({"email": email, "notice": notice})
    return f"{base}/admin/login?{query}"


def _normalize_question_tags(tags: list[str] | None) -> list[str]:
    normalized: list[str] = []
    for tag in tags or []:
        value = re.sub(r"[^a-z0-9\- ]+", "", tag.strip().lower()).replace(" ", "-")
        if value and value not in normalized:
            normalized.append(value)
    return normalized


def _validate_question_payload(payload: AdminQuestionUpsert | AdminQuestionGenerateRequest) -> tuple[str, str, str, str]:
    major = payload.major.strip().lower()
    role = payload.role.strip().lower()
    level = payload.level.strip().lower()
    difficulty = payload.difficulty.strip().lower()

    if major not in QUESTION_BANK_ROLES:
        raise HTTPException(status_code=400, detail=f"Major không hợp lệ. Chọn: {sorted(QUESTION_BANK_ROLES.keys())}")
    if role not in QUESTION_BANK_ROLES[major]:
        raise HTTPException(status_code=400, detail=f"Role không hợp lệ cho major={major}.")
    if level not in VALID_LEVELS:
        raise HTTPException(status_code=400, detail=f"Level không hợp lệ. Chọn: {sorted(VALID_LEVELS)}")
    if difficulty not in VALID_DIFFICULTIES:
        raise HTTPException(status_code=400, detail=f"Difficulty không hợp lệ. Chọn: {sorted(VALID_DIFFICULTIES)}")

    return major, role, level, difficulty


def _normalize_question_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _extract_prompt_keywords(prompt: str) -> list[str]:
    raw_terms = re.findall(r"[a-zA-Z0-9\+#\.-]+", prompt.lower())
    keywords: list[str] = []
    stop_words = {
        "generate",
        "question",
        "questions",
        "about",
        "from",
        "with",
        "that",
        "this",
        "cho",
        "toi",
        "cau",
        "hoi",
        "ve",
        "trong",
        "tu",
        "gen",
    }
    for term in raw_terms:
        cleaned = term.strip(".-+")
        if len(cleaned) < 4 and cleaned not in {"api", "cors"}:
            continue
        if cleaned in stop_words:
            continue
        if cleaned not in keywords:
            keywords.append(cleaned)
    return keywords[:6]


async def _find_duplicate_question(
    db: asyncpg.Connection,
    *,
    major: str,
    role: str,
    level: str,
    candidate_text: str,
) -> Optional[asyncpg.Record]:
    normalized_text = _normalize_question_text(candidate_text)
    if not normalized_text:
        return None

    rows = await db.fetch(
        """
        SELECT *
        FROM questions
        WHERE major = $1
          AND role = $2
          AND level = $3
        ORDER BY id DESC
        """,
        major,
        role,
        level,
    )
    for row in rows:
        if _normalize_question_text(row["text"]) == normalized_text:
            return row
    return None


async def _find_prompt_similar_question(
    db: asyncpg.Connection,
    *,
    major: str,
    role: str,
    level: str,
    prompt: str,
) -> Optional[asyncpg.Record]:
    keywords = _extract_prompt_keywords(prompt)
    if not keywords:
        return None

    rows = await db.fetch(
        """
        SELECT *
        FROM questions
        WHERE major = $1
          AND role = $2
          AND level = $3
        ORDER BY id DESC
        """,
        major,
        role,
        level,
    )
    best_match: Optional[asyncpg.Record] = None
    best_score = 0
    for row in rows:
        text_haystack = " ".join(
            [
                row["text"] or "",
                row["category"] or "",
                " ".join(row["tags"] or []),
            ]
        ).lower()
        answer_haystack = (row["ideal_answer"] or "").lower()

        text_score = sum(1 for keyword in keywords if keyword in text_haystack)
        answer_score = sum(1 for keyword in keywords if keyword in answer_haystack)
        score = (text_score * 2) + answer_score

        if text_score == 0:
            continue
        if score > best_score:
            best_match = row
            best_score = score

    return best_match


@router.get("/stats")
async def admin_stats(
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    stats = await db.fetchrow(
        """
        SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM users WHERE is_admin = true) AS total_admins,
            (SELECT COUNT(*) FROM sessions) AS total_sessions,
            (SELECT COUNT(*) FROM sessions WHERE status = 'COMPLETED') AS completed_sessions,
            (SELECT COUNT(*) FROM answers) AS total_answers,
            (SELECT ROUND(AVG(score)::numeric, 1) FROM answers WHERE score > 0) AS avg_score,
            (SELECT COUNT(*) FROM questions) AS total_questions
        """
    )
    return dict(stats)


@router.get("/users")
async def admin_list_users(
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
    limit: int = 50,
    offset: int = 0,
):
    rows = await db.fetch(
        """
        SELECT
            u.id, u.email, u.created_at, u.is_admin, u.provider,
            COUNT(s.id) AS session_count,
            ROUND(AVG(a.score)::numeric, 1) AS avg_score
        FROM users u
        LEFT JOIN sessions s ON s.user_id = u.id
        LEFT JOIN answers a ON a.session_id = s.id AND a.score > 0
        GROUP BY u.id, u.email, u.created_at, u.is_admin, u.provider
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
        """,
        limit,
        offset,
    )
    return [dict(r) for r in rows]


@router.get("/users/{user_id}/resume")
async def admin_download_user_resume(
    user_id: str,
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    row = await db.fetchrow(
        """
        SELECT email, resume_path, resume_filename, resume_content_type
        FROM users
        WHERE id = $1
        """,
        user_id,
    )
    if not row or not row["resume_path"]:
        raise HTTPException(status_code=404, detail="User này chưa tải resume lên.")

    file_path = resume_file_path(row["resume_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy file resume trên máy chủ.")

    return FileResponse(
        path=file_path,
        media_type=row["resume_content_type"] or "application/pdf",
        filename=row["resume_filename"] or f"{row['email']}-resume.pdf",
    )


@router.get("/admin-users", response_model=list[AdminUserAccessOut])
async def admin_list_admin_users(
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    rows = await db.fetch(
        """
        SELECT id, email, created_at, full_name, is_admin, provider
        FROM users
        WHERE is_admin = TRUE
        ORDER BY created_at ASC
        """
    )
    admin_users: list[AdminUserAccessOut] = []
    for row in rows:
        admin_users.append(
            AdminUserAccessOut(
                id=row["id"],
                email=row["email"],
                created_at=row["created_at"],
                full_name=row["full_name"],
                is_admin=row["is_admin"],
                is_primary_admin=_normalize_email(row["email"]) == "nhatbang6688@gmail.com",
                provider=row["provider"],
            )
        )
    return admin_users


@router.get("/invites", response_model=list[AdminInviteOut])
async def admin_list_invites(
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    rows = await db.fetch(
        """
        SELECT
            ai.id,
            ai.email,
            ai.status,
            ai.notes,
            ai.created_at,
            ai.activated_at,
            ai.invited_by,
            inviter.email AS invited_by_email
        FROM admin_invites ai
        LEFT JOIN users inviter ON inviter.id = ai.invited_by
        ORDER BY ai.created_at DESC
        """
    )
    return [AdminInviteOut(**dict(row)) for row in rows]


@router.post("/invites", response_model=AdminInviteOut)
async def admin_create_invite(
    payload: AdminInviteCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(require_primary_admin),
):
    normalized_email = _normalize_email(payload.email)
    if normalized_email == _normalize_email(current_user.email):
        raise HTTPException(status_code=400, detail="Admin chính không cần tự mời chính mình.")

    existing_admin = await db.fetchrow(
        "SELECT id FROM users WHERE email = $1 AND is_admin = TRUE",
        normalized_email,
    )
    if existing_admin:
        raise HTTPException(status_code=400, detail="Email này đã là admin.")

    existing_user = await db.fetchrow(
        "SELECT id, email_verified, provider FROM users WHERE email = $1",
        normalized_email,
    )
    existing_verified_user = existing_user if existing_user and existing_user["email_verified"] else None
    if existing_user and not existing_user["email_verified"]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Email này đã có tài khoản nhưng chưa xác thực email. "
                "Hãy xác thực tài khoản hiện tại trước rồi mời lại làm admin."
            ),
        )

    async with db.transaction():
        if existing_verified_user:
            activated_at = await db.fetchval("SELECT NOW()")
            row = await db.fetchrow(
                """
                INSERT INTO admin_invites (email, invited_by, status, notes, created_at, activated_at)
                VALUES ($1, $2, 'activated', $3, NOW(), $4)
                ON CONFLICT (email)
                DO UPDATE SET
                    invited_by = EXCLUDED.invited_by,
                    status = 'activated',
                    notes = EXCLUDED.notes,
                    created_at = NOW(),
                    activated_at = EXCLUDED.activated_at
                RETURNING id, email, status, notes, created_at, activated_at, invited_by
                """,
                normalized_email,
                current_user.id,
                payload.notes,
                activated_at,
            )
            await db.execute(
                """
                UPDATE users
                SET is_admin = TRUE,
                    updated_at = NOW()
                WHERE id = $1
                """,
                existing_verified_user["id"],
            )
            await send_admin_invite_email(
                normalized_email,
                _admin_login_link(normalized_email),
                invited_by_email=current_user.email,
                notes=payload.notes,
                mode="existing-login",
                provider=existing_verified_user["provider"],
            )
        else:
            row = await db.fetchrow(
                """
                INSERT INTO admin_invites (email, invited_by, status, notes, created_at, activated_at)
                VALUES ($1, $2, 'pending', $3, NOW(), NULL)
                ON CONFLICT (email)
                DO UPDATE SET
                    invited_by = EXCLUDED.invited_by,
                    status = 'pending',
                    notes = EXCLUDED.notes,
                    created_at = NOW(),
                    activated_at = NULL
                RETURNING id, email, status, notes, created_at, activated_at, invited_by
                """,
                normalized_email,
                current_user.id,
                payload.notes,
            )
            await send_admin_invite_email(
                normalized_email,
                _admin_signup_link(normalized_email),
                invited_by_email=current_user.email,
                notes=payload.notes,
            )

    return AdminInviteOut(
        id=row["id"],
        email=row["email"],
        status=row["status"],
        notes=row["notes"],
        created_at=row["created_at"],
        activated_at=row["activated_at"],
        invited_by=row["invited_by"],
        invited_by_email=current_user.email,
    )


@router.delete("/invites/{invite_id}")
async def admin_revoke_invite(
    invite_id: str,
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_primary_admin),
):
    row = await db.fetchrow(
        """
        UPDATE admin_invites
        SET status = 'revoked'
        WHERE id = $1 AND status = 'pending'
        RETURNING id
        """,
        invite_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy lời mời đang chờ.")
    return {"revoked": invite_id}


@router.delete("/admin-users/{user_id}")
async def remove_admin_access(
    user_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(require_primary_admin),
):
    target = await db.fetchrow("SELECT id, email FROM users WHERE id = $1", user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy admin cần gỡ quyền.")
    if _normalize_email(target["email"]) == "nhatbang6688@gmail.com":
        raise HTTPException(status_code=400, detail="Không thể gỡ quyền admin của admin chính.")

    row = await db.fetchrow(
        """
        UPDATE users
        SET is_admin = FALSE,
            updated_at = NOW()
        WHERE id = $1 AND is_admin = TRUE
        RETURNING id, email
        """,
        user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy admin cần gỡ quyền.")

    await db.execute(
        """
        UPDATE admin_invites
        SET status = 'revoked'
        WHERE email = $1 AND status = 'activated'
        """,
        row["email"],
    )
    return {"removed": user_id, "email": row["email"]}


@router.put("/users/{user_id}/toggle-admin")
async def toggle_admin(
    user_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(require_primary_admin),
):
    target = await db.fetchrow(
        "SELECT id, email, is_admin FROM users WHERE id = $1",
        user_id,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")
    if _normalize_email(target["email"]) == "nhatbang6688@gmail.com":
        raise HTTPException(status_code=400, detail="Không thể thay đổi quyền của admin chính!")
    if not target["is_admin"]:
        raise HTTPException(
            status_code=400,
            detail="Không thể cấp admin bằng toggle cũ nữa. Hãy dùng luồng mời admin mới.",
        )

    await db.execute(
        "UPDATE users SET is_admin = FALSE, updated_at = NOW() WHERE id = $1",
        user_id,
    )
    return {"id": str(target["id"]), "email": target["email"], "is_admin": False}


@router.get("/questions")
async def admin_list_questions(
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
    major: Optional[str] = None,
    role: Optional[str] = None,
    level: Optional[str] = None,
):
    clauses: list[str] = []
    params: list[str] = []

    if major:
        params.append(major)
        clauses.append(f"major = ${len(params)}")
    if role:
        params.append(role)
        clauses.append(f"role = ${len(params)}")
    if level:
        params.append(level)
        clauses.append(f"level = ${len(params)}")

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = await db.fetch(
        f"SELECT * FROM questions {where_sql} ORDER BY major, role, level, id",
        *params,
    )
    return [dict(r) for r in rows]


@router.post("/questions")
async def admin_create_question(
    payload: AdminQuestionUpsert,
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    major, role, level, difficulty = _validate_question_payload(payload)
    tags = _normalize_question_tags(payload.tags)
    row = await db.fetchrow(
        """
        INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        """,
        major,
        role,
        level,
        payload.text.strip(),
        payload.category.strip(),
        difficulty,
        payload.ideal_answer.strip(),
        tags,
    )
    return dict(row)


@router.put("/questions/{question_id}")
async def admin_update_question(
    question_id: int,
    payload: AdminQuestionUpsert,
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    major, role, level, difficulty = _validate_question_payload(payload)
    tags = _normalize_question_tags(payload.tags)
    row = await db.fetchrow(
        """
        UPDATE questions
        SET major = $1,
            role = $2,
            level = $3,
            text = $4,
            category = $5,
            difficulty = $6,
            ideal_answer = $7,
            tags = $8
        WHERE id = $9
        RETURNING *
        """,
        major,
        role,
        level,
        payload.text.strip(),
        payload.category.strip(),
        difficulty,
        payload.ideal_answer.strip(),
        tags,
        question_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại!")
    return dict(row)


@router.post("/questions/generate", response_model=AdminQuestionGenerateResponse)
async def admin_generate_question(
    payload: AdminQuestionGenerateRequest,
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    major, role, level, difficulty = _validate_question_payload(payload)
    requested_tags = _normalize_question_tags(payload.tags)
    normalized_prompt = (payload.prompt or "").strip()

    if normalized_prompt:
        existing_from_prompt = await _find_prompt_similar_question(
            db,
            major=major,
            role=role,
            level=level,
            prompt=normalized_prompt,
        )
        if existing_from_prompt:
            return AdminQuestionGenerateResponse(
                major=existing_from_prompt["major"],
                role=existing_from_prompt["role"],
                level=existing_from_prompt["level"],
                text=existing_from_prompt["text"],
                category=existing_from_prompt["category"],
                difficulty=existing_from_prompt["difficulty"],
                ideal_answer=existing_from_prompt["ideal_answer"],
                tags=list(existing_from_prompt["tags"] or []),
                duplicate_found=True,
                existing_question_id=existing_from_prompt["id"],
                prompt=normalized_prompt,
            )

    system_prompt = """
You generate interview question-bank entries for Invera, an AI interview practice platform for Vietnamese students and early-career candidates.
Return valid JSON only with these keys:
- text
- category
- difficulty
- ideal_answer
- tags

Rules:
- Write the question and ideal answer in Vietnamese.
- Keep domain terminology in English only when it is the natural term used in interviews.
- Match the requested major, role, level, and difficulty exactly.
- If the admin prompt asks for a specific concept or stack detail, reflect it directly in the generated question.
- Make the question realistic, role-specific, and useful in a real interview.
- The ideal answer must be concrete, structured, and interview-ready.
- tags must be a JSON array of 3 to 6 short lowercase kebab-case tags.
- Do not include markdown, commentary, or extra keys.
""".strip()

    user_prompt = f"""
Generate one interview question-bank entry for this context:
- major: {major}
- role: {role}
- level: {level}
- difficulty: {difficulty}
- preferred_category: {payload.category or 'auto'}
- preferred_tags: {requested_tags or ['auto']}
- admin_prompt: {normalized_prompt or 'none'}

The output should fit Invera's current question bank style:
- concise but serious interview wording
- strong ideal answer with direct explanation, examples, and practical points
- suitable for Vietnamese learners preparing for role-specific interviews
""".strip()

    try:
        response = await create_chat_completion(system_prompt=system_prompt, user_prompt=user_prompt)
        content = json.loads(response["content"])
    except DeepSeekAPIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="DeepSeek trả về JSON không hợp lệ cho question generation.") from exc

    try:
        generated = AdminQuestionGenerateResponse(
            major=major,
            role=role,
            level=level,
            text=str(content["text"]).strip(),
            category=str(content["category"]).strip() or (payload.category or "General"),
            difficulty=difficulty,
            ideal_answer=str(content["ideal_answer"]).strip(),
            tags=_normalize_question_tags(content.get("tags", [])),
            prompt=normalized_prompt or None,
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="DeepSeek trả về payload thiếu field cần thiết.") from exc

    duplicate = await _find_duplicate_question(
        db,
        major=generated.major,
        role=generated.role,
        level=generated.level,
        candidate_text=generated.text,
    )
    if duplicate:
        return AdminQuestionGenerateResponse(
            major=duplicate["major"],
            role=duplicate["role"],
            level=duplicate["level"],
            text=duplicate["text"],
            category=duplicate["category"],
            difficulty=duplicate["difficulty"],
            ideal_answer=duplicate["ideal_answer"],
            tags=list(duplicate["tags"] or []),
            duplicate_found=True,
            existing_question_id=duplicate["id"],
            prompt=normalized_prompt or None,
        )

    return generated


@router.delete("/questions/{question_id}")
async def admin_delete_question(
    question_id: int,
    db: asyncpg.Connection = Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    row = await db.fetchrow("DELETE FROM questions WHERE id = $1 RETURNING id", question_id)
    if not row:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại!")
    return {"deleted": question_id}
