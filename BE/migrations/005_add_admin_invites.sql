-- Migration 005: Add invite-based admin activation support

CREATE TABLE IF NOT EXISTS admin_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_invites_status ON admin_invites(status);

UPDATE users
SET is_admin = TRUE
WHERE LOWER(email) = 'nhatbang6688@gmail.com';
