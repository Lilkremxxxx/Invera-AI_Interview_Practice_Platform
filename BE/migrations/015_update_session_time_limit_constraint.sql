ALTER TABLE sessions
    DROP CONSTRAINT IF EXISTS sessions_time_limit_minutes_check;

ALTER TABLE sessions
    ADD CONSTRAINT sessions_time_limit_minutes_check
    CHECK (time_limit_minutes IS NULL OR (time_limit_minutes > 0 AND time_limit_minutes % 5 = 0))
    NOT VALID;
