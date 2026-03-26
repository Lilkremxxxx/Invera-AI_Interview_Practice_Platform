ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sessions_time_limit_minutes_check'
    ) THEN
        ALTER TABLE sessions
            ADD CONSTRAINT sessions_time_limit_minutes_check
            CHECK (time_limit_minutes IS NULL OR time_limit_minutes IN (5, 7, 10));
    END IF;
END $$;
