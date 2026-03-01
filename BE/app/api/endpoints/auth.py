from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
import asyncpg
import os
from datetime import timedelta
from jose import JWTError, jwt

from db.session import get_db
from schemas.user import UserCreate, UserOut
from core.security import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# 1. Register
@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, db: asyncpg.Connection = Depends(get_db)):
    existing_user = await db.fetchrow(
        "SELECT id, email FROM users WHERE email = $1",
        user_in.email,
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã tồn tại!")

    hashed_pwd = hash_password(user_in.password)
    new_user = await db.fetchrow(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
        user_in.email,
        hashed_pwd,
    )
    return UserOut(id=new_user["id"], email=new_user["email"], created_at=new_user["created_at"])


# 2. Login
@router.post("/login")
async def login(
    db: asyncpg.Connection = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = await db.fetchrow(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        form_data.username,
    )
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng!")

    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")))
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

    user = await db.fetchrow(
        "SELECT id, email, created_at FROM users WHERE email = $1",
        email,
    )
    if user is None:
        raise credentials_exception
    return UserOut(id=user["id"], email=user["email"], created_at=user["created_at"])


# 3. /me
@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: UserOut = Depends(get_current_user)):
    return current_user
