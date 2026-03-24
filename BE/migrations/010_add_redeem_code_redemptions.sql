CREATE TABLE IF NOT EXISTS redeem_code_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redeem_code VARCHAR(64) NOT NULL,
    plan_tier VARCHAR(20) NOT NULL,
    billing_period VARCHAR(10) NOT NULL DEFAULT 'month',
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redeem_code_redemptions_user_id
    ON redeem_code_redemptions(user_id);

CREATE INDEX IF NOT EXISTS idx_redeem_code_redemptions_code
    ON redeem_code_redemptions(redeem_code);
