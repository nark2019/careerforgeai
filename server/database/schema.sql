CREATE TABLE IF NOT EXISTS quiz_results (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    career TEXT NOT NULL,
    experience TEXT NOT NULL,
    score INTEGER,
    report_id TEXT,
    timestamp TEXT NOT NULL,
    recommendations TEXT,
    answers TEXT,
    questions TEXT
);

CREATE TABLE IF NOT EXISTS current_results (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    career TEXT NOT NULL,
    experience TEXT NOT NULL,
    score INTEGER,
    report_id TEXT,
    timestamp TEXT NOT NULL,
    recommendations TEXT,
    answers TEXT,
    questions TEXT
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_timestamp ON quiz_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_current_results_user_id ON current_results(user_id); 