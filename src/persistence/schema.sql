-- SI Systems Conversation History Database Schema
-- SQLite database for persistent conversation storage and drift tracking

-- Sessions table: Top-level conversation sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time INTEGER NOT NULL, -- Unix timestamp in ms
  end_time INTEGER, -- NULL if session is ongoing
  total_exchanges INTEGER DEFAULT 0,
  average_drift REAL, -- Calculated from drift scores
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'ended', 'archived')),
  -- Identity profile snapshot at session start (JSON)
  identity_snapshot TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Exchanges table: Individual prompt/response pairs within sessions
CREATE TABLE IF NOT EXISTS exchanges (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  exchange_index INTEGER NOT NULL, -- Order within session (0-based)
  timestamp INTEGER NOT NULL, -- Unix timestamp in ms
  -- Message content
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  -- Metadata
  session_duration INTEGER, -- Session duration at this point (minutes)
  interaction_count INTEGER, -- Number of interactions before this one
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE (session_id, exchange_index)
);

-- Drift scores table: Detailed drift analysis per exchange
CREATE TABLE IF NOT EXISTS drift_scores (
  id TEXT PRIMARY KEY,
  exchange_id TEXT NOT NULL,
  session_id TEXT NOT NULL, -- Denormalized for faster queries
  timestamp INTEGER NOT NULL, -- Unix timestamp in ms
  -- Overall drift score
  overall_score REAL NOT NULL CHECK(overall_score >= 0 AND overall_score <= 1),
  -- Dimensional scores
  tone_alignment REAL NOT NULL CHECK(tone_alignment >= 0 AND tone_alignment <= 1),
  value_alignment REAL NOT NULL CHECK(value_alignment >= 0 AND value_alignment <= 1),
  rhythm_alignment REAL NOT NULL CHECK(rhythm_alignment >= 0 AND rhythm_alignment <= 1),
  context_alignment REAL NOT NULL CHECK(context_alignment >= 0 AND context_alignment <= 1),
  -- Flags (JSON array of strings)
  flags TEXT NOT NULL DEFAULT '[]',
  -- Recommendation
  recommendation TEXT NOT NULL CHECK(recommendation IN ('continue', 'review', 'recalibrate')),
  -- Confidence score
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_start ON sessions(user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_exchanges_session_id ON exchanges(session_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_timestamp ON exchanges(timestamp);
CREATE INDEX IF NOT EXISTS idx_exchanges_session_index ON exchanges(session_id, exchange_index);

CREATE INDEX IF NOT EXISTS idx_drift_scores_exchange_id ON drift_scores(exchange_id);
CREATE INDEX IF NOT EXISTS idx_drift_scores_session_id ON drift_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_drift_scores_timestamp ON drift_scores(timestamp);
CREATE INDEX IF NOT EXISTS idx_drift_scores_overall ON drift_scores(overall_score);
CREATE INDEX IF NOT EXISTS idx_drift_scores_session_timestamp ON drift_scores(session_id, timestamp);

-- Triggers for maintaining data consistency

-- Update sessions.updated_at on any change
CREATE TRIGGER IF NOT EXISTS update_session_timestamp
AFTER UPDATE ON sessions
FOR EACH ROW
BEGIN
  UPDATE sessions SET updated_at = strftime('%s', 'now') * 1000 WHERE id = NEW.id;
END;

-- Update sessions.total_exchanges when exchanges are added
CREATE TRIGGER IF NOT EXISTS increment_exchange_count
AFTER INSERT ON exchanges
FOR EACH ROW
BEGIN
  UPDATE sessions
  SET total_exchanges = total_exchanges + 1,
      updated_at = strftime('%s', 'now') * 1000
  WHERE id = NEW.session_id;
END;

-- Update sessions.average_drift when drift scores are added
CREATE TRIGGER IF NOT EXISTS update_average_drift
AFTER INSERT ON drift_scores
FOR EACH ROW
BEGIN
  UPDATE sessions
  SET average_drift = (
    SELECT AVG(overall_score)
    FROM drift_scores
    WHERE session_id = NEW.session_id
  ),
  updated_at = strftime('%s', 'now') * 1000
  WHERE id = NEW.session_id;
END;

-- Views for common queries

-- Session summary view with drift statistics
CREATE VIEW IF NOT EXISTS session_summary AS
SELECT
  s.id,
  s.user_id,
  s.start_time,
  s.end_time,
  s.total_exchanges,
  s.average_drift,
  s.status,
  MIN(ds.overall_score) as min_drift,
  MAX(ds.overall_score) as max_drift,
  -- Calculate drift trend (positive = improving, negative = worsening)
  CASE
    WHEN COUNT(ds.id) > 1 THEN
      (SELECT ds1.overall_score FROM drift_scores ds1 WHERE ds1.session_id = s.id ORDER BY ds1.timestamp DESC LIMIT 1) -
      (SELECT ds2.overall_score FROM drift_scores ds2 WHERE ds2.session_id = s.id ORDER BY ds2.timestamp ASC LIMIT 1)
    ELSE NULL
  END as drift_trend,
  COUNT(DISTINCT ds.id) as drift_measurements
FROM sessions s
LEFT JOIN drift_scores ds ON ds.session_id = s.id
GROUP BY s.id;

-- Recent exchanges view for quick access
CREATE VIEW IF NOT EXISTS recent_exchanges AS
SELECT
  e.id,
  e.session_id,
  e.exchange_index,
  e.timestamp,
  e.user_message,
  e.ai_response,
  ds.overall_score as drift_score,
  ds.recommendation,
  s.user_id
FROM exchanges e
LEFT JOIN drift_scores ds ON ds.exchange_id = e.id
LEFT JOIN sessions s ON s.id = e.session_id
ORDER BY e.timestamp DESC
LIMIT 100;

-- Drift trend analysis view
CREATE VIEW IF NOT EXISTS drift_trends AS
SELECT
  session_id,
  DATE(timestamp / 1000, 'unixepoch') as date,
  AVG(overall_score) as avg_drift,
  MIN(overall_score) as min_drift,
  MAX(overall_score) as max_drift,
  COUNT(*) as measurements,
  AVG(tone_alignment) as avg_tone_alignment,
  AVG(value_alignment) as avg_value_alignment,
  AVG(rhythm_alignment) as avg_rhythm_alignment,
  AVG(context_alignment) as avg_context_alignment
FROM drift_scores
GROUP BY session_id, DATE(timestamp / 1000, 'unixepoch');
