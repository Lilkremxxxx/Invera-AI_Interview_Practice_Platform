from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

from app.schemas.question import QuestionOut
from app.schemas.answer import AnswerOut


class SessionCreate(BaseModel):
    major: str = 'technology'
    role: str
    level: str
    mode: str = 'camera'
    language: str = 'vi'
    question_count: int = 5


class SessionOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    major: Optional[str] = None
    role: str
    level: str
    mode: str
    language: str = 'vi'
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    avg_score: Optional[float] = None
    question_count: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    evaluation_report: Optional[str] = None
    practice_plan: Optional[str] = None


class SessionDetail(SessionOut):
    questions: List[QuestionOut] = []
    answers: List[AnswerOut] = []


class SessionCatalogRole(BaseModel):
    major: str
    role: str
    total_questions: int
    counts_by_level: dict[str, int]


class TelemetrySummary(BaseModel):
    gaze: int = 0
    posture: int = 0
    wpm: int = 0
    fillers: int = 0
    confidence: int = 0
    blink: int = 0
    tension: int = 0
    answer_count: int = 0


class TelemetryAnswerPoint(BaseModel):
    label: str
    question_id: int
    is_follow_up: bool = False
    score: Optional[float] = None
    submitted_at: Optional[datetime] = None
    telemetry_data: Optional[dict] = None


class TelemetrySessionOverview(BaseModel):
    session_id: uuid.UUID
    role: str
    level: str
    mode: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    avg_score: Optional[float] = None
    summary: TelemetrySummary
    answers: List[TelemetryAnswerPoint] = []


class TelemetryOverviewOut(BaseModel):
    sessions: List[TelemetrySessionOverview] = []
