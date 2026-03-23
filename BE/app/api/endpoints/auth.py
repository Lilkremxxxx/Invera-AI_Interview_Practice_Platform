import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from typing import Optional
import asyncpg
import secrets
import httpx
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt

from app.db.session import get_db
from app.core.config import settings
from app.schemas.user import (
    EmailVerificationResponse,
    ForgotPasswordRequest,
    RegisterResponse,
    ResendVerificationCodeRequest,
    ResetPasswordRequest,
    UserCreate,
    UserOut,
    VerificationDeliveryResponse,
    VerifyEmailRequest,
)
from app.core.security import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM
from app.services.email import send_verification_email
from app.services.plans import get_user_plan_snapshot

router = APIRouter()
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_primary_admin_email(email: str) -> bool:
    return _normalize_email(email) in settings.primary_admin_emails


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def _issue_verification_code(
    db: asyncpg.Connection,
    *,
    user_id,
) -> tuple[str, datetime]:
    code = _generate_verification_code()
    expires_at = _utcnow() + timedelta(minutes=settings.verification_code_ttl_minutes)
    await db.execute(
        """
        UPDATE users
        SET verification_code = $1,
            verification_code_expires = $2,
            updated_at = NOW()
        WHERE id = $3
        """,
        code,
        expires_at,
        user_id,
    )
    return code, expires_at


async def _mark_verification_code_sent(
    db: asyncpg.Connection,
    *,
    user_id,
) -> datetime:
    sent_at = _utcnow()
    await db.execute(
        """
        UPDATE users
        SET verification_code_sent_at = $1, updated_at = NOW()
        WHERE id = $2
        """,
        sent_at,
        user_id,
    )
    return sent_at


def _resend_cooldown_remaining(sent_at: datetime | None) -> int:
    if not sent_at:
        return 0

    elapsed = (_utcnow() - sent_at).total_seconds()
    remaining = settings.verification_resend_cooldown_seconds - int(elapsed)
    return max(0, remaining)


def _verification_delivery_message() -> str:
    if settings.email_delivery_mode.lower() == "smtp":
        return "Tài khoản đã được tạo. Vui lòng nhập mã xác thực đã gửi đến email của bạn."
    return (
        "Tài khoản đã được tạo. Máy chủ hiện chưa bật gửi email thật; "
        "mã xác thực đang được ghi vào backend logs để kiểm thử."
    )


def _frontend_redirect(path: str, **params: str) -> str:
    base = settings.frontend_public_url.rstrip("/")
    query = urlencode({key: value for key, value in params.items() if value})
    if query:
        return f"{base}{path}?{query}"
    return f"{base}{path}"


def _oauth_error_redirect(
    provider: str,
    detail: str,
    *,
    email: str | None = None,
    admin_restricted: bool = False,
) -> RedirectResponse:
    if admin_restricted:
        return RedirectResponse(
            _frontend_redirect(
                "/admin/login",
                notice="admin-local-only",
                oauth_provider=provider,
                email=email or "",
                oauth_error=detail,
            ),
            status_code=302,
        )

    return RedirectResponse(
        _frontend_redirect(
            "/login",
            oauth_provider=provider,
            oauth_error=detail,
        ),
        status_code=302,
    )


async def _pending_admin_invite_exists(db: asyncpg.Connection, email: str) -> bool:
    invite = await db.fetchrow(
        "SELECT id FROM admin_invites WHERE email = $1 AND status = 'pending'",
        _normalize_email(email),
    )
    return invite is not None


async def _ensure_primary_admin_privilege(db: asyncpg.Connection, email: str) -> None:
    if not _is_primary_admin_email(email):
        return

    await db.execute(
        """
        UPDATE users
        SET is_admin = TRUE,
            updated_at = NOW()
        WHERE email = $1
          AND provider = 'local'
          AND email_verified = TRUE
          AND is_admin = FALSE
        """,
        _normalize_email(email),
    )


