from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class ResendVerificationCodeRequest(BaseModel):
    email: str


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
    full_name: Optional[str] = None
    is_admin: bool = False
    is_primary_admin: bool = False
    email_verified: bool = False
    plan_tier: str = "free_trial"
    plan_status: str = "active"
    plan_billing_period: Optional[str] = None
    plan_started_at: Optional[datetime] = None
    plan_expires_at: Optional[datetime] = None
    session_limit: Optional[int] = None
    sessions_used: int = 0
    can_start_new_session: bool = True
    is_billing_exempt: bool = False
    avatar_url: Optional[str] = None
    resume_uploaded: bool = False
    resume_filename: Optional[str] = None

    class Config:
        from_attributes = True


class RegisterResponse(UserOut):
    verification_required: bool = True
    message: str
    resend_available_in_seconds: int = 0


class VerificationDeliveryResponse(BaseModel):
    message: str
    resend_available_in_seconds: int = 0


class EmailVerificationResponse(BaseModel):
    message: str
    verified: bool
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    is_admin: bool = False


class AvatarUploadResponse(BaseModel):
    message: str
    avatar_url: Optional[str] = None


class ResumeUploadResponse(BaseModel):
    message: str
    resume_uploaded: bool = False
    resume_filename: Optional[str] = None
