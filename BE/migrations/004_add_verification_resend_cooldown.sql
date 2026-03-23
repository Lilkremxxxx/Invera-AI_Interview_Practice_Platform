-- Migration 004: track last verification code delivery time for resend cooldown

ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_sent_at TIMESTAMPTZ;
