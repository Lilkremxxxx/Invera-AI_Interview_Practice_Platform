import os
import sys
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.api.endpoints.billing as billing_module
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.billing import router as billing_router
from app.db.session import get_db
from app.schemas.user import UserOut


class FakeDb:
    def __init__(self):
        self.insert_calls = []

    async def fetchrow(self, query, *params):
        if "INSERT INTO payment_orders" in query:
            self.insert_calls.append((query, params))
            return {
                "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
                "user_id": params[0],
                "email": "buyer@example.com",
                "provider": "payos",
                "plan_tier": params[1],
                "billing_period": params[2],
                "amount_vnd": params[3],
                "status": "pending",
                "provider_order_ref": params[4],
                "provider_transaction_no": None,
                "provider_response_code": None,
                "payment_url": params[5],
                "paid_at": None,
                "created_at": datetime(2026, 6, 21, tzinfo=timezone.utc),
            }
        return None


def _build_user() -> UserOut:
    return UserOut(
        id=uuid.UUID("44444444-4444-4444-4444-444444444444"),
        email="buyer@example.com",
        created_at=datetime(2026, 5, 5, tzinfo=timezone.utc),
        full_name="Buyer",
        is_admin=False,
        is_billing_exempt=False,
        plan_tier="free_trial",
    )


def test_create_payos_checkout_creates_order_and_returns_payment_url(monkeypatch):
    app = FastAPI()
    app.include_router(billing_router, prefix="/api/billing")

    fake_db = FakeDb()

    async def override_db():
        yield fake_db

    async def fake_payment_link(**kwargs):
        return {"checkoutUrl": "https://pay.example.test/checkout/123"}

    monkeypatch.setattr(
        billing_module,
        "settings",
        SimpleNamespace(
            payos_client_id="client-id",
            payos_api_key="api-key",
            payos_checksum_key="checksum-key",
            payos_api_base_url="https://payos.example.test",
            payos_return_url="https://example.test/billing/return",
            payos_cancel_url="https://example.test/billing/cancel",
            frontend_upgrade_url="https://example.test/app/upgrade",
        ),
    )
    monkeypatch.setattr(billing_module, "_new_payos_order_code", lambda created_at: 123456789012)
    monkeypatch.setattr(billing_module, "resolve_plan_price", lambda plan_tier, billing_period: 99000)
    monkeypatch.setattr(billing_module, "create_payment_link", fake_payment_link)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _build_user

    client = TestClient(app)
    response = client.post(
        "/api/billing/payos/checkout",
        json={"plan_tier": "basic", "billing_period": "month"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["payment_url"] == "https://pay.example.test/checkout/123"
    assert payload["order"]["provider_order_ref"] == "123456789012"
    assert fake_db.insert_calls
    insert_query, insert_params = fake_db.insert_calls[0]
    assert "INSERT INTO payment_orders" in insert_query
    assert insert_params[3] == 99000
    assert insert_params[4] == "123456789012"
    assert insert_params[5] == "https://pay.example.test/checkout/123"
