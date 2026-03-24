from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel


class AdminInviteCreate(BaseModel):
    email: str
    notes: Optional[str] = None


class AdminInviteOut(BaseModel):
    id: uuid.UUID
    email: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    activated_at: Optional[datetime] = None
    invited_by: Optional[uuid.UUID] = None
    invited_by_email: Optional[str] = None


class AdminUserAccessOut(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime
    full_name: Optional[str] = None
    is_admin: bool = True
    is_primary_admin: bool = False
    provider: Optional[str] = None


class AdminManagedUserOut(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime
    full_name: Optional[str] = None
    is_admin: bool = False
    is_primary_admin: bool = False
    provider: Optional[str] = None
    email_verified: bool = False
    plan_tier: str = "free_trial"
    plan_status: str = "active"
    plan_billing_period: Optional[str] = None
    plan_started_at: Optional[datetime] = None
    plan_expires_at: Optional[datetime] = None
    sessions_used: int = 0
    session_limit: Optional[int] = None
    can_start_new_session: bool = True
    can_use_qna: bool = False
    avg_score: Optional[float] = None


class AdminUserPlanUpdateRequest(BaseModel):
    plan_tier: Literal["free_trial", "basic", "pro", "premium"]
    billing_period: Literal["month", "year"] = "month"
