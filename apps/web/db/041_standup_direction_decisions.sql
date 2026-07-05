-- Daily standup direction decisions (owner request 2026-07-05).
--
-- Every morning the standup agent publishes a report + proposed directions as a
-- static JSON in the repo (apps/web/public/standup/latest.json) — the report
-- itself needs no DB and no secrets. This table stores only the OWNER'S CALLS
-- on those directions, made on /hq.html: approve/deny plus an optional comment.
-- The CEO loop reads them back (secret-guarded GET) and acts. Internal ops
-- signal only — no member PII lives here.
CREATE TABLE IF NOT EXISTS standup_direction_decisions (
  direction_id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('approve', 'deny')),
  comment TEXT,
  decided_by TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The CEO loop asks "what has the owner decided lately?" — index recency.
CREATE INDEX IF NOT EXISTS standup_direction_decisions_recent_idx
  ON standup_direction_decisions(decided_at DESC);
