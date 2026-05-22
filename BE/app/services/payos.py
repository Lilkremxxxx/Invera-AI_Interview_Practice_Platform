from __future__ import annotations

import hmac
import hashlib
import json
from typing import Any, Mapping

import httpx


class PayOSError(RuntimeError):
    pass


def _stringify_signature_value(value: Any) -> str:
    if value is None or value in ("null", "NULL", "undefined"):
        return ""
    if isinstance(value, bool):
        return str(value).lower()
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        sorted_items = [dict(sorted(item.items())) if isinstance(item, dict) else item for item in value]
        return json.dumps(sorted_items, separators=(",", ":"), ensure_ascii=False)
    return str(value)


def build_signature_payload(data: Mapping[str, Any]) -> str:
    return "&".join(
        f"{key}={_stringify_signature_value(data[key])}"
        for key in sorted(data)
    )


def build_payment_signature(data: Mapping[str, Any], checksum_key: str) -> str:
    payload = build_signature_payload(data)
    return hmac.new(
        checksum_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_payment_webhook_signature(data: Mapping[str, Any], signature: str, checksum_key: str) -> bool:
    expected = build_payment_signature(data, checksum_key)
    return hmac.compare_digest(expected, signature)


def build_create_payment_signature(
    *,
    amount: int,
    cancel_url: str,
    description: str,
    order_code: int,
    return_url: str,
    checksum_key: str,
) -> str:
    return build_payment_signature(
        {
            "amount": amount,
            "cancelUrl": cancel_url,
            "description": description,
            "orderCode": order_code,
            "returnUrl": return_url,
        },
        checksum_key,
    )


async def create_payment_link(
    *,
    api_base_url: str,
    client_id: str,
    api_key: str,
    checksum_key: str,
    order_code: int,
    amount: int,
    description: str,
    return_url: str,
    cancel_url: str,
    buyer_email: str,
    buyer_name: str | None = None,
    timeout_seconds: float = 20,
) -> dict[str, Any]:
    signature = build_create_payment_signature(
        amount=amount,
        cancel_url=cancel_url,
        description=description,
        order_code=order_code,
        return_url=return_url,
        checksum_key=checksum_key,
    )
    payload: dict[str, Any] = {
        "orderCode": order_code,
        "amount": amount,
        "description": description,
        "buyerEmail": buyer_email,
        "cancelUrl": cancel_url,
        "returnUrl": return_url,
        "signature": signature,
    }
    if buyer_name:
        payload["buyerName"] = buyer_name

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        response = await client.post(
            f"{api_base_url.rstrip('/')}/v2/payment-requests",
            headers={
                "x-client-id": client_id,
                "x-api-key": api_key,
                "Content-Type": "application/json",
            },
            json=payload,
        )

    try:
        body = response.json()
    except ValueError as exc:
        raise PayOSError("PayOS returned a non-JSON response") from exc

    if response.status_code >= 400 or body.get("code") != "00":
        message = body.get("desc") or f"PayOS request failed with HTTP {response.status_code}"
        raise PayOSError(str(message))

    data = body.get("data")
    if not isinstance(data, dict) or not data.get("checkoutUrl"):
        raise PayOSError("PayOS response did not include a checkout URL")

    return data


async def get_payment_link_information(
    *,
    api_base_url: str,
    client_id: str,
    api_key: str,
    order_id_or_code: str | int,
    timeout_seconds: float = 20,
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        response = await client.get(
            f"{api_base_url.rstrip('/')}/v2/payment-requests/{order_id_or_code}",
            headers={
                "x-client-id": client_id,
                "x-api-key": api_key,
            },
        )

    try:
        body = response.json()
    except ValueError as exc:
        raise PayOSError("PayOS returned a non-JSON response") from exc

    if response.status_code >= 400 or body.get("code") != "00":
        message = body.get("desc") or f"PayOS request failed with HTTP {response.status_code}"
        raise PayOSError(str(message))

    data = body.get("data")
    if not isinstance(data, dict):
        raise PayOSError("PayOS response did not include data dict")

    return data

