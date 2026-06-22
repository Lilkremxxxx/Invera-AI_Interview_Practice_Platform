from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

from app.api.endpoints.admin import admin_revenue


def test_admin_revenue_groups_totals_by_plan_and_extra_sessions(monkeypatch) -> None:
    async def run() -> None:
        db = AsyncMock()
        db.fetch.return_value = [
            {
                "day": "2026-06-18",
                "basic_revenue": 99000,
                "pro_revenue": 199000,
                "premium_revenue": 299000,
                "additional_sessions_count": 12,
                "total_revenue": 609000,
            }
        ]
        db.fetchrow.return_value = {
            "total_revenue": 609000,
            "basic_revenue": 99000,
            "pro_revenue": 199000,
            "premium_revenue": 299000,
            "additional_sessions_count": 12,
        }

        async def noop_sync_pending_payos_orders(_: object) -> None:
            return None

        monkeypatch.setattr("app.api.endpoints.admin.sync_pending_payos_orders", noop_sync_pending_payos_orders)

        result = await admin_revenue(db=db, _=object())  # type: ignore[arg-type]

        assert result["total_revenue"] == 609000
        assert result["breakdown"]["summary"]["basic_revenue"] == 99000
        assert result["breakdown"]["summary"]["additional_sessions_count"] == 12
        assert len(result["breakdown"]["daily"]) == 30

    asyncio.run(run())
