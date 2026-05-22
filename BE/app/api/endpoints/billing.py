from __future__ import annotations

import json
import random
import uuid
from datetime import datetime
from urllib.parse import urlencode

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.endpoints.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.schemas.billing import CheckoutRequest, CheckoutResponse, PaymentOrderOut, RedeemCodeRequest, RedeemCodeResponse, BuySessionsRequest
from app.schemas.user import UserOut
from app.services.email import send_payment_success_email
from app.services.payos import PayOSError, create_payment_link, verify_payment_webhook_signature, get_payment_link_information
from app.services.plans import (
    ACTIVE_STATUS,
    PURCHASABLE_PLAN_TIERS,
    activate_paid_plan,
    redeem_plan_code,
    resolve_plan_price,
    resolve_additional_session_price,
    utcnow,
)
from app.services.vnpay import build_payment_url, verify_response, vnpay_timestamp


router = APIRouter()


def _frontend_billing_redirect(**params: str) -> str:
    query = urlencode({key: value for key, value in params.items() if value})
    base_url = settings.frontend_upgrade_url
    if query:
        return f"{base_url}?{query}"
    return base_url


def _require_billing_user(current_user: UserOut) -> None:
    if current_user.is_billing_exempt or current_user.is_admin:
        raise HTTPException(status_code=400, detail="Tài khoản admin không sử dụng luồng thanh toán.")


def _require_vnpay_config() -> None:
    if not settings.vnpay_tmn_code or not settings.vnpay_hash_secret:
        raise HTTPException(
            status_code=503,
            detail="VNPay chưa được cấu hình trên máy chủ.",
        )


def _require_payos_config() -> None:
    if not settings.payos_client_id or not settings.payos_api_key or not settings.payos_checksum_key:
        raise HTTPException(
            status_code=503,
            detail="PayOS chưa được cấu hình trên máy chủ.",
        )


def _payment_success(params: dict[str, str]) -> bool:
    return params.get("vnp_ResponseCode") == "00" and params.get("vnp_TransactionStatus", "00") == "00"


