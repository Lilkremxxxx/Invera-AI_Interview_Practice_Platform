from pydantic import BaseModel
import uuid
from datetime import datetime
from typing import Optional


class AnswerSubmit(BaseModel):
    question_id: int
    answer_text: str


class AnswerOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    question_id: int
    answer_text: str
    score: int
    feedback: str
    submitted_at: datetime
