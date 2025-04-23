-- Create career_coach table
CREATE TABLE IF NOT EXISTS career_coach (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT DEFAULT 'AI Career Coach',
    focus TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE(user_id)
);

-- Create coach_messages table
CREATE TABLE IF NOT EXISTS coach_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    is_user_message INTEGER NOT NULL DEFAULT 0,
    message_content TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES career_coach(user_id)
);

-- Create index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_coach_messages_user_id ON coach_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_messages_created_at ON coach_messages(created_at); 