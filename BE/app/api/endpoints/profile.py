from __future__ import annotations

from pathlib import Path

import asyncpg
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.endpoints.auth import get_current_user
from app.db.session import get_db
from app.schemas.user import AvatarUploadResponse, ResumeUploadResponse, UserOut
from app.services.profile_files import (
    FileValidationError,
    avatar_url,
    delete_private_file,
    delete_public_file,
    resume_file_path,
    save_avatar_upload,
    save_resume_upload,
)


router = APIRouter()


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

    await db.execute(
        """
        UPDATE users
        SET resume_path = $1,
            resume_filename = $2,
            resume_size_bytes = $3,
            resume_content_type = $4,
            updated_at = NOW()
        WHERE id = $5
        """,
        storage_path,
        safe_filename,
        size,
        content_type,
        current_user.id,
    )

    if current["resume_path"] and current["resume_path"] != storage_path:
        delete_private_file(current["resume_path"])

    return ResumeUploadResponse(
        message="Upload resume thành công.",
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

    await db.execute(
        """
        UPDATE users
        SET resume_path = NULL,
            resume_filename = NULL,
            resume_size_bytes = NULL,
            resume_content_type = NULL,
            updated_at = NOW()
        WHERE id = $1
        """,
        current_user.id,
    )
    delete_private_file(current["resume_path"])
    return ResumeUploadResponse(
        message="Đã xóa resume.",
        resume_uploaded=False,
        resume_filename=None,
    )
