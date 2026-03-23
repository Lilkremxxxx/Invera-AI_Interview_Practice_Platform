from __future__ import annotations

import hashlib
import hmac
from datetime import datetime
from typing import Mapping
from urllib.parse import urlencode


def _stringify_params(params: Mapping[str, str | int]) -> dict[str, str]:
    return {
        key: str(value)
        for key, value in params.items()
        if value is not None and value != ""
    }


def build_secure_hash(params: Mapping[str, str | int], secret: str) -> str:
    normalized = _stringify_params(params)
    sorted_params = dict(sorted(normalized.items()))
    payload = urlencode(sorted_params)
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha512).hexdigest()


def build_payment_url(base_url: str, params: Mapping[str, str | int], secret: str) -> str:
    normalized = _stringify_params(params)
    sorted_params = dict(sorted(normalized.items()))
    secure_hash = build_secure_hash(sorted_params, secret)
    sorted_params["vnp_SecureHash"] = secure_hash
    return f"{base_url}?{urlencode(sorted_params)}"


def verify_response(params: Mapping[str, str], secret: str) -> bool:
    payload = {
        key: value
        for key, value in params.items()
        if key not in {"vnp_SecureHash", "vnp_SecureHashType"} and value is not None and value != ""
    }
    expected = build_secure_hash(payload, secret)
    return expected == params.get("vnp_SecureHash", "")


def vnpay_timestamp(value: datetime) -> str:
    return value.strftime("%Y%m%d%H%M%S")
