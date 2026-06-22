from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

from app.services.payment_orders import delete_stale_pending_payment_orders


def test_delete_stale_pending_payment_orders_uses_72_hour_cutoff() -> None:
    async def run() -> int:
        db = AsyncMock()
        db.fetch.return_value = [{"id": "1"}, {"id": "2"}]

        deleted_count = await delete_stale_pending_payment_orders(db)

        assert deleted_count == 2
        db.fetch.assert_awaited_once()
        query = db.fetch.await_args.args[0]
        hours = db.fetch.await_args.args[1]
        assert "DELETE FROM payment_orders" in query
        assert "status = 'pending'" in query
        assert "created_at < NOW() - ($1::int * INTERVAL '1 hour')" in query
        assert hours == 72
        return deleted_count

    assert asyncio.run(run()) == 2
