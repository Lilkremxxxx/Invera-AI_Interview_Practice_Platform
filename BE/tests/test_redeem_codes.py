import asyncio
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import plans


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeRedeemDb:
    def __init__(self, rows: dict[str, dict]):
        self.rows = rows
        self.fetchrow_calls = []
        self.execute_calls = []

    def transaction(self):
        return FakeTransaction()

    async def fetchrow(self, query, *params):
        self.fetchrow_calls.append((query, params))
        if "FROM redeem_codes" in query and "SELECT redeemed_at, expires_at" in query:
            return self.rows.get(str(params[0]))
        if "UPDATE redeem_codes" in query:
            code = str(params[2])
            row = self.rows.get(code)
            if row is None:
                return None
            if row.get("redeemed_at") is not None:
                return None
            if row["expires_at"] <= params[0]:
                return None
            row["redeemed_at"] = params[0]
            row["redeemed_by_user_id"] = params[1]
            return {
                "id": row["id"],
                "plan_tier": row["plan_tier"],
                "expires_at": row["expires_at"],
            }
        return None

    async def execute(self, query, *params):
        self.execute_calls.append((query, params))
        return "OK"


def test_redeem_plan_code_redeems_uuid_code_once(monkeypatch):
    frozen_now = datetime(2026, 6, 24, 3, 31, tzinfo=timezone.utc)
    code = str(uuid.uuid4())
    user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    other_user_id = uuid.UUID("22222222-2222-2222-2222-222222222222")

    fake_db = FakeRedeemDb(
        {
            code: {
                "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
                "plan_tier": "basic",
                "expires_at": frozen_now + timedelta(days=7),
                "redeemed_at": None,
                "redeemed_by_user_id": None,
            }
        }
    )
    activate_calls = []

    async def fake_activate_paid_plan(db, *, user_id, plan_tier, billing_period, activated_at):
        activate_calls.append(
            {
                "user_id": user_id,
                "plan_tier": plan_tier,
                "billing_period": billing_period,
                "activated_at": activated_at,
            }
        )
        return {
            "plan_tier": plan_tier,
            "plan_billing_period": billing_period,
            "plan_expires_at": activated_at + timedelta(days=30),
        }

    monkeypatch.setattr(plans, "activate_paid_plan", fake_activate_paid_plan)
    monkeypatch.setattr(plans, "utcnow", lambda: frozen_now)

    snapshot = asyncio.run(plans.redeem_plan_code(fake_db, user_id=user_id, code=code))

    assert snapshot["plan_tier"] == "basic"
    assert activate_calls == [
        {
            "user_id": user_id,
            "plan_tier": "basic",
            "billing_period": plans.MONTHLY_PERIOD,
            "activated_at": frozen_now,
        }
    ]

    with pytest.raises(ValueError, match="already used"):
        asyncio.run(plans.redeem_plan_code(fake_db, user_id=other_user_id, code=code))


def test_redeem_plan_code_rejects_expired_uuid_code(monkeypatch):
    frozen_now = datetime(2026, 6, 24, 3, 31, tzinfo=timezone.utc)
    code = str(uuid.uuid4())
    user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")

    fake_db = FakeRedeemDb(
        {
            code: {
                "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
                "plan_tier": "pro",
                "expires_at": frozen_now - timedelta(days=1),
                "redeemed_at": None,
                "redeemed_by_user_id": None,
            }
        }
    )

    monkeypatch.setattr(plans, "utcnow", lambda: frozen_now)

    with pytest.raises(ValueError, match="expired"):
        asyncio.run(plans.redeem_plan_code(fake_db, user_id=user_id, code=code))
