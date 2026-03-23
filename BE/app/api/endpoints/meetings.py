import os
import uuid
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
import asyncpg

from app.db.session import get_db
from app.api.endpoints.auth import get_current_user
from app.schemas.user import UserOut
from app.services.storage.local import LocalStorageService

router = APIRouter()


# GET /meetings/
@router.get("/")
async def get_all_meetings(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        rows = await db.fetch(
            "SELECT * FROM meetings WHERE user_id = $1 ORDER BY created_at DESC",
            current_user.id,
        )
        meetings = []
        for row in rows:
            meetings.append(
                {
                    "id": str(row["id"]),
                    "title": row["title"],
                    "original_filename": row["original_filename"],
                    "status": row["status"],
                    "created_at": row["created_at"].isoformat(),
                }
            )
        return meetings
    except asyncpg.PostgresError as db_error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch meetings: {str(e)}")


# GET /meetings/{meeting_id}
@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        row = await db.fetchrow("SELECT * FROM meetings WHERE id = $1", meeting_id)
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
        if str(row["user_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not owner of meeting")
        storage = LocalStorageService()
        audio_url = storage.get_url(row["storage_path"])
        return {
            "id": str(row["id"]),
            "title": row["title"],
            "status": row["status"],
            "original_filename": row["original_filename"],
            "created_at": row["created_at"].isoformat(),
            "audioUrl": audio_url,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# POST /meetings/upload
@router.post("/upload")
async def upload_single_meeting(
    title: str = Form(...),
    audio: UploadFile = File(...),
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        _, filetail = os.path.splitext(audio.filename)
        filetail = filetail.lower().lstrip(".")
        if filetail not in ["mp3", "wav"]:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported format: {filetail}. Use mp3 or wav",
            )

        meeting_id = str(uuid.uuid4())
        user_id = str(current_user.id)
        storage = LocalStorageService()
        storage_path = f"{user_id}/{meeting_id}/{audio.filename}"
        saved_path = storage.save_file(audio.file, storage_path)

        await db.execute(
            'INSERT INTO "meetings" ("id", "user_id", "title", "original_filename", "storage_provider", "storage_path", "status") '
            "VALUES ($1, $2, $3, $4, $5, $6, $7)",
            meeting_id,
            current_user.id,
            title,
            audio.filename,
            "LOCAL",
            storage_path,
            "QUEUED",
        )

        file_stat = os.stat(saved_path)
        return {
            "success": True,
            "data": {
                "id": meeting_id,
                "title": title,
                "filename": audio.filename,
                "path": saved_path,
                "size": file_stat.st_size,
                "status": "QUEUED",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# DELETE /meetings/{meeting_id}
@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        row = await db.fetchrow("SELECT * FROM meetings WHERE id = $1", meeting_id)
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
        if str(row["user_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to delete this meeting")

        storage = LocalStorageService()
        try:
            storage.delete(row["storage_path"])
        except Exception as e:
            print(f"Warning: Could not delete file: {e}")

        await db.execute("DELETE FROM meetings WHERE id = $1", meeting_id)
        return {"success": True, "message": "Meeting deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete meeting: {str(e)}")
