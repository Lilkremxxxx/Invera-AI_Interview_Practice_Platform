-- Migration 017: Add resume_text to users and user_id to questions
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_text TEXT;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
