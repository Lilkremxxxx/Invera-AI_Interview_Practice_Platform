-- Migration 020: Add index on sessions(created_at) for stats optimization
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
