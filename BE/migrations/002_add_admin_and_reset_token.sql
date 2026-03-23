-- Migration 002: Add is_admin, reset token, OAuth provider fields
-- Run: psql -d <db> -f migrations/002_add_admin_and_reset_token.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- Index for provider lookups (OAuth)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_id
    ON users(provider, provider_id)
    WHERE provider != 'local';
