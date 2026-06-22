from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.session import SessionCreate


class AutomationQuestionSeed(BaseModel):
    text: str
    category: str
    difficulty: str = "medium"
    tags: list[str] = Field(default_factory=list)


class AutomationBootstrapRequest(BaseModel):
    candidate_email_prefix: str = "automation-candidate"
    admin_email_prefix: str = "automation-admin"
    candidate_full_name: str = "Automation Candidate"
    admin_full_name: str = "Automation Admin"
    session_payload: SessionCreate
    questions: list[AutomationQuestionSeed] = Field(default_factory=list)


class AutomationBootstrapUserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_admin: bool


class AutomationBootstrapResponse(BaseModel):
    candidate: AutomationBootstrapUserOut
    admin: AutomationBootstrapUserOut
    session: dict[str, Any]
    questions: list[dict[str, Any]]
