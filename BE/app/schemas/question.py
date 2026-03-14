from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class QuestionOut(BaseModel):
    id: int
    role: str
    level: str
    text: str
    category: str
    difficulty: str
