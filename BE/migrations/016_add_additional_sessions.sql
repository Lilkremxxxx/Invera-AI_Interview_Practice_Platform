-- Migration 016: Add additional_sessions column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS additional_sessions INTEGER NOT NULL DEFAULT 0;
