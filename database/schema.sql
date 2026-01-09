-- Email Drafts Table
CREATE TABLE IF NOT EXISTS email_drafts (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    "to" TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_email_drafts_session ON email_drafts(session_id);
CREATE INDEX idx_email_drafts_created ON email_drafts(created_at DESC);

-- OAuth Tokens Table (for future Gmail integration)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memories Table (for future conversation memory)
CREATE TABLE IF NOT EXISTS memories (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    memory_type TEXT NOT NULL, -- 'fact', 'preference', 'context'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    relevance_score FLOAT DEFAULT 1.0
);

CREATE INDEX idx_memories_session ON memories(session_id);
CREATE INDEX idx_memories_type ON memories(memory_type);

-- Tool Execution Log (for analytics)
CREATE TABLE IF NOT EXISTS tool_executions (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    arguments JSONB,
    result JSONB,
    success BOOLEAN,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tool_executions_session ON tool_executions(session_id);
CREATE INDEX idx_tool_executions_tool ON tool_executions(tool_name);
CREATE INDEX idx_tool_executions_created ON tool_executions(created_at DESC);