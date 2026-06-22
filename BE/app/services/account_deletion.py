from __future__ import annotations

import shutil
from pathlib import Path

import asyncpg

from app.core.config import settings
from app.services.profile_files import delete_private_file, delete_public_file


async def purge_user_data(
    db: asyncpg.Connection,
    *,
    user_id: str,
    email: str,
    uploads_dir: Path | None = None,
    private_uploads_dir: Path | None = None,
) -> dict[str, str]:
    uploads_root = uploads_dir or settings.uploads_dir
    private_root = private_uploads_dir or settings.private_uploads_dir

    user_row = await db.fetchrow(
        """
        SELECT avatar_path, resume_path
        FROM users
        WHERE id = $1
        """,
        user_id,
    )
    if user_row is None:
        return {"deleted": str(user_id), "email": email}

    answer_rows = await db.fetch(
        """
        SELECT a.id::text AS answer_id
        FROM answers a
        JOIN sessions s ON a.session_id = s.id
        WHERE s.user_id = $1
        """,
        user_id,
    )

    if user_row["avatar_path"]:
        delete_public_file(user_row["avatar_path"])
    if user_row["resume_path"]:
        delete_private_file(user_row["resume_path"])

    avatar_dir = uploads_root / "avatars" / str(user_id)
    if avatar_dir.exists():
        shutil.rmtree(avatar_dir, ignore_errors=True)

    resume_dir = private_root / "resumes" / str(user_id)
    if resume_dir.exists():
        shutil.rmtree(resume_dir, ignore_errors=True)

    tts_dir = uploads_root / "interview-tts"
    for row in answer_rows:
        tts_file = tts_dir / f"{row['answer_id']}.wav"
        tts_file.unlink(missing_ok=True)

    normalized_email = email.strip().lower()

    async with db.transaction():
        await db.execute(
            """
            DELETE FROM admin_invites
            WHERE email = $1 OR invited_by = $2
            """,
            normalized_email,
            user_id,
        )
        await db.execute("DELETE FROM users WHERE id = $1", user_id)

    return {"deleted": str(user_id), "email": email}
