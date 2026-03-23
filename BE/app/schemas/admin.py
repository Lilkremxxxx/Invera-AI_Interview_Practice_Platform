from __future__ import annotations

from datetime import datetime
from typing import Optional
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
