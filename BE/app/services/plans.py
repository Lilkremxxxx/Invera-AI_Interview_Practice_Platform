from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import asyncpg

from app.services.profile_files import avatar_url


FREE_TRIAL_PLAN = "free_trial"
BASIC_PLAN = "basic"
PRO_PLAN = "pro"
ACTIVE_STATUS = "active"
EXPIRED_STATUS = "expired"
TRIAL_EXHAUSTED_STATUS = "trial_exhausted"
MONTHLY_PERIOD = "month"
YEARLY_PERIOD = "year"

PURCHASABLE_PLAN_TIERS = {BASIC_PLAN, PRO_PLAN}
PLAN_TIERS = {FREE_TRIAL_PLAN, *PURCHASABLE_PLAN_TIERS}
PLAN_STATUSES = {ACTIVE_STATUS, EXPIRED_STATUS, TRIAL_EXHAUSTED_STATUS}
BILLING_PERIODS = {MONTHLY_PERIOD, YEARLY_PERIOD}

TRIAL_SESSION_LIMIT = 1

PLAN_PRICES_VND = {
    BASIC_PLAN: {
        MONTHLY_PERIOD: 99_000,
        YEARLY_PERIOD: 799_000,
    },
    PRO_PLAN: {
        MONTHLY_PERIOD: 199_000,
        YEARLY_PERIOD: 1_799_000,
    },
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_plan_tier(value: str | None) -> str:
    if value in PLAN_TIERS:
        return value
    return FREE_TRIAL_PLAN


def normalize_plan_status(value: str | None) -> str:
    if value in PLAN_STATUSES:
        return value
    return ACTIVE_STATUS


def normalize_billing_period(value: str | None) -> str | None:
    if value in BILLING_PERIODS:
        return value
    return None


def duration_for_period(period: str) -> timedelta:
    return timedelta(days=365 if period == YEARLY_PERIOD else 30)


def resolve_plan_price(plan_tier: str, billing_period: str) -> int:
    normalized_tier = normalize_plan_tier(plan_tier)
    normalized_period = normalize_billing_period(billing_period)
    if normalized_tier not in PURCHASABLE_PLAN_TIERS or normalized_period is None:
        raise ValueError("Unsupported plan tier or billing period")
    return PLAN_PRICES_VND[normalized_tier][normalized_period]


def compute_entitlement(
    *,
    is_admin: bool,
    plan_tier: str | None,
    plan_status: str | None,
    plan_billing_period: str | None,
    plan_expires_at: datetime | None,
    sessions_used: int,
    now: datetime | None = None,
) -> dict[str, Any]:
    current_time = now or utcnow()
    normalized_tier = normalize_plan_tier(plan_tier)
    normalized_status = normalize_plan_status(plan_status)
    normalized_period = normalize_billing_period(plan_billing_period)

    if is_admin:
        return {
            "plan_tier": normalized_tier,
            "plan_status": ACTIVE_STATUS,
            "plan_billing_period": normalized_period,
            "session_limit": None,
            "sessions_used": sessions_used,
            "can_start_new_session": True,
            "is_billing_exempt": True,
        }

    if normalized_tier in PURCHASABLE_PLAN_TIERS and plan_expires_at and plan_expires_at > current_time:
        return {
            "plan_tier": normalized_tier,
            "plan_status": ACTIVE_STATUS,
            "plan_billing_period": normalized_period,
            "session_limit": None,
            "sessions_used": sessions_used,
            "can_start_new_session": True,
            "is_billing_exempt": False,
        }

    if normalized_tier in PURCHASABLE_PLAN_TIERS:
        return {
            "plan_tier": normalized_tier,
            "plan_status": EXPIRED_STATUS,
            "plan_billing_period": normalized_period,
            "session_limit": TRIAL_SESSION_LIMIT,
            "sessions_used": sessions_used,
            "can_start_new_session": sessions_used < TRIAL_SESSION_LIMIT,
            "is_billing_exempt": False,
        }

    trial_status = ACTIVE_STATUS if sessions_used < TRIAL_SESSION_LIMIT else TRIAL_EXHAUSTED_STATUS
    return {
        "plan_tier": FREE_TRIAL_PLAN,
        "plan_status": trial_status,
        "plan_billing_period": None,
        "session_limit": TRIAL_SESSION_LIMIT,
        "sessions_used": sessions_used,
        "can_start_new_session": sessions_used < TRIAL_SESSION_LIMIT,
        "is_billing_exempt": False,
    }


async def count_user_sessions(db: asyncpg.Connection, user_id) -> int:
    total = await db.fetchval("SELECT COUNT(*) FROM sessions WHERE user_id = $1", user_id)
    return int(total or 0)


async def get_user_plan_snapshot(db: asyncpg.Connection, user_id) -> dict[str, Any]:
    row = await db.fetchrow(
        """
        SELECT
            id,
            email,
            created_at,
            full_name,
            is_admin,
            email_verified,
            plan_tier,
            plan_status,
            plan_billing_period,
            plan_started_at,
            plan_expires_at,
            avatar_path,
            resume_path,
            resume_filename
        FROM users
        WHERE id = $1
        """,
        user_id,
    )
    if row is None:
        raise ValueError("User not found")

    sessions_used = await count_user_sessions(db, row["id"])
    entitlement = compute_entitlement(
        is_admin=row["is_admin"],
        plan_tier=row["plan_tier"],
        plan_status=row["plan_status"],
        plan_billing_period=row["plan_billing_period"],
        plan_expires_at=row["plan_expires_at"],
        sessions_used=sessions_used,
    )

    if row["plan_status"] != entitlement["plan_status"]:
        await db.execute(
            """
            UPDATE users
            SET plan_status = $1,
                updated_at = NOW()
            WHERE id = $2
            """,
            entitlement["plan_status"],
            row["id"],
        )
        row = dict(row)
        row["plan_status"] = entitlement["plan_status"]

    return {
        **dict(row),
        **entitlement,
        "avatar_url": avatar_url(row["avatar_path"]),
        "resume_uploaded": bool(row["resume_path"]),
        "resume_filename": row["resume_filename"],
    }


async def activate_paid_plan(
    db: asyncpg.Connection,
    *,
    user_id,
    plan_tier: str,
    billing_period: str,
    activated_at: datetime | None = None,
) -> dict[str, Any]:
    normalized_tier = normalize_plan_tier(plan_tier)
    normalized_period = normalize_billing_period(billing_period)
    if normalized_tier not in PURCHASABLE_PLAN_TIERS or normalized_period is None:
        raise ValueError("Unsupported paid plan activation request")

    start_at = activated_at or utcnow()
    expires_at = start_at + duration_for_period(normalized_period)

    await db.execute(
        """
        UPDATE users
        SET plan_tier = $1,
            plan_status = $2,
            plan_billing_period = $3,
            plan_started_at = $4,
            plan_expires_at = $5,
            updated_at = NOW()
        WHERE id = $6
        """,
        normalized_tier,
        ACTIVE_STATUS,
        normalized_period,
        start_at,
        expires_at,
        user_id,
    )
    return await get_user_plan_snapshot(db, user_id)
