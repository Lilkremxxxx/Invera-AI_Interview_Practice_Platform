from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


AVATAR_MAX_BYTES = 5 * 1024 * 1024
RESUME_MAX_BYTES = 100 * 1024 * 1024

ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_AVATAR_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_RESUME_EXTENSIONS = {".pdf"}


class FileValidationError(ValueError):
    pass


def avatar_url(storage_path: str | None) -> str | None:
    if not storage_path:
        return None
    return f"/media/{storage_path}"


def _normalized_suffix(filename: str | None) -> str:
    return Path(filename or "").suffix.lower()


def _copy_file_with_limit(upload: UploadFile, destination: Path, max_bytes: int) -> int:
    destination.parent.mkdir(parents=True, exist_ok=True)
    upload.file.seek(0)
    total = 0
    try:
        with destination.open("wb") as target:
            while True:
                chunk = upload.file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise FileValidationError(f"File vượt quá giới hạn {max_bytes // (1024 * 1024)}MB.")
                target.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        upload.file.seek(0)
    return total


def _public_file_path(storage_path: str) -> Path:
    return settings.uploads_dir / storage_path


def _private_file_path(storage_path: str) -> Path:
    return settings.private_uploads_dir / storage_path


def delete_public_file(storage_path: str | None) -> None:
    if not storage_path:
        return
    _public_file_path(storage_path).unlink(missing_ok=True)


def delete_private_file(storage_path: str | None) -> None:
    if not storage_path:
        return
    _private_file_path(storage_path).unlink(missing_ok=True)


def validate_avatar_upload(upload: UploadFile) -> str:
    suffix = _normalized_suffix(upload.filename)
    if suffix not in ALLOWED_AVATAR_EXTENSIONS:
        raise FileValidationError("Avatar chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP.")

    content_type = (upload.content_type or "").lower()
    if content_type and content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
        raise FileValidationError("Avatar chỉ hỗ trợ file ảnh JPG, PNG hoặc WEBP.")
    return suffix


def validate_resume_upload(upload: UploadFile) -> str:
    suffix = _normalized_suffix(upload.filename)
    if suffix not in ALLOWED_RESUME_EXTENSIONS:
        raise FileValidationError("Resume chỉ hỗ trợ file PDF.")
    return suffix


def save_avatar_upload(*, user_id: str, upload: UploadFile) -> tuple[str, int]:
    suffix = validate_avatar_upload(upload)
    storage_path = f"avatars/{user_id}/{uuid.uuid4().hex}{suffix}"
    size = _copy_file_with_limit(upload, _public_file_path(storage_path), AVATAR_MAX_BYTES)
    return storage_path, size


def save_resume_upload(*, user_id: str, upload: UploadFile) -> tuple[str, int]:
    validate_resume_upload(upload)
    storage_path = f"resumes/{user_id}/{uuid.uuid4().hex}.pdf"
    size = _copy_file_with_limit(upload, _private_file_path(storage_path), RESUME_MAX_BYTES)
    return storage_path, size


def resume_file_path(storage_path: str) -> Path:
    return _private_file_path(storage_path)
