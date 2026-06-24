CREATE TABLE IF NOT EXISTS redeem_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code UUID NOT NULL UNIQUE,
    plan_tier VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ NULL,
    redeemed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_by_admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_redeem_codes_plan_tier CHECK (plan_tier IN ('basic', 'pro', 'premium'))
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_plan_tier
    ON redeem_codes(plan_tier);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_expires_at
    ON redeem_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_redeemed_at
    ON redeem_codes(redeemed_at);
