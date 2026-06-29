CREATE TABLE IF NOT EXISTS safety_reports (
  id UUID PRIMARY KEY,
  reporter_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'harassment', 'hate', 'sexual_misconduct', 'violence_threat', 'stalking',
    'scam', 'impersonation', 'suspected_underage', 'unsafe_event', 'no_show', 'other'
  )),
  details TEXT NOT NULL CHECK (length(details) BETWEEN 20 AND 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'investigating', 'actioned', 'dismissed')),
  priority TEXT NOT NULL CHECK (priority IN ('standard', 'urgent', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reported_user_id IS NOT NULL OR event_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS moderation_audit_log (
  id BIGSERIAL PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE RESTRICT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('member', 'system', 'moderator')),
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('report_created', 'subject_blocked', 'status_changed', 'note_added', 'evidence_preserved')),
  previous_status TEXT,
  next_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS safety_reports_queue_idx ON safety_reports(status, priority, created_at);
CREATE INDEX IF NOT EXISTS safety_reports_reporter_idx ON safety_reports(reporter_user_id, created_at);
CREATE INDEX IF NOT EXISTS moderation_audit_report_idx ON moderation_audit_log(report_id, created_at);

CREATE RULE moderation_audit_no_update AS ON UPDATE TO moderation_audit_log DO INSTEAD NOTHING;
CREATE RULE moderation_audit_no_delete AS ON DELETE TO moderation_audit_log DO INSTEAD NOTHING;

