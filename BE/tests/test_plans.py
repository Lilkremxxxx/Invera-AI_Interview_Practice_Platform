import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from services.plans import (
    ACTIVE_STATUS,
    BASIC_PLAN,
    EXPIRED_STATUS,
    FREE_TRIAL_PLAN,
    PRO_PLAN,
    TRIAL_EXHAUSTED_STATUS,
    compute_entitlement,
    resolve_plan_price,
    utcnow,
)


def test_free_trial_active_when_no_sessions():
    result = compute_entitlement(
        is_admin=False,
        plan_tier=FREE_TRIAL_PLAN,
        plan_status=ACTIVE_STATUS,
        plan_billing_period=None,
        plan_expires_at=None,
        sessions_used=0,
    )
    assert result["plan_status"] == ACTIVE_STATUS
    assert result["session_limit"] == 1
    assert result["can_start_new_session"] is True


def test_free_trial_exhausted_after_first_session():
    result = compute_entitlement(
        is_admin=False,
        plan_tier=FREE_TRIAL_PLAN,
        plan_status=ACTIVE_STATUS,
        plan_billing_period=None,
        plan_expires_at=None,
        sessions_used=1,
    )
    assert result["plan_status"] == TRIAL_EXHAUSTED_STATUS
    assert result["can_start_new_session"] is False


def test_active_paid_plan_is_unlimited_during_term():
    result = compute_entitlement(
        is_admin=False,
        plan_tier=BASIC_PLAN,
        plan_status=ACTIVE_STATUS,
        plan_billing_period='month',
        plan_expires_at=utcnow() + timedelta(days=5),
        sessions_used=9,
    )
    assert result["plan_status"] == ACTIVE_STATUS
    assert result["session_limit"] is None
    assert result["can_start_new_session"] is True


def test_expired_paid_plan_falls_back_to_trial_entitlement():
    result = compute_entitlement(
        is_admin=False,
        plan_tier=PRO_PLAN,
        plan_status=ACTIVE_STATUS,
        plan_billing_period='year',
        plan_expires_at=utcnow() - timedelta(seconds=1),
        sessions_used=1,
    )
    assert result["plan_status"] == EXPIRED_STATUS
    assert result["session_limit"] == 1
    assert result["can_start_new_session"] is False


def test_admin_is_billing_exempt_and_unlimited():
    result = compute_entitlement(
        is_admin=True,
        plan_tier=FREE_TRIAL_PLAN,
        plan_status=TRIAL_EXHAUSTED_STATUS,
        plan_billing_period=None,
        plan_expires_at=None,
        sessions_used=99,
    )
    assert result["is_billing_exempt"] is True
    assert result["can_start_new_session"] is True
    assert result["session_limit"] is None


def test_resolve_plan_price_matches_expected_catalog():
    assert resolve_plan_price(BASIC_PLAN, 'month') == 99_000
    assert resolve_plan_price(PRO_PLAN, 'year') == 1_799_000
