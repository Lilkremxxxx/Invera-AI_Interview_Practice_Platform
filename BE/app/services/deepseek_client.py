from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx

from app.core.config import settings


class DeepSeekAPIError(RuntimeError):
    pass


_clients: dict[float, httpx.AsyncClient] = {}
_clients_lock = asyncio.Lock()


async def _get_deepseek_client(timeout_seconds: float) -> httpx.AsyncClient:
    async with _clients_lock:
        client = _clients.get(timeout_seconds)
        if client is None or client.is_closed:
            client = httpx.AsyncClient(timeout=timeout_seconds)
            _clients[timeout_seconds] = client
        return client


async def close_deepseek_client() -> None:
    async with _clients_lock:
        clients = list(_clients.values())
        _clients.clear()

    for client in clients:
        try:
            await client.aclose()
        except RuntimeError as e:
            if "Event loop is closed" not in str(e):
                raise


async def create_chat_completion(
    *,
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
    max_tokens: int | None = None,
    timeout_seconds: float | None = None,
    temperature: float | None = None,
) -> dict[str, Any]:
    if not settings.deepseek_api_key:
        raise DeepSeekAPIError("DeepSeek API key is not configured.")

    resolved_model = model or settings.deepseek_model
    payload = {
        "model": resolved_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens or settings.deepseek_max_tokens,
        "response_format": {"type": "json_object"},
    }
    if resolved_model != "deepseek-reasoner":
        payload["temperature"] = settings.deepseek_temperature if temperature is None else temperature

    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }

    endpoint = settings.deepseek_api_base_url.rstrip("/") + "/chat/completions"

    try:
        client = await _get_deepseek_client(timeout_seconds or settings.deepseek_timeout_seconds)
        response = await client.post(endpoint, headers=headers, json=payload)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:800]
        raise DeepSeekAPIError(
            f"DeepSeek API returned HTTP {exc.response.status_code}: {body}"
        ) from exc
    except httpx.HTTPError as exc:
        raise DeepSeekAPIError(
            f"DeepSeek API request failed ({type(exc).__name__}): {exc!r}"
        ) from exc

    try:
        data = response.json()
    except json.JSONDecodeError as exc:
        raise DeepSeekAPIError("DeepSeek API returned invalid JSON.") from exc

    try:
        message = data["choices"][0]["message"]
        content = message["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise DeepSeekAPIError("DeepSeek API response is missing message content.") from exc

    if not isinstance(content, str) or not content.strip():
        reasoning = message.get("reasoning_content")
        if isinstance(reasoning, str) and reasoning.strip():
            raise DeepSeekAPIError(
                "DeepSeek API returned reasoning only without final content. "
                "Increase max_tokens or reduce prompt size."
            )
        raise DeepSeekAPIError("DeepSeek API returned an empty message.")

    return {
        "raw": data,
        "content": content.strip(),
        "reasoning_content": message.get("reasoning_content"),
    }
