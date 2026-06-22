from __future__ import annotations

import asyncio
import logging

import asyncpg


logger = logging.getLogger(__name__)

PENDING_PAYMENT_ORDER_MAX_AGE_HOURS = 72
PENDING_PAYMENT_ORDER_CLEANUP_INTERVAL_SECONDS = 24 * 60 * 60


async def delete_stale_pending_payment_orders(
    db: asyncpg.Connection,
    *,
    older_than_hours: int = PENDING_PAYMENT_ORDER_MAX_AGE_HOURS,
) -> int:
    rows = await db.fetch(
        """
        DELETE FROM payment_orders
        WHERE status = 'pending'
          AND created_at < NOW() - ($1::int * INTERVAL '1 hour')
        RETURNING id
        """,
        older_than_hours,
    )
    return len(rows)


async def payment_order_cleanup_loop(
    pool: asyncpg.Pool,
    *,
    older_than_hours: int = PENDING_PAYMENT_ORDER_MAX_AGE_HOURS,
    interval_seconds: int = PENDING_PAYMENT_ORDER_CLEANUP_INTERVAL_SECONDS,
) -> None:
    while True:
        try:
            async with pool.acquire() as conn:
                deleted_count = await delete_stale_pending_payment_orders(
                    conn,
                    older_than_hours=older_than_hours,
                )
            if deleted_count:
                logger.info(
                    "Deleted %s stale pending payment orders older than %s hours",
                    deleted_count,
                    older_than_hours,
                )
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning("Pending payment order cleanup failed: %s", exc)

        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            raise
