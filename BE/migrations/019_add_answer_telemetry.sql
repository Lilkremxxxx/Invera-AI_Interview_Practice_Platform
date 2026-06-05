-- Migration to add telemetry_data column to answers table
ALTER TABLE answers ADD COLUMN IF NOT EXISTS telemetry_data JSONB;
