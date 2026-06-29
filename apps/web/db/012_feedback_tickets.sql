CREATE TABLE IF NOT EXISTS feedback_tickets (
  id UUID PRIMARY KEY,
  reporter_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bug', 'missing_feature', 'usability', 'accessibility', 'performance', 'content', 'suggestion', 'other')),
  surface TEXT NOT NULL CHECK (surface IN ('web', 'mobile')),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 10 AND 160),
  details TEXT NOT NULL CHECK (length(details) BETWEEN 20 AND 4000),
  current_path TEXT NOT NULL CHECK (length(current_path) BETWEEN 1 AND 200),
  expected_outcome TEXT CHECK (expected_outcome IS NULL OR length(expected_outcome) BETWEEN 1 AND 1000),
  actual_outcome TEXT CHECK (actual_outcome IS NULL OR length(actual_outcome) BETWEEN 1 AND 1000),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'blocker')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_tickets_reporter_created_idx
  ON feedback_tickets(reporter_user_id, created_at DESC);
