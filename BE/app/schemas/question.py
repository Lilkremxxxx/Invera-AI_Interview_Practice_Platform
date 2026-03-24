from typing import Optional

from pydantic import BaseModel, Field


class QuestionOut(BaseModel):
    id: int
    major: Optional[str] = None
    role: str
    level: str
    text: str
    category: str
    difficulty: str
    tags: list[str] = Field(default_factory=list)


class AdminQuestionUpsert(BaseModel):
    major: str
    role: str
    level: str
    text: str
    category: str
    difficulty: str
    ideal_answer: str
    tags: list[str] = Field(default_factory=list)


class AdminQuestionGenerateRequest(BaseModel):
    major: str
    role: str
    level: str
    difficulty: str = "medium"
    category: Optional[str] = None
    prompt: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    output_language: str = "en"


class AdminQuestionGenerateResponse(BaseModel):
    major: str
    role: str
    level: str
    text: str
    category: str
    difficulty: str
    ideal_answer: str
    tags: list[str] = Field(default_factory=list)
    duplicate_found: bool = False
    existing_question_id: Optional[int] = None
    prompt: Optional[str] = None
