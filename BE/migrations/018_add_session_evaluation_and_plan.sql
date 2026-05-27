-- Add evaluation_report and practice_plan columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS evaluation_report TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS practice_plan TEXT;
