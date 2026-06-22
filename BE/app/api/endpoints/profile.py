from __future__ import annotations

import logging
from pathlib import Path

import asyncpg
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.endpoints.auth import get_current_user
from app.db.session import get_db
from app.schemas.user import AccountDeletionResponse, AvatarUploadResponse, ResumeUploadResponse, UserOut
from app.services.account_deletion import purge_user_data
from app.services.profile_files import (
    FileValidationError,
    avatar_url,
    delete_private_file,
    delete_public_file,
    resume_file_path,
    save_avatar_upload,
    save_resume_upload,
)
from app.services.resume_questions import extract_text_from_pdf, generate_and_save_cv_questions


router = APIRouter()
logger = logging.getLogger(__name__)


async def _current_file_state(db: asyncpg.Connection, user_id) -> asyncpg.Record | None:
    return await db.fetchrow(
        """
        SELECT avatar_path, resume_path, resume_filename, resume_content_type
        FROM users
        WHERE id = $1
        """,
        user_id,
    )


@router.post("/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    avatar: UploadFile = File(...),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    current = await _current_file_state(db, current_user.id)
    if current is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    try:
        storage_path, _ = save_avatar_upload(user_id=str(current_user.id), upload=avatar)
    except FileValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await db.execute(
        """
        UPDATE users
        SET avatar_path = $1,
            updated_at = NOW()
        WHERE id = $2
        """,
        storage_path,
        current_user.id,
    )

    if current["avatar_path"] and current["avatar_path"] != storage_path:
        delete_public_file(current["avatar_path"])

    return AvatarUploadResponse(
        message="Cập nhật avatar thành công.",
        avatar_url=avatar_url(storage_path),
    )


@router.delete("/avatar", response_model=AvatarUploadResponse)
async def delete_avatar(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    current = await _current_file_state(db, current_user.id)
    if current is None or not current["avatar_path"]:
        raise HTTPException(status_code=404, detail="Bạn chưa có avatar để xóa.")

    await db.execute(
        """
        UPDATE users
        SET avatar_path = NULL,
            updated_at = NOW()
        WHERE id = $1
        """,
        current_user.id,
    )
    delete_public_file(current["avatar_path"])
    return AvatarUploadResponse(message="Đã xóa avatar.", avatar_url=None)


@router.post("/resume", response_model=ResumeUploadResponse)
async def upload_resume(
    resume: UploadFile = File(...),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    current = await _current_file_state(db, current_user.id)
    if current is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    try:
        storage_path, size = save_resume_upload(user_id=str(current_user.id), upload=resume)
    except FileValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    safe_filename = Path(resume.filename or "resume.pdf").name
    content_type = resume.content_type or "application/pdf"

    # Extract text from the saved PDF
    abs_path = resume_file_path(storage_path)
    try:
        extracted_text = extract_text_from_pdf(abs_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Lỗi đọc file PDF: {str(exc)}") from exc
    if not extracted_text.strip():
        delete_private_file(storage_path)
        raise HTTPException(
            status_code=400,
            detail="Không trích xuất được nội dung văn bản từ PDF. Vui lòng dùng PDF có text thay vì bản scan ảnh.",
        )

    generated_questions = []
    try:
        generated_questions = await generate_and_save_cv_questions(db, current_user.id, extracted_text)
    except Exception as exc:
        # Keep the upload successful even if downstream CV-question generation fails.
        logger.error("Error generating questions from CV: %s", exc)

    await db.execute(
        """
        UPDATE users
        SET resume_path = $1,
            resume_filename = $2,
            resume_size_bytes = $3,
            resume_content_type = $4,
            resume_text = $5,
            resume_questions = $6::jsonb,
            updated_at = NOW()
        WHERE id = $7
        """,
        storage_path,
        safe_filename,
        size,
        content_type,
        extracted_text,
        generated_questions,
        current_user.id,
    )

    if current["resume_path"] and current["resume_path"] != storage_path:
        delete_private_file(current["resume_path"])

    return ResumeUploadResponse(
        message="Upload resume thành công và đã khởi tạo câu hỏi từ CV.",
        resume_uploaded=True,
        resume_filename=safe_filename,
    )


@router.get("/resume")
async def download_resume(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    current = await _current_file_state(db, current_user.id)
    if current is None or not current["resume_path"]:
        raise HTTPException(status_code=404, detail="Bạn chưa tải resume lên.")

    file_path = resume_file_path(current["resume_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy file resume trên máy chủ.")

    return FileResponse(
        path=file_path,
        media_type=current["resume_content_type"] or "application/pdf",
        filename=current["resume_filename"] or "resume.pdf",
    )


@router.delete("/resume", response_model=ResumeUploadResponse)
async def delete_resume(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    current = await _current_file_state(db, current_user.id)
    if current is None or not current["resume_path"]:
        raise HTTPException(status_code=404, detail="Bạn chưa có resume để xóa.")

    async with db.transaction():
        await db.execute(
            """
            UPDATE users
            SET resume_path = NULL,
                resume_filename = NULL,
                resume_size_bytes = NULL,
                resume_content_type = NULL,
                resume_text = NULL,
                resume_questions = NULL,
                updated_at = NOW()
            WHERE id = $1
            """,
            current_user.id,
        )

    delete_private_file(current["resume_path"])
    return ResumeUploadResponse(
        message="Đã xóa resume và các câu hỏi liên quan.",
        resume_uploaded=False,
        resume_filename=None,
    )


@router.delete("/account", response_model=AccountDeletionResponse)
async def delete_account(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.is_primary_admin:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản admin chính.")

    return await purge_user_data(db, user_id=str(current_user.id), email=current_user.email)