async def _activate_admin_invite_if_needed(db: asyncpg.Connection, email: str) -> bool:
    normalized_email = _normalize_email(email)
    invite = await db.fetchrow(
        """
        SELECT id
        FROM admin_invites
        WHERE email = $1 AND status = 'pending'
        """,
        normalized_email,
    )
    if not invite:
        return False

    await db.execute(
        """
        UPDATE users
        SET is_admin = TRUE,
            updated_at = NOW()
        WHERE email = $1
        """,
        normalized_email,
    )
    await db.execute(
        """
        UPDATE admin_invites
        SET status = 'activated',
            activated_at = NOW()
        WHERE id = $1
        """,
        invite["id"],
    )
    return True


async def _load_user_out_by_email(db: asyncpg.Connection, email: str) -> UserOut:
    normalized_email = _normalize_email(email)
    await _ensure_primary_admin_privilege(db, normalized_email)
    user = await db.fetchrow(
        """
        SELECT id
        FROM users
        WHERE email = $1
        """,
        normalized_email,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không thể xác thực quyền truy cập!",
            headers={"WWW-Authenticate": "Bearer"},
        )

    snapshot = await get_user_plan_snapshot(db, user["id"])
    return UserOut(
        id=snapshot["id"],
        email=snapshot["email"],
        created_at=snapshot["created_at"],
        full_name=snapshot["full_name"],
        is_admin=snapshot["is_admin"],
        is_primary_admin=_is_primary_admin_email(snapshot["email"]),
        email_verified=snapshot["email_verified"],
        plan_tier=snapshot["plan_tier"],
        plan_status=snapshot["plan_status"],
        plan_billing_period=snapshot["plan_billing_period"],
        plan_started_at=snapshot["plan_started_at"],
        plan_expires_at=snapshot["plan_expires_at"],
        session_limit=snapshot["session_limit"],
        sessions_used=snapshot["sessions_used"],
        can_start_new_session=snapshot["can_start_new_session"],
        is_billing_exempt=snapshot["is_billing_exempt"],
        avatar_url=snapshot["avatar_url"],
        resume_uploaded=snapshot["resume_uploaded"],
        resume_filename=snapshot["resume_filename"],
    )


