from pydantic import BaseModel
import uuid
from datetime import datetime
from typing import Optional


class AnswerSubmit(BaseModel):
    question_id: int
    answer_text: str
    output_language: str | None = None
    telemetry_data: Optional[dict] = None
    question_started_at: Optional[datetime] = None


class AnswerOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    question_id: int
    answer_text: str
    score: float
    feedback: str
    telemetry_data: Optional[dict] = None
    follow_up_id: Optional[uuid.UUID] = None
    follow_up_style: Optional[str] = None
    follow_up_question_text: Optional[str] = None
    follow_up_answer_text: Optional[str] = None
    follow_up_score: Optional[float] = None
    follow_up_feedback: Optional[str] = None
    follow_up_telemetry_data: Optional[dict] = None
    follow_up_generated_at: Optional[datetime] = None
    follow_up_answered_at: Optional[datetime] = None
    tts_script: Optional[str] = None
    tts_audio_url: Optional[str] = None
    submitted_at: datetime


class FollowUpSubmit(BaseModel):
    answer_text: str
    output_language: str | None = None
    telemetry_data: Optional[dict] = None
    question_started_at: Optional[datetime] = None


class AnswerTranscriptOut(BaseModel):
    text: str


class AnswerTtsOut(BaseModel):
    tts_script: str
    tts_audio_url: Optional[str] = None
