from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class QnaStructuredAnswerOut(BaseModel):
    language: str = "en"
    title: str = ""
    summary: str = ""
    direct_answer: list[str] = Field(default_factory=list)
    key_points: list[str] = Field(default_factory=list)
    common_gaps: list[str] = Field(default_factory=list)
    better_answer: list[str] = Field(default_factory=list)
    follow_up: list[str] = Field(default_factory=list)
    quoted_text: Optional[str] = None
    attachment_name: Optional[str] = None


class QnaMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    structured_payload: Optional[QnaStructuredAnswerOut] = None
    selected_text: Optional[str] = None
    attachment_name: Optional[str] = None
    created_at: datetime


class QnaThreadOut(BaseModel):
    id: uuid.UUID
    title: str
    messages: list[QnaMessageOut] = Field(default_factory=list)


class QnaMessageCreateResult(BaseModel):
    thread_id: uuid.UUID
    user_message: QnaMessageOut
    assistant_message: QnaMessageOut
