CREATE TABLE IF NOT EXISTS qna_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Invera QnA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qna_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES qna_threads(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL DEFAULT '',
    structured_payload JSONB,
    selected_text TEXT,
    attachment_name TEXT,
    attachment_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qna_threads_user_id ON qna_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_qna_messages_thread_id_created_at ON qna_messages(thread_id, created_at);
