from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel


PlanTier = Literal["free_trial", "basic", "pro"]
BillingPeriod = Literal["month", "year"]


class CheckoutRequest(BaseModel):
    plan_tier: Literal["basic", "pro"]
    billing_period: BillingPeriod


class PaymentOrderOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    provider: str
    plan_tier: Literal["basic", "pro"]
    billing_period: BillingPeriod
    amount_vnd: int
    status: str
    provider_order_ref: str
    provider_transaction_no: Optional[str] = None
    provider_response_code: Optional[str] = None
    payment_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime


class CheckoutResponse(BaseModel):
    payment_url: str
    order: PaymentOrderOut
