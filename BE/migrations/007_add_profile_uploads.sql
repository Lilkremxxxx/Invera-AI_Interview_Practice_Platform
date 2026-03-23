-- Migration 007: add avatar and resume metadata to users

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_filename TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_size_bytes BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_content_type TEXT;
