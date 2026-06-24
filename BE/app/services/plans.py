from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

import asyncpg

from app.services.profile_files import avatar_url


FREE_TRIAL_PLAN = "free_trial"
BASIC_PLAN = "basic"
PRO_PLAN = "pro"
PREMIUM_PLAN = "premium"
ACTIVE_STATUS = "active"
EXPIRED_STATUS = "expired"
TRIAL_EXHAUSTED_STATUS = "trial_exhausted"
MONTHLY_PERIOD = "month"
YEARLY_PERIOD = "year"

PURCHASABLE_PLAN_TIERS = {BASIC_PLAN, PRO_PLAN, PREMIUM_PLAN}
PLAN_TIERS = {FREE_TRIAL_PLAN, *PURCHASABLE_PLAN_TIERS}
PLAN_STATUSES = {ACTIVE_STATUS, EXPIRED_STATUS, TRIAL_EXHAUSTED_STATUS}
BILLING_PERIODS = {MONTHLY_PERIOD, YEARLY_PERIOD}
QNA_ENABLED_PLAN_TIERS = {BASIC_PLAN, PRO_PLAN, PREMIUM_PLAN}

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
    PREMIUM_PLAN: {
        MONTHLY_PERIOD: 299_000,
        YEARLY_PERIOD: 2_799_000,
    },
}

PLAN_SESSION_TIME_LIMITS = {
    FREE_TRIAL_PLAN: 5,
    BASIC_PLAN: 7,
    PRO_PLAN: 10,
    PREMIUM_PLAN: None,
}
EXPORT_ENABLED_PLAN_TIERS = {PRO_PLAN, PREMIUM_PLAN}


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


def normalize_redeem_code(code: str) -> str:
    return str(uuid.UUID(code.strip()))


def _normalize_redeem_plan_tier(plan_tier: str) -> str:
    normalized = plan_tier.strip().lower()
    if normalized not in PURCHASABLE_PLAN_TIERS:
        raise ValueError("Unsupported redeem plan tier")
    return normalized


async def create_redeem_code_record(
    db: asyncpg.Connection,
    *,
    created_by_admin_id,
    plan_tier: str,
    expires_at: datetime,
) -> dict[str, Any]:
    normalized_plan_tier = _normalize_redeem_plan_tier(plan_tier)
    code_value = uuid.uuid4()
    row = await db.fetchrow(
        """
        INSERT INTO redeem_codes (code, plan_tier, expires_at, created_by_admin_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, code, plan_tier, expires_at, redeemed_at, redeemed_by_user_id, created_at
        """,
        code_value,
        normalized_plan_tier,
        expires_at,
        created_by_admin_id,
    )
    if row is None:
        raise ValueError("Unable to create redeem code")
    return dict(row)


async def list_redeem_code_records(db: asyncpg.Connection) -> list[dict[str, Any]]:
    rows = await db.fetch(
        """
        SELECT
            rc.id,
            rc.code,
            rc.plan_tier,
            rc.expires_at,
            rc.redeemed_at,
            u.email AS redeemed_by_email,
            rc.created_at
        FROM redeem_codes rc
        LEFT JOIN users u ON u.id = rc.redeemed_by_user_id
        ORDER BY rc.created_at DESC
        LIMIT 100
        """
    )
    return [dict(row) for row in rows]


def resolve_plan_price(plan_tier: str, billing_period: str) -> int:
    normalized_tier = normalize_plan_tier(plan_tier)
    normalized_period = normalize_billing_period(billing_period)
    if normalized_tier not in PURCHASABLE_PLAN_TIERS or normalized_period is None:
        raise ValueError("Unsupported plan tier or billing period")
    return PLAN_PRICES_VND[normalized_tier][normalized_period]


def resolve_session_time_limit_minutes(
    *,
    is_admin: bool,
    plan_tier: str | None,
    plan_status: str | None,
) -> int | None:
    if is_admin:
        return None

    normalized_tier = normalize_plan_tier(plan_tier)
    normalized_status = normalize_plan_status(plan_status)

    if normalized_status != ACTIVE_STATUS:
        return PLAN_SESSION_TIME_LIMITS[FREE_TRIAL_PLAN]

    return PLAN_SESSION_TIME_LIMITS.get(normalized_tier, PLAN_SESSION_TIME_LIMITS[FREE_TRIAL_PLAN])


def can_export_sessions(
    *,
    is_admin: bool,
    plan_tier: str | None,
    plan_status: str | None,
) -> bool:
    if is_admin:
        return True

    normalized_tier = normalize_plan_tier(plan_tier)
    normalized_status = normalize_plan_status(plan_status)
    return normalized_status == ACTIVE_STATUS and normalized_tier in EXPORT_ENABLED_PLAN_TIERS


