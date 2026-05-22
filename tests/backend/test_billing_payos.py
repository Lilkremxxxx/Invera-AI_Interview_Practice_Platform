import os
import sys
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))


USER_ID = UUID("11111111-1111-1111-1111-111111111111")
ORDER_ID = UUID("22222222-2222-2222-2222-222222222222")


class FakeBillingDb:
    def __init__(self, order):
        self.order = order
        self.activated = []
        self.executed = []
        self.user_plan_started_at = None
        self.user_plan_expires_at = None

    async def fetchrow(self, query, *args):
        if "FROM payment_orders" in query:
            order_ref = str(args[0])
            if str(self.order["provider_order_ref"]) != order_ref:
                return None
            return self.order

        if "UPDATE payment_orders" in query:
            status, transaction_no, response_code, raw_payload, order_ref = args
            if str(self.order["provider_order_ref"]) != str(order_ref):
                return None
            self.order = {
                **self.order,
                "status": status,
                "provider_transaction_no": transaction_no or self.order.get("provider_transaction_no"),
                "provider_response_code": response_code,
                "raw_payload": raw_payload,
                "paid_at": datetime(2026, 5, 22, tzinfo=timezone.utc) if status == "succeeded" else None,
            }
            return self.order

        if "FROM users" in query:
            return {
                "id": self.order["user_id"],
                "email": self.order["email"],
                "created_at": self.order["created_at"],
                "full_name": None,
                "is_admin": False,
                "email_verified": True,
                "plan_tier": self.order["plan_tier"],
                "plan_status": "active",
                "plan_billing_period": self.order["billing_period"],
                "plan_started_at": self.user_plan_started_at,
                "plan_expires_at": self.user_plan_expires_at,
                "avatar_path": None,
                "resume_path": None,
                "resume_filename": None,
            }

        raise AssertionError(f"Unexpected fetchrow query: {query}")

    async def execute(self, query, *args):
        self.executed.append((query, args))
        if "UPDATE users" in query and len(args) == 6:
            self.user_plan_started_at = args[3]
            self.user_plan_expires_at = args[4]
            self.activated.append(
                {
                    "plan_tier": args[0],
                    "plan_status": args[1],
                    "billing_period": args[2],
                    "user_id": args[5],
                }
            )
        return "UPDATE 1"

    async def fetchval(self, query, *args):
        return 0


def make_order(status="pending", amount=99_000):
    return {
        "id": ORDER_ID,
        "user_id": USER_ID,
        "email": "buyer@example.com",
        "provider": "payos",
        "plan_tier": "basic",
        "billing_period": "month",
        "amount_vnd": amount,
        "status": status,
        "provider_order_ref": "123456789",
        "provider_transaction_no": None,
        "provider_response_code": None,
        "payment_url": "https://pay.payos.vn/web/123",
        "paid_at": None,
        "created_at": datetime(2026, 5, 22, tzinfo=timezone.utc),
    }


def make_webhook_payload(amount=99_000, signature="valid"):
    return {
        "code": "00",
        "desc": "success",
        "success": True,
        "data": {
            "orderCode": 123456789,
            "amount": amount,
            "description": "INV123456789",
            "reference": "TF230204212323",
            "transactionDateTime": "2026-05-22 12:00:00",
            "currency": "VND",
            "paymentLinkId": "link_123",
            "code": "00",
            "desc": "Thành công",
        },
        "signature": signature,
    }


@pytest.mark.asyncio
async def test_payos_webhook_activates_matching_pending_order(monkeypatch):
    from app.api.endpoints import billing

    db = FakeBillingDb(make_order())
    sent_emails = []

    async def fake_send_payment_success_email(**kwargs):
        sent_emails.append(kwargs)

    monkeypatch.setattr(billing, "settings", SimpleNamespace(payos_checksum_key="checksum"))
    monkeypatch.setattr(billing, "verify_payment_webhook_signature", lambda data, signature, key: True)
    monkeypatch.setattr(billing, "send_payment_success_email", fake_send_payment_success_email)

    result = await billing._handle_payos_webhook_payload(make_webhook_payload(), db)

    assert result["status"] == "succeeded"
    assert db.order["status"] == "succeeded"
    assert db.activated == [
        {
            "plan_tier": "basic",
            "plan_status": "active",
            "billing_period": "month",
            "user_id": USER_ID,
        }
    ]
    assert sent_emails[0]["recipient"] == "buyer@example.com"
    assert sent_emails[0]["plan_tier"] == "basic"