def _payment_ip_from_request(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


async def _load_payment_order(db: asyncpg.Connection, provider_order_ref: str):
    return await db.fetchrow(
        """
        SELECT
            p.id,
            p.user_id,
            u.email,
            p.provider,
            p.plan_tier,
            p.billing_period,
            p.amount_vnd,
            p.status,
            p.provider_order_ref,
            p.provider_transaction_no,
            p.provider_response_code,
            p.payment_url,
            p.paid_at,
            p.created_at
        FROM payment_orders p
        JOIN users u ON u.id = p.user_id
        WHERE p.provider_order_ref = $1
        """,
        provider_order_ref,
    )


async def _mark_payment_result(
    db: asyncpg.Connection,
    *,
    provider_order_ref: str,
    status: str,
    provider_transaction_no: str | None,
    provider_response_code: str | None,
    raw_payload: dict[str, str],
) -> asyncpg.Record | None:
    existing = await _load_payment_order(db, provider_order_ref)
    if existing is None:
        return None

    if existing["status"] == "pending":
        updated = await db.fetchrow(
            """
            UPDATE payment_orders
            SET status = $1::varchar(20),
                provider_transaction_no = COALESCE($2::varchar(64), provider_transaction_no),
                provider_response_code = $3::varchar(10),
                raw_payload = $4::jsonb,
                paid_at = CASE WHEN $1::varchar(20) = 'succeeded' THEN NOW() ELSE paid_at END,
                updated_at = NOW()
            WHERE provider_order_ref = $5::varchar(64)
            RETURNING
                id,
                user_id,
                (SELECT email FROM users WHERE users.id = payment_orders.user_id) AS email,
                provider,
                plan_tier,
                billing_period,
                amount_vnd,
                status,
                provider_order_ref,
                provider_transaction_no,
                provider_response_code,
                payment_url,
                paid_at,
                created_at
            """,
            status,
            provider_transaction_no,
            provider_response_code,
            json.dumps(raw_payload),
            provider_order_ref,
        )
        if updated and status == "succeeded":
            if updated["plan_tier"] == "additional_sessions":
                try:
                    quantity = int(updated["billing_period"])
                except (ValueError, TypeError):
                    quantity = 1
                await db.execute(
                    """
                    UPDATE users
                    SET additional_sessions = additional_sessions + $1,
                        updated_at = NOW()
                    WHERE id = $2
                    """,
                    quantity,
                    updated["user_id"],
                )
            else:
                await activate_paid_plan(
                    db,
                    user_id=updated["user_id"],
                    plan_tier=updated["plan_tier"],
                    billing_period=updated["billing_period"],
                    activated_at=updated["paid_at"] or utcnow(),
                )
        return updated

    return existing


def _new_payos_order_code(created_at: datetime) -> int:
    return int(f"{int(created_at.timestamp() * 1000)}{random.randint(100, 999)}")


class PayOSWebhookError(ValueError):
    pass


@router.get("/orders", response_model=list[PaymentOrderOut])
async def list_payment_orders(
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    rows = await db.fetch(
        """
        SELECT
            id,
            user_id,
            provider,
            plan_tier,
            billing_period,
            amount_vnd,
            status,
            provider_order_ref,
            provider_transaction_no,
            provider_response_code,
            payment_url,
            paid_at,
            created_at
        FROM payment_orders
        WHERE user_id = $1
        ORDER BY created_at DESC
        """,
        current_user.id,
    )
    return [PaymentOrderOut(**dict(row)) for row in rows]


@router.post("/vnpay/checkout", response_model=CheckoutResponse)
async def create_vnpay_checkout(
    payload: CheckoutRequest,
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _require_billing_user(current_user)
    _require_vnpay_config()

    if payload.plan_tier not in PURCHASABLE_PLAN_TIERS:
        raise HTTPException(status_code=400, detail="Gói thanh toán không hợp lệ.")

    try:
        amount_vnd = resolve_plan_price(payload.plan_tier, payload.billing_period)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Chu kỳ thanh toán không hợp lệ.") from exc

    created_at = utcnow()
    provider_order_ref = f"INV{created_at.strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"
    order_info = f"Invera {payload.plan_tier} {payload.billing_period} {current_user.email}"

    params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": settings.vnpay_tmn_code,
        "vnp_Amount": amount_vnd * 100,
        "vnp_CreateDate": vnpay_timestamp(created_at),
        "vnp_CurrCode": "VND",
        "vnp_IpAddr": _payment_ip_from_request(request),
        "vnp_Locale": settings.vnpay_locale,
        "vnp_OrderInfo": order_info,
        "vnp_OrderType": "other",
        "vnp_ReturnUrl": settings.vnpay_return_url,
        "vnp_TxnRef": provider_order_ref,
    }
    payment_url = build_payment_url(settings.vnpay_payment_url, params, settings.vnpay_hash_secret)

    order = await db.fetchrow(
        """
        INSERT INTO payment_orders (
            user_id,
            provider,
            plan_tier,
            billing_period,
            amount_vnd,
            status,
            provider_order_ref,
            payment_url,
            raw_payload
        )
        VALUES ($1, 'vnpay', $2, $3, $4, 'pending', $5, $6, $7::jsonb)
        RETURNING
            id,
            user_id,
            provider,
            plan_tier,
            billing_period,
            amount_vnd,
            status,
            provider_order_ref,
            provider_transaction_no,
            provider_response_code,
            payment_url,
            paid_at,
            created_at
        """,
        current_user.id,
        payload.plan_tier,
        payload.billing_period,
        amount_vnd,
        provider_order_ref,
        payment_url,
        json.dumps(params),
    )

    return CheckoutResponse(
        payment_url=payment_url,
        order=PaymentOrderOut(**dict(order)),
    )


@router.post("/payos/checkout", response_model=CheckoutResponse)
async def create_payos_checkout(
    payload: CheckoutRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _require_billing_user(current_user)
    _require_payos_config()

    if payload.plan_tier not in PURCHASABLE_PLAN_TIERS:
        raise HTTPException(status_code=400, detail="Gói thanh toán không hợp lệ.")

    try:
        amount_vnd = resolve_plan_price(payload.plan_tier, payload.billing_period)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Chu kỳ thanh toán không hợp lệ.") from exc

    created_at = utcnow()
    order_code = _new_payos_order_code(created_at)
    provider_order_ref = str(order_code)
    plan_label = payload.plan_tier.upper()
    period_label = "THANG" if payload.billing_period == "month" else "NAM"
    description = f"INV{provider_order_ref[-6:]}"

    try:
        payment_data = await create_payment_link(
            api_base_url=settings.payos_api_base_url,
            client_id=settings.payos_client_id or "",
            api_key=settings.payos_api_key or "",
            checksum_key=settings.payos_checksum_key or "",
            order_code=order_code,
            amount=amount_vnd,
            description=description,
            return_url=settings.payos_return_url,
            cancel_url=settings.payos_cancel_url,
            buyer_email=current_user.email,
            buyer_name=current_user.full_name,
        )
    except PayOSError as exc:
        raise HTTPException(status_code=502, detail=f"Không thể tạo link thanh toán PayOS: {exc}") from exc

    payment_url = str(payment_data["checkoutUrl"])
    raw_payload = {
        "orderCode": order_code,
        "amount": amount_vnd,
        "description": description,
        "plan": plan_label,
        "billingPeriod": period_label,
        "payos": payment_data,
    }

    order = await db.fetchrow(
        """
        INSERT INTO payment_orders (
            user_id,
            provider,
            plan_tier,
            billing_period,
            amount_vnd,
            status,
            provider_order_ref,
            payment_url,
            raw_payload
        )
        VALUES ($1, 'payos', $2, $3, $4, 'pending', $5, $6, $7::jsonb)
        RETURNING
            id,
            user_id,
            (SELECT email FROM users WHERE users.id = payment_orders.user_id) AS email,
            provider,
            plan_tier,
            billing_period,
            amount_vnd,
            status,
            provider_order_ref,
            provider_transaction_no,
            provider_response_code,
            payment_url,
            paid_at,
            created_at
        """,
        current_user.id,
        payload.plan_tier,
        payload.billing_period,
        amount_vnd,
        provider_order_ref,
        payment_url,
        json.dumps(raw_payload),
    )

    return CheckoutResponse(
        payment_url=payment_url,
        order=PaymentOrderOut(**dict(order)),
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_default_checkout(
    payload: CheckoutRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return await create_payos_checkout(payload, db, current_user)


@router.post("/buy-sessions/checkout", response_model=CheckoutResponse)
async def create_buy_sessions_checkout(
    payload: BuySessionsRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _require_billing_user(current_user)
    _require_payos_config()

    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Số lượng phiên mua thêm không hợp lệ.")

    # Get unit price per session based on the user's current plan
    unit_price = resolve_additional_session_price(current_user.plan_tier)
    amount_vnd = unit_price * payload.quantity

    created_at = utcnow()
    order_code = _new_payos_order_code(created_at)
    provider_order_ref = str(order_code)
    description = f"INV ADD {payload.quantity} SESS"

    try:
        payment_data = await create_payment_link(
            api_base_url=settings.payos_api_base_url,
            client_id=settings.payos_client_id or "",
            api_key=settings.payos_api_key or "",
            checksum_key=settings.payos_checksum_key or "",
            order_code=order_code,
            amount=amount_vnd,
            description=description,
            return_url=settings.payos_return_url,
            cancel_url=settings.payos_cancel_url,
            buyer_email=current_user.email,
            buyer_name=current_user.full_name,
        )
    except PayOSError as exc:
        raise HTTPException(status_code=502, detail=f"Không thể tạo link thanh toán PayOS: {exc}") from exc

    payment_url = str(payment_data["checkoutUrl"])
    raw_payload = {
        "orderCode": order_code,
        "amount": amount_vnd,
        "description": description,
        "plan": "ADDITIONAL_SESSIONS",
        "billingPeriod": str(payload.quantity),
        "payos": payment_data,
    }

    order = await db.fetchrow(
        """
        INSERT INTO payment_orders (
            user_id,
            provider,
            plan_tier,
            billing_period,
            amount_vnd,
            status,
            provider_order_ref,
            payment_url,
            raw_payload
        )
        VALUES ($1, 'payos', 'additional_sessions', $2, $3, 'pending', $4, $5, $6::jsonb)
        RETURNING
            id,
            user_id,
            (SELECT email FROM users WHERE users.id = payment_orders.user_id) AS email,
            provider,
            plan_tier,
            billing_period,
            amount_vnd,
            status,
            provider_order_ref,
            provider_transaction_no,
            provider_response_code,
            payment_url,
            paid_at,
            created_at
        """,
        current_user.id,
        str(payload.quantity),
        amount_vnd,
        provider_order_ref,
        payment_url,
        json.dumps(raw_payload),
    )

    return CheckoutResponse(
        payment_url=payment_url,
        order=PaymentOrderOut(**dict(order)),
    )


@router.post("/redeem", response_model=RedeemCodeResponse)
async def redeem_billing_code(
    payload: RedeemCodeRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _require_billing_user(current_user)

    try:
        snapshot = await redeem_plan_code(
            db,
            user_id=current_user.id,
            code=payload.code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Redeem code không hợp lệ.") from exc

    return RedeemCodeResponse(
        message="Redeem code applied successfully.",
        plan_tier=snapshot["plan_tier"],
        billing_period=snapshot["plan_billing_period"],
        plan_expires_at=snapshot["plan_expires_at"],
    )


@router.get("/vnpay/return")
async def vnpay_return(
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
):
    params = {key: value for key, value in request.query_params.items()}
    provider_order_ref = params.get("vnp_TxnRef", "")
    if not provider_order_ref:
        return RedirectResponse(_frontend_billing_redirect(payment="invalid"), status_code=302)

    if not settings.vnpay_hash_secret or not verify_response(params, settings.vnpay_hash_secret):
        return RedirectResponse(
            _frontend_billing_redirect(payment="invalid", ref=provider_order_ref),
            status_code=302,
        )

    success = _payment_success(params)
    order = await _mark_payment_result(
        db,
        provider_order_ref=provider_order_ref,
        status="succeeded" if success else "failed",
        provider_transaction_no=params.get("vnp_TransactionNo"),
        provider_response_code=params.get("vnp_ResponseCode"),
        raw_payload=params,
    )
    if order is None:
        return RedirectResponse(
            _frontend_billing_redirect(payment="unknown", ref=provider_order_ref),
            status_code=302,
        )

    return RedirectResponse(
        _frontend_billing_redirect(
            payment="success" if order["status"] == "succeeded" else "failed",
            ref=provider_order_ref,
            plan=order["plan_tier"],
        ),
        status_code=302,
    )


@router.get("/vnpay/ipn")
async def vnpay_ipn(
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
):
    params = {key: value for key, value in request.query_params.items()}
    provider_order_ref = params.get("vnp_TxnRef", "")

    if not provider_order_ref:
        return JSONResponse({"RspCode": "01", "Message": "Order not found"})
    if not settings.vnpay_hash_secret or not verify_response(params, settings.vnpay_hash_secret):
        return JSONResponse({"RspCode": "97", "Message": "Invalid checksum"})

    existing = await _load_payment_order(db, provider_order_ref)
    if existing is None:
        return JSONResponse({"RspCode": "01", "Message": "Order not found"})

    if existing["status"] != "pending":
        return JSONResponse({"RspCode": "02", "Message": "Order already confirmed"})

    await _mark_payment_result(
        db,
        provider_order_ref=provider_order_ref,
        status="succeeded" if _payment_success(params) else "failed",
        provider_transaction_no=params.get("vnp_TransactionNo"),
        provider_response_code=params.get("vnp_ResponseCode"),
        raw_payload=params,
    )
    return JSONResponse({"RspCode": "00", "Message": "Confirm Success"})


async def _handle_payos_webhook_payload(payload: dict, db: asyncpg.Connection) -> asyncpg.Record:
    data = payload.get("data")
    signature = payload.get("signature")
    if not isinstance(data, dict) or not isinstance(signature, str):
        raise PayOSWebhookError("Invalid PayOS webhook payload")

    if not settings.payos_checksum_key:
        raise PayOSWebhookError("PayOS checksum key is not configured")

    if not verify_payment_webhook_signature(data, signature, settings.payos_checksum_key):
        raise PayOSWebhookError("Invalid PayOS signature")

    order_code = data.get("orderCode")
    if order_code is None:
        raise PayOSWebhookError("PayOS webhook missing orderCode")

    provider_order_ref = str(order_code)
    existing = await _load_payment_order(db, provider_order_ref)
    if existing is None or existing["provider"] != "payos":
        raise PayOSWebhookError("PayOS order not found")

    webhook_amount = int(data.get("amount") or 0)
    if webhook_amount != int(existing["amount_vnd"]):
        raise PayOSWebhookError("PayOS amount mismatch")

    is_success = bool(payload.get("success")) and data.get("code") == "00"
    target_status = "succeeded" if is_success else "failed"

    if existing["status"] != "pending":
        return existing

    updated = await _mark_payment_result(
        db,
        provider_order_ref=provider_order_ref,
        status=target_status,
        provider_transaction_no=data.get("reference") or data.get("paymentLinkId"),
        provider_response_code=data.get("code"),
        raw_payload=payload,
    )
    if updated is None:
        raise PayOSWebhookError("PayOS order not found")

    if target_status == "succeeded":
        try:
            await send_payment_success_email(
                recipient=updated["email"],
                plan_tier=updated["plan_tier"],
                billing_period=updated["billing_period"],
                amount_vnd=updated["amount_vnd"],
                order_ref=updated["provider_order_ref"],
            )
        except Exception as exc:
            # Payment activation is already committed. Email failures must not
            # make PayOS retry and risk duplicate side effects.
            import logging

            logging.getLogger(__name__).warning("Payment success email failed: %s", exc)

    return updated


@router.post("/payos/webhook")
async def payos_webhook(
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
):
    try:
        payload = await request.json()
        if not isinstance(payload, dict):
            raise PayOSWebhookError("Invalid PayOS webhook payload")
        await _handle_payos_webhook_payload(payload, db)
    except PayOSWebhookError as exc:
        return JSONResponse({"success": False, "message": str(exc)}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"success": False, "message": "Invalid JSON payload"}, status_code=400)

    return JSONResponse({"success": True})


@router.get("/payos/return")
async def payos_return(
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
):
    params = {key: value for key, value in request.query_params.items()}
    order_code_str = params.get("orderCode") or params.get("id") or ""
    if not order_code_str:
        return RedirectResponse(_frontend_billing_redirect(payment="invalid"), status_code=302)

    existing = await _load_payment_order(db, order_code_str)
    if existing is None:
        return RedirectResponse(
            _frontend_billing_redirect(payment="unknown", ref=order_code_str),
            status_code=302,
        )

    if existing["status"] == "pending":
        try:
            payment_info = await get_payment_link_information(
                api_base_url=settings.payos_api_base_url,
                client_id=settings.payos_client_id or "",
                api_key=settings.payos_api_key or "",
                order_id_or_code=order_code_str,
            )
            payos_status = payment_info.get("status")
            if payos_status == "PAID":
                updated = await _mark_payment_result(
                    db,
                    provider_order_ref=order_code_str,
                    status="succeeded",
                    provider_transaction_no=payment_info.get("id") or (payment_info.get("transactions") and payment_info["transactions"][0].get("reference")) or None,
                    provider_response_code="00",
                    raw_payload=payment_info,
                )
                if updated:
                    try:
                        await send_payment_success_email(
                            recipient=updated["email"],
                            plan_tier=updated["plan_tier"],
                            billing_period=updated["billing_period"],
                            amount_vnd=updated["amount_vnd"],
                            order_ref=updated["provider_order_ref"],
                        )
                    except Exception as exc:
                        import logging
                        logging.getLogger(__name__).warning("Payment success email failed in return fallback: %s", exc)
                    existing = updated
            elif payos_status in ("CANCELLED", "EXPIRED"):
                updated = await _mark_payment_result(
                    db,
                    provider_order_ref=order_code_str,
                    status="failed",
                    provider_transaction_no=None,
                    provider_response_code="01",
                    raw_payload=payment_info,
                )
                if updated:
                    existing = updated
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("Failed to fetch PayOS status in return fallback: %s", exc)

    return RedirectResponse(
        _frontend_billing_redirect(
            payment="success" if existing["status"] == "succeeded" else "failed",
            ref=order_code_str,
            plan=existing["plan_tier"],
        ),
        status_code=302,
    )


@router.get("/payos/cancel")
async def payos_cancel(
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
):
    params = {key: value for key, value in request.query_params.items()}
    order_code_str = params.get("orderCode") or params.get("id") or ""
    if order_code_str:
        existing = await _load_payment_order(db, order_code_str)
        if existing and existing["status"] == "pending":
            await _mark_payment_result(
                db,
                provider_order_ref=order_code_str,
                status="failed",
                provider_transaction_no=None,
                provider_response_code="01",
                raw_payload=params,
            )
    return RedirectResponse(
        _frontend_billing_redirect(
            payment="failed",
            ref=order_code_str,
        ),
        status_code=302,
    )
