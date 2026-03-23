-- Migration 006: Add persistent plan fields and VNPay-backed payment orders

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) NOT NULL DEFAULT 'free_trial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_billing_period VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

UPDATE users
SET plan_tier = 'free_trial',
    plan_status = 'active',
    plan_billing_period = NULL,
    plan_started_at = NULL,
    plan_expires_at = NULL
WHERE is_admin = FALSE;

UPDATE users
SET plan_status = 'active'
WHERE is_admin = TRUE;

CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL DEFAULT 'vnpay',
    plan_tier VARCHAR(20) NOT NULL,
    billing_period VARCHAR(10) NOT NULL,
    amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider_order_ref VARCHAR(64) NOT NULL UNIQUE,
    provider_transaction_no VARCHAR(64),
    provider_response_code VARCHAR(10),
    payment_url TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