async def _register_local_user(
    *,
    db: asyncpg.Connection,
    user_in: UserCreate,
    require_pending_admin_invite: bool = False,
) -> RegisterResponse:
    normalized_email = _normalize_email(user_in.email)
    existing_user = await db.fetchrow(
        "SELECT id, email FROM users WHERE email = $1",
        normalized_email,
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã tồn tại!")

    if require_pending_admin_invite and not (
        _is_primary_admin_email(normalized_email)
        or await _pending_admin_invite_exists(db, normalized_email)
    ):
        raise HTTPException(
            status_code=403,
            detail="Email này chưa được cấp quyền đăng ký admin.",
        )

    hashed_pwd = hash_password(user_in.password)
    new_user = await db.fetchrow(
        """
        INSERT INTO users (email, password_hash, full_name, email_verified, plan_tier, plan_status)
        VALUES ($1, $2, $3, FALSE, 'free_trial', 'active')
        RETURNING id, email
        """,
        normalized_email,
        hashed_pwd,
        user_in.full_name,
    )
    code, _ = await _issue_verification_code(db, user_id=new_user["id"])
    resend_available_in_seconds = 0
    message = _verification_delivery_message()

    try:
        await send_verification_email(new_user["email"], code)
        await _mark_verification_code_sent(db, user_id=new_user["id"])
        resend_available_in_seconds = settings.verification_resend_cooldown_seconds
    except Exception:
        logger.exception("Failed to deliver verification email for %s during register", new_user["email"])
        message = (
            "Tài khoản đã được tạo nhưng chưa thể gửi email xác thực. "
            "Vui lòng dùng chức năng gửi lại mã sau khi cấu hình email hoàn tất."
        )

    current_user = await _load_user_out_by_email(db, new_user["email"])
    return RegisterResponse(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at,
        full_name=current_user.full_name,
        is_admin=current_user.is_admin,
        is_primary_admin=current_user.is_primary_admin,
        email_verified=current_user.email_verified,
        plan_tier=current_user.plan_tier,
        plan_status=current_user.plan_status,
        plan_billing_period=current_user.plan_billing_period,
        plan_started_at=current_user.plan_started_at,
        plan_expires_at=current_user.plan_expires_at,
        session_limit=current_user.session_limit,
        sessions_used=current_user.sessions_used,
        can_start_new_session=current_user.can_start_new_session,
        is_billing_exempt=current_user.is_billing_exempt,
        avatar_url=current_user.avatar_url,
        resume_uploaded=current_user.resume_uploaded,
        resume_filename=current_user.resume_filename,
        verification_required=True,
        message=message,
        resend_available_in_seconds=resend_available_in_seconds,
    )


# 1. Register
@router.post("/register", response_model=RegisterResponse)
async def register(user_in: UserCreate, db: asyncpg.Connection = Depends(get_db)):
    return await _register_local_user(db=db, user_in=user_in)


@router.post("/admin/register", response_model=RegisterResponse)
async def admin_register(user_in: UserCreate, db: asyncpg.Connection = Depends(get_db)):
    return await _register_local_user(
        db=db,
        user_in=user_in,
        require_pending_admin_invite=True,
    )


# 2. Login
@router.post("/login")
async def login(
    db: asyncpg.Connection = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    normalized_email = _normalize_email(form_data.username)
    await _ensure_primary_admin_privilege(db, normalized_email)
    user = await db.fetchrow(
        "SELECT id, email, password_hash, provider, email_verified FROM users WHERE email = $1",
        normalized_email,
    )
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng!")
    if user["provider"] == "local" and not user["email_verified"]:
        raise HTTPException(
            status_code=403,
            detail="Email chưa được xác thực. Vui lòng nhập mã xác thực đã gửi đến Gmail của bạn.",
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


async def get_current_user(
    db: asyncpg.Connection = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực quyền truy cập!",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    return await _load_user_out_by_email(db, email)


# 3. /me
@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@router.post("/verify-email", response_model=EmailVerificationResponse)
async def verify_email(req: VerifyEmailRequest, db: asyncpg.Connection = Depends(get_db)):
    normalized_email = _normalize_email(req.email)
    normalized_code = req.code.strip()

    user = await db.fetchrow(
        """
        SELECT id, email, created_at, is_admin, email_verified, verification_code, verification_code_expires
        FROM users
        WHERE email = $1 AND provider = 'local'
        """,
        normalized_email,
    )
    if not user:
        raise HTTPException(status_code=400, detail="Email hoặc mã xác thực không hợp lệ!")

    if user["email_verified"]:
        access_token = create_access_token(data={"sub": user["email"]})
        return EmailVerificationResponse(
            message="Email đã được xác thực trước đó.",
            verified=True,
            access_token=access_token,
            token_type="bearer",
            is_admin=user["is_admin"] or _is_primary_admin_email(user["email"]),
        )

    if (
        user["verification_code"] != normalized_code
        or not user["verification_code_expires"]
    ):
        raise HTTPException(status_code=400, detail="Email hoặc mã xác thực không hợp lệ!")

    if user["verification_code_expires"] < _utcnow():
        raise HTTPException(status_code=400, detail="Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã mới!")

    await db.execute(
        """
        UPDATE users
        SET email_verified = TRUE,
            verification_code = NULL,
            verification_code_expires = NULL,
            updated_at = NOW()
        WHERE id = $1
        """,
        user["id"],
    )
    activated_from_invite = await _activate_admin_invite_if_needed(db, user["email"])
    await _ensure_primary_admin_privilege(db, user["email"])
    current_user = await _load_user_out_by_email(db, user["email"])

    access_token = create_access_token(data={"sub": user["email"]})
    return EmailVerificationResponse(
        message=(
            "Xác thực email thành công. Tài khoản admin đã được kích hoạt."
            if activated_from_invite or current_user.is_primary_admin
            else "Xác thực email thành công."
        ),
        verified=True,
        access_token=access_token,
        token_type="bearer",
        is_admin=current_user.is_admin,
    )


@router.post("/resend-verification-code", response_model=VerificationDeliveryResponse)
async def resend_verification_code(
    req: ResendVerificationCodeRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    normalized_email = req.email.strip().lower()
    user = await db.fetchrow(
        """
        SELECT id, email, email_verified, verification_code_sent_at
        FROM users
        WHERE email = $1 AND provider = 'local'
        """,
        normalized_email,
    )
    if not user:
        return VerificationDeliveryResponse(
            message="Nếu email tồn tại, mã xác thực mới sẽ được gửi.",
            resend_available_in_seconds=0,
        )

    if user["email_verified"]:
        return VerificationDeliveryResponse(
            message="Email này đã được xác thực.",
            resend_available_in_seconds=0,
        )

    cooldown_remaining = _resend_cooldown_remaining(user["verification_code_sent_at"])
    if cooldown_remaining > 0:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            headers={"Retry-After": str(cooldown_remaining)},
            content={
                "detail": f"Vui lòng chờ {cooldown_remaining} giây trước khi yêu cầu gửi lại mã mới.",
                "retry_after_seconds": cooldown_remaining,
            },
        )

    code, _ = await _issue_verification_code(db, user_id=user["id"])
    if settings.email_delivery_mode.lower() == "smtp":
        success_message = "Mã xác thực mới đã được gửi đến email của bạn."
    else:
        success_message = (
            "Máy chủ hiện chưa bật gửi email thật; mã xác thực mới đang được ghi vào backend logs để kiểm thử."
        )

    try:
        await send_verification_email(user["email"], code)
        await _mark_verification_code_sent(db, user_id=user["id"])
    except Exception:
        logger.exception("Failed to deliver verification email for %s during resend", user["email"])
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": (
                    "Đã tạo mã mới nhưng chưa gửi được email. "
                    "Vui lòng kiểm tra cấu hình SMTP rồi thử lại."
                ),
                "retry_after_seconds": 0,
            },
        )

    return VerificationDeliveryResponse(
        message=success_message,
        resend_available_in_seconds=settings.verification_resend_cooldown_seconds,
    )


# 4. Forgot Password (Demo Flow)
@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: asyncpg.Connection = Depends(get_db)):
    user = await db.fetchrow("SELECT id FROM users WHERE email = $1", req.email)
    if not user:
        # Prevent email enumeration by returning success regardless
        return {"message": "Nếu email hợp lệ, hướng dẫn khôi phục sẽ được hiển thị."}
    
    reset_token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.execute(
        "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
        reset_token, expires, user["id"]
    )
    
    # In Demo mode, we return the token in the response so user can copy it
    # Production would send an email via SMTP
    return {
        "message": "Demo Mode: Vui lòng sử dụng token dưới đây để đổi mật khẩu.",
        "reset_token": reset_token
    }


