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
    mode: str = 'text'
    question_count: int = 5


class SessionOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    major: Optional[str] = None
    role: str
    level: str
    mode: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    avg_score: Optional[float] = None
    question_count: Optional[int] = None


class SessionDetail(SessionOut):
    questions: List[QuestionOut] = []
    answers: List[AnswerOut] = []


class SessionCatalogRole(BaseModel):
    major: str
    role: str
    total_questions: int
    counts_by_level: dict[str, int]
