import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import main


class DummyTask:
    def done(self) -> bool:
        return False

    def cancel(self) -> None:
        return None


class FakePool:
    pass


def test_startup_waits_for_migrations_before_ready(monkeypatch):
    created_tasks: list[object] = []
    migration_started = asyncio.Event()
    migration_released = asyncio.Event()

    async def fake_create_pool():
        return FakePool()

    async def fake_run_startup_migrations():
        migration_started.set()
        await migration_released.wait()

    async def fake_cleanup_loop(_pool):
        await asyncio.sleep(0)

    def fake_create_task(coro):
        created_tasks.append(coro)
        coro.close()
        return DummyTask()

    monkeypatch.setattr(main, "create_pool", fake_create_pool)
    monkeypatch.setattr(main, "_run_startup_migrations", fake_run_startup_migrations)
    monkeypatch.setattr(main, "payment_order_cleanup_loop", fake_cleanup_loop)
    monkeypatch.setattr(main.asyncio, "create_task", fake_create_task)
    monkeypatch.setattr(main, "close_pool", lambda: asyncio.sleep(0))

    async def run_startup():
        startup_task = asyncio.get_running_loop().create_task(main.startup_event())
        await migration_started.wait()
        await asyncio.sleep(0)
        assert not startup_task.done()
        assert created_tasks == []
        migration_released.set()
        await asyncio.wait_for(startup_task, timeout=1)

    asyncio.run(run_startup())

    assert len(created_tasks) == 1