# 5. Reset Password
@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: asyncpg.Connection = Depends(get_db)):
    user = await db.fetchrow(
        "SELECT id, reset_token_expires FROM users WHERE reset_token = $1",
        req.token
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Token không hợp lệ hoặc không tồn tại!")
        
    if user["reset_token_expires"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token đã hết hạn!")
        
    hashed_pwd = hash_password(req.new_password)
    await db.execute(
        "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
        hashed_pwd, user["id"]
    )
        
    return {"message": "Mật khẩu đã được cập nhật thành công!"}


# ─── OAuth2 Logic ─────────────────────────────────────────────────────────────

async def process_oauth_login(
    db: asyncpg.Connection, email: str, provider: str, provider_id: str, full_name: Optional[str] = None
) -> str:
    """Xử lý tạo/lấy user từ OAuth và trả về JWT."""
    normalized_email = _normalize_email(email)
    if _is_primary_admin_email(normalized_email) or await _pending_admin_invite_exists(db, normalized_email):
        raise HTTPException(
            status_code=403,
            detail="Tài khoản admin chỉ được phép đăng nhập bằng email và mật khẩu.",
        )

    user = await db.fetchrow("SELECT id, email, is_admin FROM users WHERE email = $1", normalized_email)
    
    if not user:
        # Create new user
        # Generate random password for OAuth users because we need a non-null password_hash
        random_pwd = hash_password(secrets.token_urlsafe(32))
        user = await db.fetchrow(
            """INSERT INTO users (email, password_hash, provider, provider_id, email_verified) 
               VALUES ($1, $2, $3, $4, TRUE) RETURNING id, email""",
            normalized_email, random_pwd, provider, provider_id
        )
    else:
        if user["is_admin"]:
            raise HTTPException(
                status_code=403,
                detail="Tài khoản admin chỉ được phép đăng nhập bằng email và mật khẩu.",
            )
        # Update provider info if needed (link account)
        await db.execute(
            """
            UPDATE users
            SET provider = $1,
                provider_id = $2,
                email_verified = TRUE,
                verification_code = NULL,
                verification_code_expires = NULL,
                updated_at = NOW()
            WHERE id = $3
            """,
            provider, provider_id, user["id"]
        )

    # Generate JWT
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return access_token


# Google OAuth
@router.get("/oauth/google")
async def google_login():
    client_id = settings.google_client_id
    if not client_id:
        raise HTTPException(status_code=500, detail="Google Client ID chưa được cấu hình")
        
    redirect_uri = f"{settings.api_public_url}/auth/oauth/google/callback"
    scope = "openid email profile"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code"
        f"&client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}"
    )
    return {"url": auth_url}


@router.get("/oauth/google/callback")
async def google_callback(code: str, db: asyncpg.Connection = Depends(get_db)):
    client_id = settings.google_client_id
    client_secret = settings.google_client_secret
    redirect_uri = f"{settings.api_public_url}/auth/oauth/google/callback"
    provider_email: str | None = None

    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_res.status_code != 200:
                raise HTTPException(status_code=400, detail="Lỗi khi xác thực với Google")

            token_data = token_res.json()

            user_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            user_info = user_res.json()

        provider_email = user_info.get("email")
        if not provider_email:
            raise HTTPException(status_code=400, detail="Không lấy được email từ Google")

        access_token = await process_oauth_login(
            db, provider_email, "google", user_info["id"], user_info.get("name")
        )
        return RedirectResponse(f"{settings.frontend_public_url}/oauth/callback?token={access_token}")
    except HTTPException as exc:
        detail = str(exc.detail)
        return _oauth_error_redirect(
            "google",
            detail,
            email=provider_email,
            admin_restricted="admin" in detail.lower(),
        )
    except Exception:
        logger.exception("Unexpected Google OAuth callback failure")
        return _oauth_error_redirect("google", "Không thể đăng nhập với Google lúc này.")


# GitHub OAuth
@router.get("/oauth/github")
async def github_login():
    client_id = settings.github_client_id
    if not client_id:
        raise HTTPException(status_code=500, detail="GitHub Client ID chưa được cấu hình")
        
    redirect_uri = f"{settings.api_public_url}/auth/oauth/github/callback"
    scope = "user:email"
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}"
    )
    return {"url": auth_url}


