import os
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))


@pytest.mark.asyncio
async def test_create_chat_completion_reuses_async_client(monkeypatch):
    from app.services import deepseek_client

    created_clients = []

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": '{"ok": true}'}}]}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout
            self.is_closed = False
            created_clients.append(self)

        async def post(self, *args, **kwargs):
            return FakeResponse()

        async def aclose(self):
            self.is_closed = True

    monkeypatch.setattr(deepseek_client.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(
        deepseek_client,
        "settings",
        SimpleNamespace(
            deepseek_api_key="test-key",
            deepseek_api_base_url="https://api.example.test",
            deepseek_model="deepseek-chat",
            deepseek_max_tokens=80,
            deepseek_temperature=0.2,
            deepseek_timeout_seconds=30,
        ),
    )

    await deepseek_client.close_deepseek_client()
    try:
        for _ in range(3):
            response = await deepseek_client.create_chat_completion(
                system_prompt="Return JSON.",
                user_prompt="Return {\"ok\": true}.",
                timeout_seconds=12,
            )
            assert response["content"] == '{"ok": true}'

        assert len(created_clients) == 1
        assert created_clients[0].timeout == 12
    finally:
        await deepseek_client.close_deepseek_client()
