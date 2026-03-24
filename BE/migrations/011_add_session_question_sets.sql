ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS major VARCHAR(50);

UPDATE sessions
SET major = CASE
    WHEN role IN ('financial_analyst', 'accountant', 'auditor', 'investment_banking_analyst') THEN 'finance'
    WHEN role IN ('business_analyst', 'operations_analyst', 'sales_executive', 'marketing_executive') THEN 'business'
    ELSE 'technology'
END
WHERE major IS NULL OR BTRIM(major) = '';

ALTER TABLE sessions
    ALTER COLUMN major SET DEFAULT 'technology';

CREATE TABLE IF NOT EXISTS session_question_sets (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_id, question_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_question_sets_position
    ON session_question_sets(session_id, position);

INSERT INTO session_question_sets (session_id, question_id, position)
SELECT
    a.session_id,
    a.question_id,
    ROW_NUMBER() OVER (PARTITION BY a.session_id ORDER BY a.submitted_at, a.question_id) AS position
FROM answers a
LEFT JOIN session_question_sets sq
    ON sq.session_id = a.session_id
   AND sq.question_id = a.question_id
WHERE sq.session_id IS NULL;
