from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class UserCreate(BaseModel):
    """Schema cho request đăng ký tài khoản mới."""
    email: str
    password: str
    full_name: Optional[str] = None


class UserOut(BaseModel):
    """Schema cho response trả về thông tin user (không có password)."""
    id: uuid.UUID
    email: str
    created_at: datetime

    class Config:
        from_attributes = True