def get_current_billing_cycle_start(plan_started_at: datetime | None, now: datetime) -> datetime | None:
    if not plan_started_at:
        return None
    elapsed = now - plan_started_at
    periods = max(0, elapsed.days // 30)
    return plan_started_at + timedelta(days=periods * 30)


def resolve_additional_session_price(plan_tier: str | None) -> int:
    normalized_tier = normalize_plan_tier(plan_tier)
    if normalized_tier == BASIC_PLAN:
        return 35_000
    elif normalized_tier == PRO_PLAN:
        return 30_000
    elif normalized_tier == PREMIUM_PLAN:
        return 28_000
    return 35_000


def compute_entitlement(
    *,
    is_admin: bool,
    plan_tier: str | None,
    plan_status: str | None,
    plan_billing_period: str | None,
    plan_expires_at: datetime | None,
    sessions_used: int,
    additional_sessions: int = 0,
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
            "can_use_qna": True,
            "is_billing_exempt": True,
        }

    if normalized_tier in PURCHASABLE_PLAN_TIERS and plan_expires_at and plan_expires_at > current_time:
        if normalized_tier == BASIC_PLAN:
            base_limit = 5
        elif normalized_tier == PRO_PLAN:
            base_limit = 8
        elif normalized_tier == PREMIUM_PLAN:
            base_limit = 12
        else:
            base_limit = 5

        remaining_base = max(0, base_limit - sessions_used)
        total_limit = sessions_used + remaining_base + additional_sessions
        can_start = (sessions_used < base_limit) or (additional_sessions > 0)
        return {
            "plan_tier": normalized_tier,
            "plan_status": ACTIVE_STATUS,
            "plan_billing_period": normalized_period,
            "session_limit": total_limit,
            "sessions_used": sessions_used,
            "can_start_new_session": can_start,
            "can_use_qna": normalized_tier in QNA_ENABLED_PLAN_TIERS,
            "is_billing_exempt": False,
        }

    if normalized_tier in PURCHASABLE_PLAN_TIERS:
        remaining_base = max(0, TRIAL_SESSION_LIMIT - sessions_used)
        total_limit = sessions_used + remaining_base + additional_sessions
        can_start = (sessions_used < TRIAL_SESSION_LIMIT) or (additional_sessions > 0)
        return {
            "plan_tier": normalized_tier,
            "plan_status": EXPIRED_STATUS,
            "plan_billing_period": normalized_period,
            "session_limit": total_limit,
            "sessions_used": sessions_used,
            "can_start_new_session": can_start,
            "can_use_qna": False,
            "is_billing_exempt": False,
        }

    remaining_base = max(0, TRIAL_SESSION_LIMIT - sessions_used)
    trial_limit = sessions_used + remaining_base + additional_sessions
    trial_status = ACTIVE_STATUS if (sessions_used < TRIAL_SESSION_LIMIT or additional_sessions > 0) else TRIAL_EXHAUSTED_STATUS
    can_start = (sessions_used < TRIAL_SESSION_LIMIT) or (additional_sessions > 0)
    return {
        "plan_tier": FREE_TRIAL_PLAN,
        "plan_status": trial_status,
        "plan_billing_period": None,
        "session_limit": trial_limit,
        "sessions_used": sessions_used,
        "can_start_new_session": can_start,
        "can_use_qna": False,
        "is_billing_exempt": False,
    }


async def count_user_sessions(db: asyncpg.Connection, user_id, since: datetime | None = None) -> int:
    if since:
        total = await db.fetchval("SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND created_at >= $2", user_id, since)
    else:
        total = await db.fetchval("SELECT COUNT(*) FROM sessions WHERE user_id = $1", user_id)
    return int(total or 0)


async def get_user_plan_snapshot(db: asyncpg.Connection, user_id, now: datetime | None = None) -> dict[str, Any]:
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
            resume_filename,
            additional_sessions
        FROM users
        WHERE id = $1
        """,
        user_id,
    )
    if row is None:
        raise ValueError("User not found")

    current_time = now or utcnow()
    since = None
    if row["plan_status"] == ACTIVE_STATUS and row["plan_started_at"]:
        since = get_current_billing_cycle_start(row["plan_started_at"], current_time)

    sessions_used = await count_user_sessions(db, row["id"], since=since)
    try:
        add_sess = row["additional_sessions"] or 0
    except (KeyError, TypeError):
        add_sess = 0

    entitlement = compute_entitlement(
        is_admin=row["is_admin"],
        plan_tier=row["plan_tier"],
        plan_status=row["plan_status"],
        plan_billing_period=row["plan_billing_period"],
        plan_expires_at=row["plan_expires_at"],
        sessions_used=sessions_used,
        additional_sessions=add_sess,
        now=current_time,
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


async def redeem_plan_code(
    db: asyncpg.Connection,
    *,
    user_id,
    code: str,
    redeemed_at: datetime | None = None,
) -> dict[str, Any]:
    normalized_code = normalize_redeem_code(code)
    activated_at = redeemed_at or utcnow()
    async with db.transaction():
        row = await db.fetchrow(
            """
            UPDATE redeem_codes
               SET redeemed_at = $1,
                   redeemed_by_user_id = $2,
                   updated_at = NOW()
             WHERE code = $3::uuid
               AND redeemed_at IS NULL
               AND expires_at > $1
         RETURNING id, code, plan_tier, expires_at, redeemed_at, redeemed_by_user_id, created_at
            """,
            activated_at,
            user_id,
            normalized_code,
        )
        if row is None:
            existing = await db.fetchrow(
                """
                SELECT redeemed_at, expires_at
                FROM redeem_codes
                WHERE code = $1::uuid
                """,
                normalized_code,
            )
            if existing is None:
                raise ValueError("Invalid redeem code")
            if existing["redeemed_at"] is not None:
                raise ValueError("Redeem code already used")
            raise ValueError("Redeem code expired")

        snapshot = await activate_paid_plan(
            db,
            user_id=user_id,
            plan_tier=row["plan_tier"],
            billing_period=MONTHLY_PERIOD,
            activated_at=activated_at,
        )

        await db.execute(
            """
            INSERT INTO redeem_code_redemptions (user_id, redeem_code, plan_tier, billing_period, redeemed_at)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id,
            normalized_code,
            row["plan_tier"],
            MONTHLY_PERIOD,
            activated_at,
        )

        return snapshot