@router.get("/oauth/github/callback")
async def github_callback(code: str, db: asyncpg.Connection = Depends(get_db)):
    client_id = settings.github_client_id
    client_secret = settings.github_client_secret
    redirect_uri = f"{settings.api_public_url}/auth/oauth/github/callback"
    email: str | None = None

    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            if token_res.status_code != 200:
                raise HTTPException(status_code=400, detail="Lỗi khi xác thực với GitHub")

            token_data = token_res.json()

            if "error" in token_data:
                raise HTTPException(status_code=400, detail=f"GitHub error: {token_data['error']}")

            user_res = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            user_info = user_res.json()

            email = user_info.get("email")
            if not email:
                emails_res = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {token_data['access_token']}"},
                )
                emails = emails_res.json()
                primary_email = next((e for e in emails if e["primary"]), None)
                if primary_email:
                    email = primary_email["email"]

        if not email:
            raise HTTPException(status_code=400, detail="Không lấy được email từ GitHub")

        access_token = await process_oauth_login(
            db, email, "github", str(user_info["id"]), user_info.get("name")
        )
        return RedirectResponse(f"{settings.frontend_public_url}/oauth/callback?token={access_token}")
    except HTTPException as exc:
        detail = str(exc.detail)
        return _oauth_error_redirect(
            "github",
            detail,
            email=email,
            admin_restricted="admin" in detail.lower(),
        )
    except Exception:
        logger.exception("Unexpected GitHub OAuth callback failure")
        return _oauth_error_redirect("github", "Không thể đăng nhập với GitHub lúc này.")
