CREATE TABLE IF NOT EXISTS interview_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    parent_answer_id UUID NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
    follow_up_style VARCHAR(20) NOT NULL DEFAULT 'clarify',
    question_text TEXT NOT NULL DEFAULT '',
    answer_text TEXT NOT NULL DEFAULT '',
    score NUMERIC(3,1) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 10),
    feedback TEXT NOT NULL DEFAULT '',
    telemetry_data JSONB,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interview_follow_ups_session_id
    ON interview_follow_ups(session_id);
