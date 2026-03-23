-- Migration 003: add email verification code fields and grandfather current local users

ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_verification_code
    ON users(verification_code)
    WHERE verification_code IS NOT NULL;

-- Existing local users predate the verification flow. Mark them verified once to avoid lockout.
UPDATE users
SET email_verified = TRUE
WHERE provider = 'local' AND email_verified = FALSE;