@pytest.mark.asyncio
async def test_payos_webhook_rejects_invalid_signature(monkeypatch):
    from app.api.endpoints import billing

    db = FakeBillingDb(make_order())
    monkeypatch.setattr(billing, "settings", SimpleNamespace(payos_checksum_key="checksum"))
    monkeypatch.setattr(billing, "verify_payment_webhook_signature", lambda data, signature, key: False)

    with pytest.raises(billing.PayOSWebhookError, match="Invalid PayOS signature"):
        await billing._handle_payos_webhook_payload(make_webhook_payload(signature="bad"), db)

    assert db.order["status"] == "pending"
    assert db.activated == []


@pytest.mark.asyncio
async def test_payos_webhook_rejects_amount_mismatch(monkeypatch):
    from app.api.endpoints import billing

    db = FakeBillingDb(make_order(amount=99_000))
    monkeypatch.setattr(billing, "settings", SimpleNamespace(payos_checksum_key="checksum"))
    monkeypatch.setattr(billing, "verify_payment_webhook_signature", lambda data, signature, key: True)

    with pytest.raises(billing.PayOSWebhookError, match="amount mismatch"):
        await billing._handle_payos_webhook_payload(make_webhook_payload(amount=199_000), db)

    assert db.order["status"] == "pending"
    assert db.activated == []


@pytest.mark.asyncio
async def test_payos_webhook_duplicate_success_is_idempotent(monkeypatch):
    from app.api.endpoints import billing

    db = FakeBillingDb(make_order(status="succeeded"))
    sent_emails = []

    async def fake_send_payment_success_email(**kwargs):
        sent_emails.append(kwargs)

    monkeypatch.setattr(billing, "settings", SimpleNamespace(payos_checksum_key="checksum"))
    monkeypatch.setattr(billing, "verify_payment_webhook_signature", lambda data, signature, key: True)
    monkeypatch.setattr(billing, "send_payment_success_email", fake_send_payment_success_email)

    result = await billing._handle_payos_webhook_payload(make_webhook_payload(), db)

    assert result["status"] == "succeeded"
    assert db.activated == []
    assert sent_emails == []


@pytest.mark.asyncio
async def test_payos_return_fallback_activates_order_when_paid(monkeypatch):
    from app.api.endpoints import billing

    db = FakeBillingDb(make_order())
    sent_emails = []

    async def fake_send_payment_success_email(**kwargs):
        sent_emails.append(kwargs)

    async def fake_get_payment_link_information(*args, **kwargs):
        return {
            "status": "PAID",
            "id": "payos_link_123",
            "amount": 99000,
        }

    monkeypatch.setattr(billing, "settings", SimpleNamespace(
        payos_checksum_key="checksum",
        payos_api_base_url="https://api.payos.vn",
        payos_client_id="client",
        payos_api_key="key",
        frontend_upgrade_url="https://invera.pp.ua/app/upgrade"
    ))
    monkeypatch.setattr(billing, "get_payment_link_information", fake_get_payment_link_information)
    monkeypatch.setattr(billing, "send_payment_success_email", fake_send_payment_success_email)

    class FakeRequest:
        def __init__(self):
            self.query_params = {"orderCode": "123456789"}

    response = await billing.payos_return(FakeRequest(), db)

    assert response.status_code == 302
    assert "payment=success" in response.headers["location"]
    assert "plan=basic" in response.headers["location"]
    assert db.order["status"] == "succeeded"
    assert len(sent_emails) == 1
    assert sent_emails[0]["recipient"] == "buyer@example.com"


@pytest.mark.asyncio
async def test_payos_cancel_marks_order_failed(monkeypatch):
    from app.api.endpoints import billing

    db = FakeBillingDb(make_order())

    monkeypatch.setattr(billing, "settings", SimpleNamespace(
        frontend_upgrade_url="https://invera.pp.ua/app/upgrade"
    ))

    class FakeRequest:
        def __init__(self):
            self.query_params = {"orderCode": "123456789"}

    response = await billing.payos_cancel(FakeRequest(), db)

    assert response.status_code == 302
    assert "payment=failed" in response.headers["location"]
    assert db.order["status"] == "failed"
